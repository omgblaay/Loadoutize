import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyBuilderRelations,
  builderAttachmentDisplayName,
  getBuilderApexRelation,
  mw4MuzzleAllowed,
  HAN86_UNDERBARREL_IDS,
  han86AllowsUnderbarrel,
  AR_OPTIC_IDS,
  arAllowsOptic,
  SMG_OPTIC_IDS,
  smgAllowsOptic,
  AR_LASER_IDS,
  arAllowsLaser,
  VEL_AMMUNITION_IDS,
  velAllowsAmmunition,
  SMG_COMMON_UNDERBARREL_IDS,
  SMG_UNDERBARREL_IDS_BY_WEAPON,
  smgAllowsUnderbarrel,
  strigaDreadlineSelected,
  type BuilderRelationAsset,
} from "./weaponBuilderRelations";

const catalog = JSON.parse(
  readFileSync("public/weapon-preview/weapon-builder/catalog.json", "utf8"),
) as { assets: BuilderRelationAsset[]; slots: string[]; weapons: { id: string; assets: string[]; shared_assets?: string[] }[] };

const apex = [
  { name: "APEX EMP conversion", type: "APEX", stats: { assetId: "rex_bar_akilo_emp" } },
  { name: "APEX PDW conversion", type: "APEX", stats: { assetId: "rex_apex_mike4_pdw" } },
  { name: "APEX receiver conversion", type: "APEX", stats: { assetId: "rex_apex_kilo437" } },
  { name: "Snap", type: "APEX", stats: { assetId: "rex_apex_mpapa7_snap" } },
];

