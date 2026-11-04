import { describe, expect, it } from "vitest";
import {
  choosePreviewAsset,
  createPreviewBuild,
  getWeaponPreviewRef,
  normalizePreviewSlot,
  type SpriteAsset,
  type SpriteWeapon,
} from "./weaponSpritePreview";

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
});
