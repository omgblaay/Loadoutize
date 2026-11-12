import { describe, expect, it } from "vitest";
import { buildSeoContext, resolveWeapon } from "./context";
import {
  attachmentUsage,
  buildScore,
  buildWeaponSlugs,
  isBuildIndexable,
  isPublishableBuild,
  isWeaponIndexable,
  ratingLine,
  rankBuilds,
  slugify,
} from "./logic";
import type { CardAttachment, CardLoadout, CardWeapon } from "@/types/loadout";

function build(overrides: Partial<CardLoadout> & { weaponId?: string } = {}): CardLoadout {
  const { weaponId = "rex_ar_a", ...rest } = overrides;
  return {
    id: rest.id ?? "b1",
    gameId: "mw4",
    name: "Build",
    userName: "Someone",
    weapons: [{ id: weaponId, slot: "primary", attachments: { Optic: "opt_red", Muzzle: "mz_a" } }],
    likes: 0,
    dislikes: 0,
    score: 0,
    ratingPercent: null,
    views: 0,
    authorIsOrganic: true,
    gameLoadoutCode: null,
    organicLikes: 0,
    organicDislikes: 0,
    organicFavorites: 0,
    organicRatingPercent: null,
    createdAt: "2026-11-01T00:00:00Z",
    ...rest,
  } as CardLoadout;
}

const weapons: CardWeapon[] = [
  { id: "rex_ar_a", name: "Akilo 47", type: "Assault Rifles", imageUrl: null },
  { id: "rex_ar_b", name: "Cromeo 16", type: "Assault Rifles", imageUrl: null },
  { id: "rex_sn_c", name: "Sierra 100", type: "Sniper Rifles", imageUrl: null },
  { id: "rex_dup_1", name: "Kilo", type: "Assault Rifles", imageUrl: null },
  { id: "rex_dup_2", name: "Kilo", type: "Assault Rifles", imageUrl: null },
];

const attachments: CardAttachment[] = [
  { id: "opt_red", name: "opt_red", displayName: "Red Dot", type: "Optic" },
  { id: "mz_a", name: "mz_a", displayName: null, type: "Muzzle" },
];

describe("slugify", () => {
  it("lowercases, folds accents and collapses punctuation", () => {
    expect(slugify("Akilo 47")).toBe("akilo-47");
    expect(slugify(".50 GS")).toBe("50-gs");
    expect(slugify("Café  Rifle!")).toBe("cafe-rifle");
  });
});

describe("buildWeaponSlugs", () => {
  it("gives unique names a plain slug and appends the id to duplicates", () => {
    const slugs = buildWeaponSlugs(weapons);
    expect(slugs.get("rex_ar_a")).toBe("akilo-47");
    expect(slugs.get("rex_dup_1")).toBe("kilo-rex-dup-1");
    expect(slugs.get("rex_dup_2")).toBe("kilo-rex-dup-2");
  });
});

describe("publish gate", () => {
  it("treats seeded, bot-authored and imported builds as not publishable", () => {
    expect(isPublishableBuild(build())).toBe(true);
    expect(isPublishableBuild(build({ authorIsOrganic: false }))).toBe(false);
    expect(isPublishableBuild(build({ gameLoadoutCode: "CM-123" }))).toBe(false);
  });

  it("indexes a build only with enough organic votes or a real rationale", () => {
    expect(isBuildIndexable(build({ organicLikes: 4, organicDislikes: 0 }))).toBe(false);
    expect(isBuildIndexable(build({ organicLikes: 4, organicDislikes: 1 }))).toBe(true);
    const longNote = "x".repeat(130);
    expect(isBuildIndexable(build({ description: longNote }))).toBe(true);
    const same = "x".repeat(130);
    expect(isBuildIndexable(build({ name: same, description: same }))).toBe(false);
  });

  it("indexes a weapon only with at least three builds and one indexable build", () => {
    const strong = build({ id: "1", organicLikes: 5 });
    const weak = build({ id: "2" });
    expect(isWeaponIndexable([strong, weak])).toBe(false);
    expect(isWeaponIndexable([strong, weak, build({ id: "3" })])).toBe(true);
    expect(isWeaponIndexable([weak, weak, weak])).toBe(false);
  });
});

describe("ranking and presentation", () => {
  it("scores favorites double and ranks by score, then newest", () => {
    expect(buildScore(build({ organicLikes: 3, organicFavorites: 1, organicDislikes: 1 }))).toBe(4);
    const ranked = rankBuilds([
      build({ id: "old", createdAt: "2026-01-01T00:00:00Z", organicLikes: 2 }),
      build({ id: "best", organicLikes: 5 }),
      build({ id: "new", createdAt: "2026-11-01T00:00:00Z", organicLikes: 2 }),
    ]);
    expect(ranked.map((b) => b.id)).toEqual(["best", "new", "old"]);
  });

  it("only states a rating when verified votes meet the threshold", () => {
    expect(ratingLine(build())).toBe("Not enough verified votes yet");
    expect(ratingLine(build({ organicRatingPercent: 80, organicLikes: 4, organicDislikes: 1 }))).toBe(
      "80% positive from 5 verified votes",
    );
  });

  it("counts attachment usage only across the given builds", () => {
    const builds = [
      build({ id: "1" }),
      build({ id: "2", weapons: [{ id: "rex_ar_a", slot: "primary", attachments: { Optic: "opt_red" } }] }),
      build({ id: "3", weapons: [{ id: "rex_ar_b", slot: "primary", attachments: { Optic: "opt_red" } }] }),
    ];
    const usage = attachmentUsage(builds, "rex_ar_a", new Map([["opt_red", "Red Dot"]]));
    expect(usage.total).toBe(2);
    expect(usage.slots.Optic).toEqual([{ slot: "Optic", label: "Red Dot", count: 2 }]);
    expect(usage.slots.Muzzle).toEqual([{ slot: "Muzzle", label: "mz_a", count: 1 }]);
  });
});

describe("resolveWeapon", () => {
  const ctx = buildSeoContext(weapons, [], attachments);

  it("resolves a slug, and flags an id so the page can redirect to its slug", () => {
    expect(resolveWeapon(ctx, "akilo-47")?.matchedById).toBe(false);
    const byId = resolveWeapon(ctx, "rex_ar_a");
    expect(byId?.matchedById).toBe(true);
    expect(byId?.slug).toBe("akilo-47");
    expect(resolveWeapon(ctx, "does-not-exist")).toBeNull();
  });

  it("groups weapons into categories by their display type", () => {
    const assault = ctx.categories.find((c) => c.slug === "assault-rifles");
    expect(assault?.weapons.map((w) => w.id)).toContain("rex_ar_b");
    expect(ctx.categories.map((c) => c.slug)).toContain("sniper-rifles");
  });
});
