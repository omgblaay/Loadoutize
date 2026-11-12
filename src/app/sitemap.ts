import type { MetadataRoute } from "next";
import { buildsForWeapon, bestLoadoutPath, categoryPath, weaponPath } from "@/lib/seo/context";
import { SITE_URL } from "@/lib/seo/jsonld";
import { loadSeoContext } from "@/lib/seo/load";
import { isBuildIndexable, isWeaponIndexable } from "@/lib/seo/logic";

// Lists only pages whose robots meta is indexable, so the sitemap never
// contradicts a noindex tag. Legacy SPA routes are left out until their
// canonicals point at themselves.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ctx = await loadSeoContext();
  const entries: MetadataRoute.Sitemap = [];

  for (const category of ctx.categories) {
    const indexableWeapons = category.weapons.filter((weapon) =>
      isWeaponIndexable(buildsForWeapon(ctx, weapon.id)),
    );
    if (indexableWeapons.length === 0) continue;
    entries.push({ url: `${SITE_URL}${categoryPath(category.slug)}` });
  }

  for (const weapon of ctx.weapons) {
    const builds = buildsForWeapon(ctx, weapon.id);
    if (!isWeaponIndexable(builds)) continue;
    const slug = ctx.slugById.get(weapon.id)!;
    entries.push({ url: `${SITE_URL}${weaponPath(slug)}`, lastModified: builds[0].createdAt });
    if (isBuildIndexable(builds[0])) {
      entries.push({ url: `${SITE_URL}${bestLoadoutPath(slug)}`, lastModified: builds[0].createdAt });
    }
  }

  return entries;
}
