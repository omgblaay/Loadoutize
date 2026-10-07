const WEAPON_CATEGORY_GROUPS: readonly ReadonlySet<string>[] = [
  new Set(["ar", "assault", "assaultrifle", "assaultrifles"]),
  new Set(["smg", "submachinegun", "submachineguns"]),
  new Set(["lmg", "lightmachinegun", "lightmachineguns"]),
  new Set(["mr", "dmr", "marksman", "marksmanrifle", "marksmanrifles"]),
  new Set(["sr", "snip", "sniper", "sniperrifle", "sniperrifles"]),
  new Set([
    "hg",
    "pstl",
    "pistol",
    "pistols",
    "handgun",
    "handguns",
    "sidearm",
    "sidearms",
  ]),
];

function normalizeWeaponCategory(category: string) {
  return category
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getWeaponCategoryRank(category: string) {
  const normalized = normalizeWeaponCategory(category);
  const rank = WEAPON_CATEGORY_GROUPS.findIndex((group) =>
    group.has(normalized),
  );

  return rank === -1 ? WEAPON_CATEGORY_GROUPS.length : rank;
}

/**
 * AR, SMG, LMG, marksman, sniper and pistol are pinned in that order.
 * Categories outside those groups follow alphabetically instead of being hidden.
 */
export function compareWeaponCategories(a: string, b: string) {
  const rankDifference = getWeaponCategoryRank(a) - getWeaponCategoryRank(b);
  return (
    rankDifference ||
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
  );
}

export function sortWeaponCategories(categories: Iterable<string>) {
  return Array.from(new Set(categories)).sort(compareWeaponCategories);
}
