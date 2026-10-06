import type { MetaLoadout, MetaWeapon } from "@/hooks/useMetaData";

export const MIN_RATING_VOTES = 5;

export interface WeaponMetric {
  weapon: MetaWeapon;
  count: number;
  share: number;
  avgRating: number | null;
}

export function ratingTier(score: number | null) {
  if (score == null) return null;
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

export function buildWeaponMetrics(
  weapons: MetaWeapon[],
  loadouts: MetaLoadout[],
  includeInactive = false,
): WeaponMetric[] {
  return weapons
    .map((weapon) => {
      const matchingLoadouts = loadouts.filter((loadout) =>
        (loadout.weapons ?? []).some(
          (loadoutWeapon) => String(loadoutWeapon.id) === String(weapon.id),
        ),
      );
      const ratedLoadouts = matchingLoadouts.filter(
        (loadout) =>
          loadout.ratingPercent != null &&
          loadout.likes + loadout.dislikes >= MIN_RATING_VOTES,
      );
      const avgRating =
        ratedLoadouts.length > 0
          ? Math.round(
              ratedLoadouts.reduce(
                (sum, loadout) => sum + (loadout.ratingPercent as number),
                0,
              ) / ratedLoadouts.length,
            )
          : null;

      return {
        weapon,
        count: matchingLoadouts.length,
        share:
          loadouts.length > 0
            ? (matchingLoadouts.length / loadouts.length) * 100
            : 0,
        avgRating,
      };
    })
    .filter((metric) => includeInactive || metric.count > 0)
    .sort(
      (a, b) =>
        (b.avgRating ?? -1) - (a.avgRating ?? -1) ||
        b.count - a.count ||
        a.weapon.name.localeCompare(b.weapon.name),
    );
}
