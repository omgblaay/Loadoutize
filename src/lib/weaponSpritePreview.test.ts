import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  choosePreviewAsset,
  createPreviewBuild,
  getWeaponPreviewRef,
  normalizePreviewSlot,
  resolveCatalogAssetUrls,
  type SpriteAsset,
  type SpriteWeapon,
} from "./weaponSpritePreview";

afterEach(() => {
  vi.unstubAllGlobals();
});

const weapon: SpriteWeapon = {
  id: "rex_ar_mike4",
  family: "mike4",
  base_src: "base.png",
  assets: [],
  profile: { placements: { barrel: {} } },
};

const assets: SpriteAsset[] = [
  {
    id: "factory",
    slot: "barrel",
    src: "factory.png",
    families: ["mike4"],
    composable: true,
    factory_component: true,
  },
  {
    id: "family-barrel",
    slot: "barrel",
    src: "family.png",
    families: ["mike4"],
    composable: true,
  },
  {
    id: "shared-barrel",
    slot: "barrel",
    src: "shared.png",
    families: [],
    composable: true,
  },
];

describe("weapon sprite preview mapping", () => {
  it("keeps Striga underbarrels only on its Dreadline 80 barrel", () => {
    const catalog = JSON.parse(readFileSync("public/weapon-preview/weapon-builder/catalog.json", "utf8"));
    const striga = catalog.weapons.find((item: SpriteWeapon) => item.id === "rex_sm_pmike63") as SpriteWeapon;
    const underbarrel = { typeSlug: "underbarrel", label: "FSS FIRELINE GRIP", assetId: "rex_grip_ang" };
    const guard = { typeSlug: "guard", label: "guard", assetId: "rex_guard_pmike63" };
    expect(createPreviewBuild(striga, catalog.assets, [underbarrel, guard]).parts).not.toHaveProperty("underbarrel");
    const dreadline = { typeSlug: "barrel", label: "Ballistarc Dreadline 80", assetId: "rex_bar_hvy_pmike63" };
    const build = createPreviewBuild(striga, catalog.assets, [dreadline, underbarrel, guard]);
    expect(build.parts.underbarrel).toBe("rex_grip_ang");
    expect(build.parts.guard).toBeUndefined();
  });
  it("keeps WZ.55 Striga muzzles facing and mounted left", () => {
    const catalog = JSON.parse(readFileSync("public/weapon-preview/weapon-builder/catalog.json", "utf8"));
    const striga = catalog.weapons.find((item: SpriteWeapon) => item.id === "rex_sm_pmike63") as SpriteWeapon;
    const profile = striga.profile as typeof striga.profile & { muzzle_right?: boolean };
    const muzzle = profile.placements.muzzle as { point: number[]; anchor: number[] };
    const barrel = profile.placements.barrel as { point: number[] };
    expect(profile.muzzle_right).toBeUndefined();
    expect(muzzle.anchor[0]).toBeGreaterThan(0.9);
    expect(muzzle.point[0]).toBeLessThan(barrel.point[0] + 10);
  });
  it("selects and locks No Stock for the VEL 46 APEX preview", () => {
    const catalog = JSON.parse(readFileSync("public/weapon-preview/weapon-builder/catalog.json", "utf8"));
    const vel = catalog.weapons.find((item: SpriteWeapon) => item.id === "rex_sm_mpapa7") as SpriteWeapon;
    const build = createPreviewBuild(vel, catalog.assets, [
      { typeSlug: "apex", label: "Snap", assetId: "rex_apex_mpapa7_snap" },
      { typeSlug: "stock", label: "EXP Defiant Stock", assetId: "rex_stock_hvy_mpapa7" },
    ]);
    expect(build.parts.stock).toBe("rex_stockno_mpapa7");
    expect(build.autoParts.stock).toBe("apex:rex_apex_mpapa7_snap");
    expect(build.parts.receiver).toBe("rex_rec_mpapa7_quickdraw");
  });
  it("uses the i muzzle set for WZ.55 Striga", () => {
    const striga: SpriteWeapon = {
      id: "rex_sm_pmike63", family: "pmike63", base_src: "base.png", assets: [],
      profile: { placements: { muzzle: {} } },
    };
    const muzzles: SpriteAsset[] = [
      { id: "rex_comp_vert_f", slot: "muzzle", src: "f.png", families: [], composable: true },
      { id: "rex_comp_vert_i", slot: "muzzle", src: "i.png", families: [], composable: true },
    ];
    expect(choosePreviewAsset(striga, muzzles, {
      typeSlug: "muzzle", label: "L980-S Comp",
    })?.id).toBe("rex_comp_vert_i");
  });
  it("resolves imported MW4 weapon IDs and legacy aliases", () => {
    expect(getWeaponPreviewRef("m4")).toBe("rex_ar_mike4");
    expect(getWeaponPreviewRef("ISO")).toBe("rex_sm_spier9");
    expect(getWeaponPreviewRef("rex_ar_akilo")).toBe("rex_ar_akilo");
    expect(getWeaponPreviewRef("unmapped")).toBeNull();
  });

  it("normalizes app attachment slugs to compositor slots", () => {
    expect(normalizePreviewSlot("reargrip")).toBe("rear_grip");
    expect(normalizePreviewSlot("mag")).toBe("magazine");
    expect(normalizePreviewSlot("Underbarrel")).toBe("underbarrel");
  });

  it("keeps icon-only asset sources null instead of resolving a /null URL", () => {
    vi.stubGlobal("window", { location: { origin: "http://localhost" } });
    const resolved = resolveCatalogAssetUrls(
      {
        assets: [
          { id: "rex_apex_menu_hotel45_1497", slot: "apex", src: null, families: ["hotel45"] },
          { id: "rex_bar_lgt_hotel45", slot: "barrel", src: "../mw4-attachments/images/barrel.png", families: ["hotel45"] },
        ],
        weapons: [],
        slots: [],
      },
      "/weapon-preview/weapon-builder/catalog.json",
    );
    expect(resolved.assets[0].src).toBeNull();
    expect(resolved.assets[1].src).toBe(
      "http://localhost/weapon-preview/mw4-attachments/images/barrel.png",
    );
  });

  it("prefers a non-factory family sprite and stays deterministic", () => {
    const attachment = { typeSlug: "barrel", label: "RT Outride-X 8\"" };
    expect(choosePreviewAsset(weapon, assets, attachment)?.id).toBe(
      "family-barrel",
    );
    expect(choosePreviewAsset(weapon, assets, attachment)?.id).toBe(
      "family-barrel",
    );
  });

  it("uses the selected asset ID even when its display label differs", () => {
    expect(choosePreviewAsset(weapon, assets, {
      typeSlug: "barrel",
      label: "Official display name",
      assetId: "family-barrel",
    })?.id).toBe("family-barrel");
  });

  it("applies APEX dependencies and its linked receiver", () => {
    const conversion: SpriteAsset = {
      id: "apex-pdw", slot: "apex", src: "apex.png", families: ["mike4"],
      composable: false, receiver_variant: "receiver-pdw",
      dependencies: { magazine: "magazine-pdw" }, locked_slots: ["barrel"],
    };
    const build = createPreviewBuild(
      { ...weapon, assets: ["apex-pdw", "receiver-pdw", "magazine-pdw"],
        component_base: true, factory_parts: { receiver: "receiver-factory" } },
      [conversion,
        { id: "receiver-pdw", slot: "receiver", src: "receiver.png", families: ["mike4"] },
        { id: "magazine-pdw", slot: "magazine", src: "magazine.png", families: ["mike4"] },
        { id: "barrel-old", slot: "barrel", src: "barrel.png", families: ["mike4"] }],
      [{ typeSlug: "barrel", label: "Old barrel", assetId: "barrel-old" },
        { typeSlug: "apex", label: "PDW conversion", assetId: "apex-pdw" }],
    );
    expect(build.parts).toEqual({ apex: "apex-pdw", magazine: "magazine-pdw", receiver: "receiver-pdw" });
    expect(build.autoParts.magazine).toBe("apex:apex-pdw");
  });

  it("uses the Skybreaker receiver and keeps its three movable slots", () => {
    const catalog = JSON.parse(readFileSync("public/weapon-preview/weapon-builder/catalog.json", "utf8"));
    const han = catalog.weapons.find((item: SpriteWeapon) => item.id === "rex_ar_kilo2") as SpriteWeapon;
    const skybreaker = catalog.assets.find((item: SpriteAsset) => item.id === "rex_apex_kilo2_skybreaker") as SpriteAsset;
    expect(Object.keys(skybreaker.slot_mounts ?? {}).sort()).toEqual(["magazine", "muzzle", "rear_grip"]);
    const build = createPreviewBuild(han, catalog.assets, [
      { typeSlug: "apex", label: "Han X20 Skybreaker", assetId: skybreaker.id },
      { typeSlug: "magazine", label: "45 Round Mag", assetId: "rex_xmag_kilo2" },
      { typeSlug: "reargrip", label: "Hanbit H86 Grip", assetId: "rex_pgrip_ass_kilo2" },
      { typeSlug: "muzzle", label: "B16 Helical", assetId: "rex_breach_c" },
      { typeSlug: "barrel", label: "Short", assetId: "rex_bar_sht_kilo2" },
    ]);
    expect(build.parts.receiver).toBe("rex_rec_kilo2_airburst");
    expect(build.parts.magazine).toBe("rex_xmag_kilo2");
    expect(build.parts.rear_grip).toBe("rex_pgrip_ass_kilo2");
    expect(build.parts.muzzle).toBe("rex_breach_c");
    expect(build.parts.barrel).toBeUndefined();
    expect(build.autoParts.barrel).toBe(`apex:${skybreaker.id}`);
    expect(build.autoParts.optic).toBe(`apex:${skybreaker.id}`);
    expect(build.autoParts.stock).toBe(`apex:${skybreaker.id}`);
  });
  it("replaces the Kastov 545 default magazine but keeps a picked 5.45 magazine", () => {
    const catalog = JSON.parse(readFileSync("public/weapon-preview/weapon-builder/catalog.json", "utf8"));
    const akilo = catalog.weapons.find((item: SpriteWeapon) => item.id === "rex_ar_akilo") as SpriteWeapon;
    const apex = { typeSlug: "apex", label: "Kastov 545", assetId: "rex_apex_menu_akilo_1601" };
    expect(createPreviewBuild(akilo, catalog.assets, [apex]).parts.magazine).toBe("rex_mag_akilo_545");
    const drum = { typeSlug: "magazine", label: "95 ROUND DRUM MAG 5.45", assetId: "rex_drum_akilo_545" };
    expect(createPreviewBuild(akilo, catalog.assets, [apex, drum]).parts.magazine).toBe("rex_drum_akilo_545");
  });
});
