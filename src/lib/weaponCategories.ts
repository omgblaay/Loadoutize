const WEAPON_CATEGORIES = [
  { short: "AR", names: ["ar", "assault", "assaultrifle", "assaultrifles"] },
  { short: "SMG", names: ["smg", "smgs", "submachinegun", "submachineguns"] },
  { short: "MR", names: ["mr", "marksman", "marksmanrifle", "marksmanrifles"] },
  { short: "SR", names: ["sr", "snip", "sniper", "sniperrifle", "sniperrifles"] },
  { short: "PST", names: ["hg", "pst", "pstl", "pistol", "pistols", "handgun", "handguns", "sidearm", "sidearms"] },
  { short: "SG", names: ["sg", "shotgun", "shotguns"] },
  { short: "LMG", names: ["lmg", "lmgs", "lightmachinegun", "lightmachineguns"] },
] as const;

function normalizeWeaponCategory(category: string) {
  return category
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getWeaponCategoryRank(category: string) {
  const normalized = normalizeWeaponCategory(category);
  return WEAPON_CATEGORIES.findIndex((group) =>
    group.names.some((name) => name === normalized),
  );
}

export function isSupportedWeaponCategory(category: string | null | undefined) {
  return Boolean(category && getWeaponCategoryRank(category) !== -1);
}

export function weaponCategoryShort(category: string | null | undefined) {
  if (!category) return null;
  const rank = getWeaponCategoryRank(category);
  return rank === -1 ? null : WEAPON_CATEGORIES[rank].short;
}

export function visibleWeaponCatalog<T extends { type: string | null; typeShort?: string | null }>(weapons: T[]): T[] {
  return weapons
    .filter((weapon) => isSupportedWeaponCategory(weapon.type))
    .map((weapon) => ({
      ...weapon,
      typeShort: weaponCategoryShort(weapon.type),
    }));
}

/**
 * Only the seven supported weapon categories are shown, in product order.
 */
export function compareWeaponCategories(a: string, b: string) {
  const rankDifference = getWeaponCategoryRank(a) - getWeaponCategoryRank(b);
  return (
    rankDifference ||
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
  );
}

export function sortWeaponCategories(categories: Iterable<string>) {
  return Array.from(new Set(categories))
    .filter(isSupportedWeaponCategory)
    .sort(compareWeaponCategories);
}
