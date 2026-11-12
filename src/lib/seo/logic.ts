import type { CardAttachment, CardLoadout, CardWeapon } from "@/types/loadout";

// Publish gate. A page is indexable only when it has enough organic (real,
// non-seeded, non-imported) data to say something a template could not.
export const WEAPON_MIN_BUILDS_TO_INDEX = 3;
export const BUILD_MIN_VOTES_TO_INDEX = 5;
export const BUILD_MIN_RATIONALE_CHARS = 120;

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Slugs come from display names. A duplicate name gets the internal id
// appended, so every weapon keeps a unique, stable URL without a DB migration.
export function buildWeaponSlugs(
  weapons: { id: string; name: string }[],
): Map<string, string> {
  const baseOf = (weapon: { id: string; name: string }) =>
    slugify(weapon.name) || slugify(weapon.id);
  const counts = new Map<string, number>();
  for (const weapon of weapons) {
    counts.set(baseOf(weapon), (counts.get(baseOf(weapon)) ?? 0) + 1);
  }
  const slugs = new Map<string, string>();
  for (const weapon of weapons) {
    const base = baseOf(weapon);
    slugs.set(
      weapon.id,
      (counts.get(base) ?? 0) > 1 ? `${base}-${slugify(weapon.id)}` : base,
    );
  }
  return slugs;
}

export function isPublishableBuild(loadout: CardLoadout): boolean {
  return loadout.authorIsOrganic === true && !loadout.gameLoadoutCode;
}

export function buildScore(loadout: CardLoadout): number {
  return (
    (loadout.organicLikes ?? 0) +
    (loadout.organicFavorites ?? 0) * 2 -
    (loadout.organicDislikes ?? 0)
  );
}

export function organicVotes(loadout: CardLoadout): number {
  return (loadout.organicLikes ?? 0) + (loadout.organicDislikes ?? 0);
}

export function rankBuilds(loadouts: CardLoadout[]): CardLoadout[] {
  return [...loadouts].sort(
    (a, b) =>
      buildScore(b) - buildScore(a) ||
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
}

export function usesWeapon(loadout: CardLoadout, weaponId: string): boolean {
  return loadout.weapons.some((weapon) => String(weapon.id) === weaponId);
}

export function isBuildIndexable(loadout: CardLoadout): boolean {
  const rationale = (loadout.description ?? "").trim();
  const hasRationale =
    rationale.length >= BUILD_MIN_RATIONALE_CHARS &&
    rationale !== loadout.name.trim();
  return organicVotes(loadout) >= BUILD_MIN_VOTES_TO_INDEX || hasRationale;
}

export function isWeaponIndexable(builds: CardLoadout[]): boolean {
  return builds.length >= WEAPON_MIN_BUILDS_TO_INDEX && builds.some(isBuildIndexable);
}

export interface AttachmentUsage {
  slot: string;
  label: string;
  count: number;
}

// How often each attachment appears on this weapon across the given builds.
// Grouped by slot, most-used first, so the page can say "in 3 of 4 builds".
export function attachmentUsage(
  builds: CardLoadout[],
  weaponId: string,
  labels: Map<string, string>,
): { total: number; slots: Record<string, AttachmentUsage[]> } {
  const perSlot = new Map<string, Map<string, number>>();
  let total = 0;
  for (const build of builds) {
    for (const weapon of build.weapons) {
      if (String(weapon.id) !== weaponId) continue;
      total += 1;
      for (const [slot, name] of Object.entries(weapon.attachments ?? {})) {
        const counts = perSlot.get(slot) ?? new Map<string, number>();
        counts.set(name, (counts.get(name) ?? 0) + 1);
        perSlot.set(slot, counts);
      }
    }
  }
  const slots: Record<string, AttachmentUsage[]> = {};
  for (const [slot, counts] of perSlot) {
    slots[slot] = [...counts.entries()]
      .map(([name, count]) => ({ slot, label: labels.get(name) ?? name, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }
  return { total, slots };
}

export function attachmentLabels(attachments: CardAttachment[]): Map<string, string> {
  return new Map(
    attachments.map((attachment) => [attachment.name, attachment.displayName ?? attachment.name]),
  );
}

export function categorySlug(weapon: CardWeapon): string | null {
  return weapon.type ? slugify(weapon.type) : null;
}

export function ratingLine(loadout: CardLoadout): string {
  if (loadout.organicRatingPercent == null) {
    return "Not enough verified votes yet";
  }
  const votes = organicVotes(loadout);
  return `${loadout.organicRatingPercent}% positive from ${votes} verified votes`;
}

export function buildSummary(loadout: CardLoadout, weaponId: string, labels: Map<string, string>): string {
  const weapon = loadout.weapons.find((entry) => String(entry.id) === weaponId);
  const parts = Object.entries(weapon?.attachments ?? {}).map(
    ([slot, name]) => `${slot.toLowerCase()}: ${labels.get(name) ?? name}`,
  );
  return parts.join(", ");
}