describe("weapon builder relations", () => {
  it("uses one canonical attachment name across weapons", () => {
    const assets = new Map(catalog.assets.map((asset) => [asset.id, asset]));
    expect(catalog.assets.every((asset) => !("weapon_display_names" in asset))).toBe(true);
    for (const weaponId of ["rex_ar_mike4", "rex_ar_kilo437", "rex_sm_pmike63"]) {
      expect(builderAttachmentDisplayName("rex_minireddot01", weaponId, assets, "Old API label"))
        .toBe("SLIMLINE ELITE");
      expect(builderAttachmentDisplayName("rex_comp_bal_a", weaponId, assets, "comp bal a"))
        .toBe("FTAC DOMINION");
    }
    expect(builderAttachmentDisplayName("missing-asset", "rex_ar_mike4", assets, "Old API label"))
      .toBe("Old API label");
  });
  it("offers Striga underbarrels only with Ballistarc Dreadline 80 and hides guard selection", () => {
    const parts = [
      { name: "Ballistarc Dreadline 80", type: "Barrel", stats: { assetId: "rex_bar_hvy_pmike63" } },
      { name: "DS 9x18 Pro", type: "Barrel", stats: { assetId: "rex_bar_lgt_pmike63" } },
    ];
    const selected = { Barrel: "Ballistarc Dreadline 80", Underbarrel: "FSS FIRELINE GRIP", Guard: "Factory guard" };
    expect(strigaDreadlineSelected(selected, parts, "rex_sm_pmike63")).toBe(true);
    expect(applyBuilderRelations(selected, parts, catalog.assets, "rex_sm_pmike63"))
      .toEqual({ Barrel: "Ballistarc Dreadline 80", Underbarrel: "FSS FIRELINE GRIP" });
    expect(applyBuilderRelations({ ...selected, Barrel: "DS 9x18 Pro" }, parts, catalog.assets, "rex_sm_pmike63"))
      .toEqual({ Barrel: "DS 9x18 Pro" });
  });
  it("locks VEL 46 to No Stock while its APEX is selected", () => {
    const relation = getBuilderApexRelation({ APEX: "Snap" }, apex, catalog.assets);
    expect(relation?.lockedSlots.get("stock")).toMatchObject({
      included: true,
      includedPart: "NO STOCK",
    });
    expect(applyBuilderRelations({ APEX: "Snap", Stock: "Heavy Stock" }, apex, catalog.assets, "rex_sm_mpapa7"))
      .toEqual({ APEX: "Snap" });
  });
  it("matches VEL 46's five 4.6x30mm ammunition choices", () => {
    const names = [
      "4.6x30mm Armor Piercing", "4.6x30mm Frangible",
      "4.6x30mm Hollow Point", "4.6x30mm High Velocity",
      "4.6x30mm Overpressured",
    ];
    const vel = catalog.weapons.find((weapon) => weapon.id === "rex_sm_mpapa7");
    expect(VEL_AMMUNITION_IDS).toHaveLength(5);
    expect(VEL_AMMUNITION_IDS.map((id) =>
      catalog.assets.find((asset) => asset.id === id)?.display_name,
    )).toEqual(names.map((name) => name.toUpperCase()));
    expect(VEL_AMMUNITION_IDS.every((id) => vel?.shared_assets?.includes(id))).toBe(true);
    expect(VEL_AMMUNITION_IDS.every(velAllowsAmmunition)).toBe(true);
    expect(velAllowsAmmunition("rex_ammo_9m_ap")).toBe(false);
  });
  it("keeps the screenshot-verified attachment choice counts", () => {
    expect(SMG_OPTIC_IDS).toHaveLength(18);
    expect(SMG_OPTIC_IDS.every(smgAllowsOptic)).toBe(true);
    expect(SMG_UNDERBARREL_IDS_BY_WEAPON.rex_sm_pmike63).toEqual(SMG_COMMON_UNDERBARREL_IDS);
    expect(AR_LASER_IDS).toHaveLength(7);
    expect(AR_LASER_IDS.every(arAllowsLaser)).toBe(true);
    expect(AR_OPTIC_IDS).toHaveLength(23);
    expect(AR_OPTIC_IDS.every(arAllowsOptic)).toBe(true);
    expect(HAN86_UNDERBARREL_IDS).toHaveLength(8);
    expect(HAN86_UNDERBARREL_IDS.every(han86AllowsUnderbarrel)).toBe(true);
  });
  it("uses only the supplied muzzle rows for each weapon", () => {
    const rows = readFileSync("data/mw4-muzzles.tsv", "utf8").trim().split(/\r?\n/).slice(1);
    const muzzles = catalog.assets.filter((asset) => asset.slot === "muzzle" && asset.muzzle_table);
    const byId = new Map(catalog.assets.map((asset) => [asset.id, asset]));
    expect(rows).toHaveLength(118);
    expect(muzzles).toHaveLength(rows.length);
    for (const asset of muzzles) {
      const row = rows[(asset.muzzle_order ?? 0) - 1]?.split("\t");
      expect([asset.display_name, asset.subtype_label, asset.image_asset_id]).toEqual([
        row?.[0].toUpperCase(), row?.[1] ? row[1].toUpperCase() : null, row?.[2],
      ]);
    }
    for (const weapon of catalog.weapons) {
      const choices = muzzles.filter((asset) => mw4MuzzleAllowed(asset.id, weapon.id, byId));
      expect(new Set(choices.map((asset) => asset.display_name)).size).toBe(choices.length);
      if (weapon.id === "rex_sm_xsm1") expect(choices).toHaveLength(0);
    }
    expect(mw4MuzzleAllowed("rex_sil_tac_cromeo", "rex_ar_cromeo", byId)).toBe(false);
  });
  it("has no Iron sights or Other slot in any MW4 weapon recipe", () => {
    const hidden = new Set(["iron_sights", "other"]);
    const slotById = new Map(catalog.assets.map((asset) => [asset.id, asset.slot]));
    expect(catalog.slots.some((slot) => hidden.has(slot))).toBe(false);
    expect(catalog.weapons.every((weapon) =>
      weapon.assets.every((id) => !hidden.has(slotById.get(id) ?? "")),
    )).toBe(true);
  });
  it("removes a barrel locked by the Kastov ARC conversion", () => {
    expect(applyBuilderRelations({ Barrel: "Long barrel", APEX: apex[0].name, Optic: "Reflex" }, apex, catalog.assets))
      .toEqual({ APEX: apex[0].name, Optic: "Reflex" });
  });

  it("keeps the M4 Hurricane's required magazine and stock under APEX control", () => {
    const relation = getBuilderApexRelation({ APEX: apex[1].name }, apex, catalog.assets);
    expect(relation?.lockedSlots.get("barrel")?.includedPart).toBeUndefined();
    expect(relation?.lockedSlots.get("magazine")?.included).toBe(true);
    expect(relation?.lockedSlots.get("stock")?.includedPart).toBeTruthy();
    expect(applyBuilderRelations({ APEX: apex[1].name, Barrel: "Heavy", Magazine: "Large", Stock: "Light" }, apex, catalog.assets))
      .toEqual({ APEX: apex[1].name });
  });

  it("removes every slot locked by the receiver conversion", () => {
    const selected = { APEX: apex[2].name, Laser: "Beam", Optic: "Reflex", Stock: "Light", "Rear Grip": "Grip", Underbarrel: "Grip", Muzzle: "Brake" };
    expect(applyBuilderRelations(selected, apex, catalog.assets))
      .toEqual({ APEX: apex[2].name, Muzzle: "Brake" });
  });

  it("leaves ordinary builds alone", () => {
    const selected = { Barrel: "Heavy", Stock: "Light" };
    expect(applyBuilderRelations(selected, apex, catalog.assets)).toBe(selected);
  });

  it("removes obsolete Iron sights and Other choices from MW4 builds", () => {
    const selected = { "Iron Sights": "Tall sight", Other: "Internal", Muzzle: "Brake" };
    expect(applyBuilderRelations(selected, [], catalog.assets, "rex_ar_kilo2"))
      .toEqual({ Muzzle: "Brake" });
    expect(applyBuilderRelations(selected, [], catalog.assets, "another_game_weapon"))
      .toBe(selected);
  });

  it("blocks Rezi 12 combs only when No Stock is selected", () => {
    const stocks = [{ name: "No Stock", type: "Stock", stats: { assetId: "rex_stockno_bmike3" } }];
    const selected = { Stock: "No Stock", Comb: "Bryson Sidewinder", Muzzle: "Brake" };
    expect(applyBuilderRelations(selected, stocks, catalog.assets, "rex_sh_bmike3"))
      .toEqual({ Stock: "No Stock", Muzzle: "Brake" });
    expect(applyBuilderRelations(selected, stocks, catalog.assets, "rex_sh_other"))
      .toBe(selected);
  });

  it("blocks the HAN 86 Skybreaker optic, stock, and barrel", () => {
    const skybreaker = [{ name: "Han X20 Skybreaker", type: "APEX", stats: { assetId: "rex_apex_kilo2_skybreaker" } }];
    const selected = { APEX: "Han X20 Skybreaker", Optic: "Scope", Stock: "Light", Barrel: "Short", Magazine: "Extended" };
    expect(applyBuilderRelations(selected, skybreaker, catalog.assets, "rex_ar_kilo2"))
      .toEqual({ APEX: "Han X20 Skybreaker", Magazine: "Extended" });
  });
});
