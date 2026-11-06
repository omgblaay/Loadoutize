import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyBuilderRelations,
  getBuilderApexRelation,
  type BuilderRelationAsset,
} from "./weaponBuilderRelations";

const catalog = JSON.parse(
  readFileSync("public/weapon-preview/weapon-builder/catalog.json", "utf8"),
) as { assets: BuilderRelationAsset[] };

const apex = [
  { name: "APEX EMP conversion", type: "APEX", stats: { assetId: "rex_bar_akilo_emp" } },
  { name: "APEX PDW conversion", type: "APEX", stats: { assetId: "rex_apex_mike4_pdw" } },
  { name: "APEX receiver conversion", type: "APEX", stats: { assetId: "rex_apex_kilo437" } },
];

describe("weapon builder relations", () => {
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
});
