import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WeaponSpriteCompositor, factoryBuild } from "./weaponSpriteCompositor.js";

const library = JSON.parse(readFileSync("public/weapon-preview/weapon-builder/catalog.json", "utf8"));
const weapon = library.weapons.find((item) => item.id === "rex_ar_kilo2");
const apex = library.assets.find((item) => item.id === "rex_apex_kilo2_skybreaker");

describe("HAN 86 Skybreaker mounts", () => {
  it("mounts the muzzle, magazine and rear grip on the APEX receiver", () => {
    const catalog = {
      ...weapon,
      weapon: weapon.id,
      assets: library.assets,
      placement_overrides: {
        rex_mag_kilo2: { dx: 23, dy: -11 },
        rex_pgrip_kilo2: { dx: -18, dy: 7 },
        rex_breach_c: { dx: 15, dy: 6 },
      },
    };
    const renderer = new WeaponSpriteCompositor(catalog);
    const state = factoryBuild(catalog);
    state.parts = { receiver: apex.receiver_variant, apex: apex.id, muzzle: "rex_breach_c" };
    state.autoParts = Object.fromEntries(apex.locked_slots.map((slot) => [slot, `apex:${apex.id}`]));
    const receiver = renderer.placement(state, "receiver");

    for (const slot of ["muzzle", "magazine", "rear_grip"]) {
      const mount = apex.slot_mounts[slot];
      const part = renderer.placement(state, slot);
      expect(part.x).toBeCloseTo(receiver.bounds[0] + (receiver.bounds[2] - receiver.bounds[0]) * mount.u + (mount.dx || 0));
      expect(part.y).toBeCloseTo(receiver.bounds[1] + (receiver.bounds[3] - receiver.bounds[1]) * mount.v + (mount.dy || 0));
    }
    for (const slot of ["barrel", "optic", "stock"]) {
      expect(renderer.placement(state, slot)).toBeNull();
    }

    const ordinary = renderer.placement(state, "magazine");
    catalog.placement_overrides[`rex_mag_kilo2@${apex.id}`] = { dx: 5, dy: -3 };
    const adjusted = renderer.placement(state, "magazine");
    expect(adjusted.x - ordinary.x).toBeCloseTo(5);
    expect(adjusted.y - ordinary.y).toBeCloseTo(-3);
  });
});

describe("barrel-specific muzzle position", () => {
  it("moves every muzzle on the selected barrel without moving another barrel's muzzle", () => {
    const akilo = library.weapons.find((item) => item.id === "rex_ar_akilo");
    const catalog = {
      ...akilo,
      weapon: akilo.id,
      assets: library.assets,
      placement_overrides: { ...(akilo.default_placement_overrides || {}) },
      barrel_muzzle_offsets: {},
    };
    const renderer = new WeaponSpriteCompositor(catalog);
    const state = factoryBuild(catalog);
    state.parts.barrel = "rex_bar_hvy_akilo";

    for (const muzzle of ["rex_comp_bal_b", "rex_sil_lgt_b"]) {
      state.parts.muzzle = muzzle;
      const before = renderer.placement(state, "muzzle");
      catalog.barrel_muzzle_offsets.rex_bar_hvy_akilo = { dx: 12, dy: -7 };
      const after = renderer.placement(state, "muzzle");
      expect(after.x - before.x).toBeCloseTo(12);
      expect(after.y - before.y).toBeCloseTo(-7);
      delete catalog.barrel_muzzle_offsets.rex_bar_hvy_akilo;
    }

    state.parts.muzzle = "rex_comp_bal_b";
    state.parts.barrel = "rex_bar_akilo";
    const factoryBarrel = renderer.placement(state, "muzzle");
    state.parts.barrel = "rex_bar_hvy_akilo";
    const heavyBarrel = renderer.placement(state, "muzzle");
    expect(Math.abs(factoryBarrel.x - heavyBarrel.x) + Math.abs(factoryBarrel.y - heavyBarrel.y)).toBeGreaterThan(1);
    catalog.barrel_muzzle_offsets.rex_bar_hvy_akilo = { dx: 12, dy: -7 };
    state.parts.barrel = "rex_bar_akilo";
    const factoryAfter = renderer.placement(state, "muzzle");
    expect(factoryAfter.x).toBeCloseTo(factoryBarrel.x);
    expect(factoryAfter.y).toBeCloseTo(factoryBarrel.y);
  });
});
