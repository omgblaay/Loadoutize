import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { LOCKED_GAME_ID } from "@/lib/games";
import {
  bestLoadoutPath,
  buildsForWeapon,
  categoryPath,
  findCategory,
  resolveWeapon,
  weaponPath,
} from "@/lib/seo/context";
import { breadcrumbJsonLd, type Crumb } from "@/lib/seo/jsonld";
import { loadSeoContext } from "@/lib/seo/load";
import {
  attachmentUsage,
  buildSummary,
  isWeaponIndexable,
  ratingLine,
} from "@/lib/seo/logic";
import { explorePath, loadoutPath } from "@/lib/routes";

export const revalidate = 3600;

interface Props {
  params: { weapon: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await loadSeoContext();
  const resolved = resolveWeapon(ctx, params.weapon);
  if (!resolved) return { title: "Weapon not found | Loadoutize" };

  const { weapon, slug } = resolved;
  const builds = buildsForWeapon(ctx, weapon.id);
  const category = weapon.type ? findCategory(ctx, weapon.type)?.name : null;
  const title = `${weapon.name} MW4 Loadouts & Attachments | Loadoutize`;
  const description =
    builds.length > 0
      ? `${builds.length} verified community ${weapon.name} builds for Modern Warfare 4${category ? ` in ${category}` : ""}: the attachments players use most and the top-rated setups.`
      : `Community ${weapon.name} builds and attachments for Modern Warfare 4${category ? ` in ${category}` : ""}. Verified builds are added as players vote on them.`;

  return {
    title,
    description,
    alternates: { canonical: weaponPath(slug) },
    openGraph: { type: "website", url: weaponPath(slug), title, description },
    twitter: { card: "summary", title, description },
    robots: isWeaponIndexable(builds) ? undefined : { index: false, follow: true },
  };
}

export default async function WeaponPage({ params }: Props) {
  const ctx = await loadSeoContext();
  const resolved = resolveWeapon(ctx, params.weapon);
  if (!resolved) notFound();
  if (resolved.matchedById) permanentRedirect(weaponPath(resolved.slug));

  const { weapon, slug } = resolved;
  const builds = buildsForWeapon(ctx, weapon.id);
  const category = weapon.type ? findCategory(ctx, weapon.type) : undefined;
  const usage = attachmentUsage(builds, weapon.id, ctx.labels);
  const relatedWeapons = (category?.weapons ?? [])
    .filter((entry) => entry.id !== weapon.id)
    .map((entry) => ({
      weapon: entry,
      builds: buildsForWeapon(ctx, entry.id).length,
    }))
    .sort((a, b) => b.builds - a.builds || a.weapon.name.localeCompare(b.weapon.name))
    .slice(0, 6);

  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    ...(category ? [{ name: category.name, path: categoryPath(category.slug) }] : []),
    { name: weapon.name, path: weaponPath(slug) },
  ];

  return (
    <main className="pb-24 sm:pb-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-8">
        <Breadcrumbs crumbs={crumbs} />

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {weapon.imageUrl && (
            <Image
              src={weapon.imageUrl}
              alt={`${weapon.name} weapon in Modern Warfare 4`}
              width={240}
              height={120}
              className="h-auto w-60 object-contain saturate-0"
              priority
            />
          )}
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-3xl sm:text-4xl uppercase leading-tight">{weapon.name} loadouts in MW4</h1>
            {category && (
              <p className="text-[#8d898a]">
                {category.name} · <Link href={categoryPath(category.slug)} className="underline underline-offset-2">all {category.name.toLowerCase()}</Link>
              </p>
            )}
          </div>
        </header>

        <section aria-labelledby="community-data" className="flex flex-col gap-2">
          <h2 id="community-data" className="font-heading text-xl uppercase">Community data</h2>
          {builds.length > 0 ? (
            <p className="text-[#bebcbc]">
              {builds.length} verified community {builds.length === 1 ? "build uses" : "builds use"} the {weapon.name}. Attachment counts below
              come only from those builds, not from the whole player base.
            </p>
          ) : (
            <p className="text-[#bebcbc]">
              There are no verified community builds for the {weapon.name} yet. Browse all builds in{" "}
              <Link href={explorePath(LOCKED_GAME_ID, { weapon: weapon.id })} className="underline underline-offset-2">
                Explore
              </Link>
              .
            </p>
          )}
        </section>

        {usage.total > 0 && (
          <section aria-labelledby="attachments" className="flex flex-col gap-3">
            <h2 id="attachments" className="font-heading text-xl uppercase">Attachments in community builds</h2>
            {Object.entries(usage.slots).map(([slot, entries]) => (
              <div key={slot}>
                <h3 className="font-heading text-xs uppercase tracking-wide text-[#8d898a]">{slot}</h3>
                <ul className="mt-1 flex flex-col gap-1">
                  {entries.map((entry) => (
                    <li key={entry.label} className="flex justify-between border-b border-white/10 py-1">
                      <span>{entry.label}</span>
                      <span className="text-[#8d898a]">
                        in {entry.count} of {usage.total} {usage.total === 1 ? "build" : "builds"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {builds.length > 0 && (
          <section aria-labelledby="builds" className="flex flex-col gap-3">
            <h2 id="builds" className="font-heading text-xl uppercase">Top builds</h2>
            <ol className="flex flex-col gap-3">
              {builds.map((build) => (
                <li key={build.id} className="rounded-xl border border-white/[0.1] bg-[#100d10] p-4 hover:bg-[#1a1719] transition-colors">
                  <Link
                    href={loadoutPath(LOCKED_GAME_ID, build.id, build.contentType)}
                    className="font-medium text-[#efedf1] hover:text-white"
                  >
                    {build.name}
                  </Link>
                  <p className="text-sm text-[#8d898a]">
                    {build.authorNickname ? (
                      <>
                        by <Link href={`/u/${build.authorNickname}`} className="underline underline-offset-2">{build.authorNickname}</Link>
                        {" · "}
                      </>
                    ) : null}
                    {ratingLine(build)}
                  </p>
                  <p className="mt-1 text-sm text-[#bebcbc]">{buildSummary(build, weapon.id, ctx.labels)}</p>
                </li>
              ))}
            </ol>
            <Link href={bestLoadoutPath(slug)} className="font-medium text-[#efedf1] hover:text-white">
              See the top {weapon.name} build
            </Link>
          </section>
        )}

        {relatedWeapons.length > 0 && (
          <section aria-labelledby="related" className="flex flex-col gap-3">
            <h2 id="related" className="font-heading text-xl uppercase">
              More {category?.name ?? "weapons"} loadouts
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {relatedWeapons.map(({ weapon: related, builds: count }) => (
                <li key={related.id}>
                  <Link
                    href={weaponPath(ctx.slugById.get(related.id)!)}
                    className="text-[#efedf1] hover:text-white"
                  >
                    {related.name} loadouts
                  </Link>
                  <span className="text-sm text-[#8d898a]"> · {count} verified {count === 1 ? "build" : "builds"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </main>
  );
}
