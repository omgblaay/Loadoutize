import { describe, expect, it } from "vitest";

import type { MetaLoadout, MetaWeapon } from "@/hooks/useMetaData";
import {
  MIN_S_PLUS_VOTES,
  buildWeaponMetrics,
  ratingTier,
} from "./metaMetrics";

const weapon = (id: string, name: string): MetaWeapon => ({
  id,
  name,
  type: null,
  typeShort: null,
  imageUrl: null,
});

const loadout = (
  id: string,
  weaponIds: string[],
  ratingPercent: number | null,
  likes = 0,
  dislikes = 0,
): MetaLoadout => ({
  id,
  name: id,
  createdAt: "2026-01-01T00:00:00.000Z",
  weapons: weaponIds.map((weaponId) => ({ id: weaponId })),
  tagId: null,
  ratingPercent,
  likes,
  dislikes,
  score: 0,
});

describe("ratingTier", () => {
  it("returns null when a weapon has no rating", () => {
    expect(ratingTier(null, 100)).toBeNull();
  });

  it("requires enough votes for S+", () => {
    expect(ratingTier(95, MIN_S_PLUS_VOTES - 1)).toBe("S");
    expect(ratingTier(95, MIN_S_PLUS_VOTES)).toBe("S+");
  });

  it.each([
    [94, "S"],
    [90, "S-"],
    [85, "A+"],
    [80, "A"],
    [75, "A-"],
    [70, "B+"],
    [65, "B"],
    [60, "B-"],
    [54, "C+"],
    [47, "C"],
    [40, "C-"],
    [27, "D+"],
    [14, "D"],
    [13, "D-"],
  ] as const)("maps a score of %i to %s", (score, tier) => {
    expect(ratingTier(score)).toBe(tier);
  });
});

describe("buildWeaponMetrics", () => {
  const weapons = [weapon("1", "Alpha"), weapon("2", "Bravo"), weapon("3", "Charlie")];
  const loadouts = [
    loadout("one", ["1", "2"], 80, 4, 1),
    loadout("two", ["1"], 90, 10, 0),
    loadout("three", ["2"], 100, 2, 1),
    loadout("four", ["2"], 70, 5, 0),
  ];

  it("counts usage, computes shares, and ignores under-voted ratings", () => {
    expect(buildWeaponMetrics(weapons, loadouts)).toEqual([
      { weapon: weapons[0], count: 2, share: 50, avgRating: 85 },
      { weapon: weapons[1], count: 3, share: 75, avgRating: 75 },
    ]);
  });

  it("can include inactive weapons", () => {
    const metrics = buildWeaponMetrics(weapons, loadouts, true);
    expect(metrics).toHaveLength(3);
    expect(metrics[2]).toEqual({ weapon: weapons[2], count: 0, share: 0, avgRating: null });
  });

  it("handles an empty loadout collection", () => {
    expect(buildWeaponMetrics([weapons[0]], [], true)).toEqual([
      { weapon: weapons[0], count: 0, share: 0, avgRating: null },
    ]);
  });

  it("matches numeric and string weapon identifiers", () => {
    expect(buildWeaponMetrics([weapon("42", "Converted")], [loadout("numeric", [42 as unknown as string], 90, 5)])).toHaveLength(1);
  });
});
