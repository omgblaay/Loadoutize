import { describe, expect, it } from "vitest";
import { sortWeaponCategories, visibleWeaponCatalog } from "./weaponCategories";

describe("visible weapon categories", () => {
  it("keeps the seven supported categories in product order", () => {
    expect(sortWeaponCategories([
      "Launchers", "LMGs", "Shotguns", "Pistols", "Sniper rifles",
      "Melee / equipment", "Marksman rifles", "SMGs", "Assault rifles",
    ])).toEqual([
      "Assault rifles", "SMGs", "Marksman rifles", "Sniper rifles",
      "Pistols", "Shotguns", "LMGs",
    ]);
  });

  it("hides excluded weapons and uses the supported short labels", () => {
    expect(visibleWeaponCatalog([
      { type: "Marksman rifles", typeShort: "DMR" },
      { type: "Launchers", typeShort: "LCH" },
      { type: "Melee / equipment", typeShort: "MEL" },
    ])).toEqual([{ type: "Marksman rifles", typeShort: "MR" }]);
  });
});
