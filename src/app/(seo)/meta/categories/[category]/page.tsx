import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildsForWeapon, categoryPath, findCategory, weaponPath, bestLoadoutPath } from "@/lib/seo/context";
import { breadcrumbJsonLd, type Crumb } from "@/lib/seo/jsonld";
import { loadSeoContext } from "@/lib/seo/load";
import { isWeaponIndexable } from "@/lib/seo/logic";

export const revalidate = 3600;

interface Props {
  params: { category: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await loadSeoContext();
  const category = findCategory(ctx, params.category);
  if (!category) return { title: "Category not found | Loadoutize" };

  const url = categoryPath(category.slug);
  const title = `Best ${category.name} Loadouts MW4 | Loadoutize`;
  const description = `Compare the ${category.weapons.length} ${category.name.toLowerCase()} in Modern Warfare 4 by verified community builds, attachments, and top-rated setups.`;
  const indexable = category.weapons.some((weapon) => isWeaponIndexable(buildsForWeapon(ctx, weapon.id)));

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description },
    twitter: { card: "summary", title, description },
    robots: indexable ? undefined : { index: false, follow: true },
  };
}

export default async function CategoryPage({ params }: Props) {
  const ctx = await loadSeoContext();
  const category = findCategory(ctx, params.category);
  if (!category) notFound();

  const rows = category.weapons
    .map((weapon) => {
      const builds = buildsForWeapon(ctx, weapon.id);
      return { weapon, builds, slug: ctx.slugById.get(weapon.id)! };
    })
    .sort((a, b) => b.builds.length - a.builds.length || a.weapon.name.localeCompare(b.weapon.name));

  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: category.name, path: categoryPath(category.slug) },
  ];

  return (
    <main className="pb-24 sm:pb-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-8">
        <Breadcrumbs crumbs={crumbs} />

        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl sm:text-4xl uppercase leading-tight">{category.name} loadouts in MW4</h1>
          <p className="text-[#bebcbc]">
            {category.weapons.length} {category.name.toLowerCase()} in Modern Warfare 4.{" "}
            {rows.filter((row) => row.builds.length > 0).length} have verified community builds.
          </p>
        </header>

        <section aria-labelledby="weapons" className="flex flex-col gap-3">
          <h2 id="weapons" className="font-heading text-xl uppercase">Weapons</h2>
          <ul className="flex flex-col gap-2">
            {rows.map(({ weapon, builds, slug }) => (
              <li key={weapon.id} className="flex flex-col rounded-xl border border-white/[0.1] bg-[#100d10] p-4 hover:bg-[#1a1719] transition-colors">
                <Link href={weaponPath(slug)} className="font-medium text-[#efedf1] hover:text-white">
                  {weapon.name} loadouts
                </Link>
                <span className="text-sm text-[#8d898a]">
                  {builds.length} verified {builds.length === 1 ? "build" : "builds"}
                  {builds.length > 0 && (
                    <>
                      {" · "}
                      <Link href={bestLoadoutPath(slug)} className="hover:text-white">
                        best {weapon.name} loadout
                      </Link>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </main>
  );
}
