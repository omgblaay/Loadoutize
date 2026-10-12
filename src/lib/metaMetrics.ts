import type { MetaLoadout, MetaWeapon } from "@/hooks/useMetaData";

export const MIN_RATING_VOTES = 5;
export const MIN_S_PLUS_VOTES = 25;

export type RatingTier =
  | "S+"
  | "S"
  | "S-"
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-"
  | "D+"
  | "D"
  | "D-";

export interface WeaponMetric {
  weapon: MetaWeapon;
  count: number;
  share: number;
  avgRating: number | null;
}

export function ratingTier(
  score: number | null,
  votes = 0,
): RatingTier | null {
  if (score == null) return null;
  if (score >= 95 && votes >= MIN_S_PLUS_VOTES) return "S+";
  if (score >= 94) return "S";
  if (score >= 90) return "S-";
  if (score >= 85) return "A+";
  if (score >= 80) return "A";
  if (score >= 75) return "A-";
  if (score >= 70) return "B+";
  if (score >= 65) return "B";
  if (score >= 60) return "B-";
  if (score >= 54) return "C+";
  if (score >= 47) return "C";
  if (score >= 40) return "C-";
  if (score >= 27) return "D+";
  if (score >= 14) return "D";
  return "D-";
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
