import type { CardAttachment, CardLoadout, CardWeapon } from "@/types/loadout";
import {
  attachmentLabels,
  buildWeaponSlugs,
  categorySlug,
  isPublishableBuild,
  rankBuilds,
  slugify,
  usesWeapon,
} from "./logic";

export interface SeoCategory {
  slug: string;
  name: string;
  weapons: CardWeapon[];
}

export interface SeoContext {
  weapons: CardWeapon[];
  slugById: Map<string, string>;
  weaponBySlug: Map<string, CardWeapon>;
  weaponById: Map<string, CardWeapon>;
  categories: SeoCategory[];
  publishableBuilds: CardLoadout[];
  labels: Map<string, string>;
}

export function buildSeoContext(
  weapons: CardWeapon[],
  loadouts: CardLoadout[],
  attachments: CardAttachment[],
): SeoContext {
  const slugById = buildWeaponSlugs(weapons);
  const weaponBySlug = new Map<string, CardWeapon>();
  const weaponById = new Map<string, CardWeapon>();
  for (const weapon of weapons) {
    weaponById.set(weapon.id, weapon);
    weaponBySlug.set(slugById.get(weapon.id)!, weapon);
  }

  const categoryMap = new Map<string, SeoCategory>();
  for (const weapon of weapons) {
    const slug = categorySlug(weapon);
    if (!slug || !weapon.type) continue;
    const category = categoryMap.get(slug) ?? { slug, name: weapon.type, weapons: [] };
    category.weapons.push(weapon);
    categoryMap.set(slug, category);
  }

  return {
    weapons,
    slugById,
    weaponBySlug,
    weaponById,
    categories: [...categoryMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    publishableBuilds: loadouts.filter(isPublishableBuild),
    labels: attachmentLabels(attachments),
  };
}

export function buildsForWeapon(ctx: SeoContext, weaponId: string): CardLoadout[] {
  return rankBuilds(ctx.publishableBuilds.filter((build) => usesWeapon(build, weaponId)));
}

export function weaponPath(slug: string): string {
  return `/meta/weapons/${slug}`;
}

export function bestLoadoutPath(slug: string): string {
  return `${weaponPath(slug)}/best-loadout`;
}

export function categoryPath(slug: string): string {
  return `/meta/categories/${slug}`;
}

export function findCategory(ctx: SeoContext, slug: string): SeoCategory | undefined {
  return ctx.categories.find((category) => category.slug === slugify(slug));
}

export function resolveWeapon(
  ctx: SeoContext,
  param: string,
): { weapon: CardWeapon; slug: string; matchedById: boolean } | null {
  const bySlug = ctx.weaponBySlug.get(param);
  if (bySlug) return { weapon: bySlug, slug: param, matchedById: false };
  const byId = ctx.weaponById.get(param);
  if (byId) return { weapon: byId, slug: ctx.slugById.get(byId.id)!, matchedById: true };
  return null;
}
