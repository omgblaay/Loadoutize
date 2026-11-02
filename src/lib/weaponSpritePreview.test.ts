import { describe, expect, it } from "vitest";
import {
  choosePreviewAsset,
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
  it("only enables verified app weapon mappings", () => {
    expect(getWeaponPreviewRef("m4")).toBe("rex_ar_mike4");
    expect(getWeaponPreviewRef("ISO")).toBe("rex_sm_spier9");
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
});
