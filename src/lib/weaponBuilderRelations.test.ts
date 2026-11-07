import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyBuilderRelations,
  builderAttachmentDisplayName,
  getBuilderApexRelation,
  HAN86_UNDERBARREL_IDS,
  han86AllowsUnderbarrel,
  M4_MUZZLE_IDS,
  m4AllowsMuzzle,
  AR_OPTIC_IDS,
  arAllowsOptic,
  SMG_OPTIC_IDS,
  smgAllowsOptic,
  AR_LASER_IDS,
  arAllowsLaser,
  SMG_I_MUZZLE_IDS,
  SMG_I_WEAPONS,
  smgIAllowsMuzzle,
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
  { name: "VEL 46 Snap", type: "APEX", stats: { assetId: "rex_pgrip_aim_mpapa7" } },
];

describe("weapon builder relations", () => {
  it("uses the screenshot-confirmed weapon name before a stale API label", () => {
    const assets = new Map(catalog.assets.map((asset) => [asset.id, asset]));
    expect(builderAttachmentDisplayName("rex_minireddot01", "rex_ar_mike4", assets, "rex_minireddot01"))
      .toBe("Slimline Elite");
    expect(builderAttachmentDisplayName("rex_minireddot01", "rex_sm_pmike63", assets, "Old API label"))
      .toBe("Slimline Elite");
    expect(builderAttachmentDisplayName("rex_laserads_lrg02", "rex_ar_mike4", assets, "Old API label"))
      .toBe("SZ Gen.6 PEQ");
    expect(builderAttachmentDisplayName("rex_bar_sht_kilo2", "rex_ar_kilo2", assets, "Old API label"))
      .toBe("Hanbit Combat-S 264mm");
    expect(builderAttachmentDisplayName("missing-asset", "rex_ar_kilo2", assets, "Old API label"))
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
    const relation = getBuilderApexRelation({ APEX: "VEL 46 Snap" }, apex, catalog.assets);
    expect(relation?.lockedSlots.get("stock")).toMatchObject({
      included: true,
      includedPart: "No Stock",
    });
    expect(applyBuilderRelations({ APEX: "VEL 46 Snap", Stock: "Heavy Stock" }, apex, catalog.assets, "rex_sm_mpapa7"))
      .toEqual({ APEX: "VEL 46 Snap" });
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
    )).toEqual(names);
    expect(VEL_AMMUNITION_IDS.every((id) => vel?.shared_assets?.includes(id))).toBe(true);
    expect(VEL_AMMUNITION_IDS.every(velAllowsAmmunition)).toBe(true);
    expect(velAllowsAmmunition("rex_ammo_9m_ap")).toBe(false);
  });
  it("matches the 18 SMG optics in game-menu order", () => {
    const names = [
      "Slimline Elite", "IOTA-D", "ZLR Type C", "SZ Prima-4 Dot",
      "SZ Micro D-3", "VLK Trimmer", "SZ SRE-7", "FJX 708 PRO",
      "SZ Lonewolf Holo", "SZ Echelon Holo", "SZ Helios Holo",
      "KV Corsac Holo", "Bruen THRM-60 Optic", "Cronen R808",
      "GL K230", "SZ Lonewolf Flip", "Corio Bisect",
      "Schlager Night View Pro",
    ];
    expect(SMG_OPTIC_IDS).toHaveLength(18);
    for (const weapon of catalog.weapons.filter((item) => item.id.startsWith("rex_sm_"))) {
      expect(SMG_OPTIC_IDS.map((id) =>
        catalog.assets.find((asset) => asset.id === id)?.weapon_display_names?.[weapon.id],
      )).toEqual(names);
    }
    expect(SMG_OPTIC_IDS.every(smgAllowsOptic)).toBe(true);
    expect(smgAllowsOptic("rex_holo_spier9")).toBe(false);
  });
  it("matches the four WZ.55 Striga underbarrels in game-menu order", () => {
    expect(SMG_UNDERBARREL_IDS_BY_WEAPON.rex_sm_pmike63).toEqual(SMG_COMMON_UNDERBARREL_IDS);
    expect(SMG_COMMON_UNDERBARREL_IDS.map((id) =>
      catalog.assets.find((asset) => asset.id === id)?.display_name,
    )).toEqual(["FSS FIRELINE GRIP", "FSS TAC90 GRIP", "MIRE-50 TAC GRIP", "GW DOMI-9"]);
    expect(SMG_COMMON_UNDERBARREL_IDS.every((id) =>
      smgAllowsUnderbarrel("rex_sm_pmike63", id))).toBe(true);
    expect(smgAllowsUnderbarrel("rex_sm_pmike63", "rex_grip_bipod01")).toBe(false);
    expect(catalog.assets.find((asset) => asset.id === "rex_grip_fld_mpapa7")
      ?.weapon_display_names?.rex_sm_mpapa7).toBe("V46 Vert-Tac");
  });
  it("matches the eight Striga and PPSh-41 muzzles in game-menu order", () => {
    const names = [
      "L980-S Comp", "1/2x28 Dual Port", "Full Port Comp", "Haebang BAM70",
      "330TC2 Gridlock", "FTAC Silent Recon", "XRK Rampage", "RX-5 Overstrike",
    ];
    expect(SMG_I_MUZZLE_IDS).toHaveLength(8);
    for (const weaponId of ["rex_sm_pmike63", "rex_sm_psierra41"]) {
      expect(SMG_I_WEAPONS.has(weaponId)).toBe(true);
      expect(SMG_I_MUZZLE_IDS.map((id) =>
        catalog.assets.find((asset) => asset.id === id)?.weapon_display_names?.[weaponId],
      )).toEqual(names);
    }
    expect(SMG_I_MUZZLE_IDS.every(smgIAllowsMuzzle)).toBe(true);
    expect(smgIAllowsMuzzle("rex_comp_vert_f")).toBe(false);
  });
  it("matches the seven M4 lasers in game-menu order", () => {
    const names = [
      "SZ Gen.6 PEQ", "SA Laz-500", "Bruen 22-LPW", "STOVL IRX-6",
      "Expedite Intra-5b", "Corio ODSPR+", "Corio 4DV-3",
    ];
    expect(AR_LASER_IDS).toHaveLength(7);
    expect(AR_LASER_IDS.map((id) =>
      catalog.assets.find((asset) => asset.id === id)?.weapon_display_names?.rex_ar_mike4,
    )).toEqual(names);
    expect(AR_LASER_IDS.every(arAllowsLaser)).toBe(true);
    expect(arAllowsLaser("rex_laser_stocksaw_kilo437")).toBe(false);
  });
  it("matches the 23 assault-rifle optics in game-menu order", () => {
    const names = [
      "Slimline Elite", "IOTA-D", "ZLR Type C", "SZ Prima-4 Dot",
      "SZ Micro D-3", "VLK Trimmer", "SZ SRE-7", "FJX 708 PRO",
      "SZ Lonewolf Holo", "SZ Echelon Holo", "SZ Helios Holo",
      "KV Corsac Holo", "Bruen THRM-60 Optic", "Cronen R808",
      "GL K230", "Corio Bisect", "SZ Lonewolf Flip",
      "Schlager Night View Pro", "Schlager 7X", "VLK Rize-40",
      "RVX9 Thermo", "Locus PX3 Canted", "Schlager Dogfight GI",
    ];
    expect(AR_OPTIC_IDS).toHaveLength(23);
    for (const weapon of catalog.weapons.filter((item) => item.id.startsWith("rex_ar_"))) {
      expect(AR_OPTIC_IDS.map((id) =>
        catalog.assets.find((asset) => asset.id === id)?.weapon_display_names?.[weapon.id],
      )).toEqual(names);
    }
    expect(AR_OPTIC_IDS.every(arAllowsOptic)).toBe(true);
    expect(arAllowsOptic("rex_arscope_airburst")).toBe(false);
  });
  it("matches the eight M4 muzzles and their in-game names", () => {
    const names = [
      "ZLR Reverb90", "Corvus LVL-40", "FTAC Dominion", "FSS IS40",
      "XRK Mil-Tac Suppressor", "FSS IS300", "B16 Helical", "TZL-110 V1",
    ];
    expect(M4_MUZZLE_IDS).toHaveLength(8);
    expect(M4_MUZZLE_IDS.map((id) =>
      catalog.assets.find((asset) => asset.id === id)?.weapon_display_names?.rex_ar_mike4,
    )).toEqual(names);
    expect(M4_MUZZLE_IDS.every(m4AllowsMuzzle)).toBe(true);
    expect(m4AllowsMuzzle("rex_sil_broken_a")).toBe(false);
  });
  it("matches the eight HAN 86 underbarrels and their in-game names", () => {
    const names = [
      "FSS Fireline Grip", "FSS Tac90 Grip", "Mire-50 Tac Grip", "GW Domi-9",
      "FSS Reargrip", "AA54 V.3 Bipod", "Miri 40mm", "TV Judicator",
    ];
    expect(HAN86_UNDERBARREL_IDS).toHaveLength(8);
    expect(HAN86_UNDERBARREL_IDS.map((id) =>
      catalog.assets.find((asset) => asset.id === id)?.weapon_display_names?.rex_ar_kilo2,
    )).toEqual(names);
    expect(HAN86_UNDERBARREL_IDS.every(han86AllowsUnderbarrel)).toBe(true);
    expect(han86AllowsUnderbarrel("rex_ub_gl_std")).toBe(false);
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
