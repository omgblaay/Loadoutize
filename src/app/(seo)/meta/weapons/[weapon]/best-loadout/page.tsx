import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { LOCKED_GAME_ID } from "@/lib/games";
import { loadoutPath } from "@/lib/routes";
import {
  bestLoadoutPath,
  buildsForWeapon,
  categoryPath,
  findCategory,
  resolveWeapon,
  weaponPath,
} from "@/lib/seo/context";
import { breadcrumbJsonLd, videoJsonLd, type Crumb } from "@/lib/seo/jsonld";
import { loadSeoContext } from "@/lib/seo/load";
import {
  buildSummary,
  isBuildIndexable,
  ratingLine,
} from "@/lib/seo/logic";

export const revalidate = 3600;

interface Props {
  params: { weapon: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await loadSeoContext();
  const resolved = resolveWeapon(ctx, params.weapon);
  if (!resolved) return { title: "Loadout not found | Loadoutize" };

  const { weapon, slug } = resolved;
  const top = buildsForWeapon(ctx, weapon.id)[0];
  if (!top) return { title: `Best ${weapon.name} loadout | Loadoutize` };

  const title = `Best ${weapon.name} Loadout MW4: ${top.name} | Loadoutize`;
  const summary = buildSummary(top, weapon.id, ctx.labels);
  const description = `Top community ${weapon.name} loadout for Modern Warfare 4 (${summary}). ${ratingLine(top)}.`;
  const url = bestLoadoutPath(slug);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title, description },
    twitter: { card: "summary", title, description },
    robots: isBuildIndexable(top) ? undefined : { index: false, follow: true },
  };
}

export default async function BestLoadoutPage({ params }: Props) {
  const ctx = await loadSeoContext();
  const resolved = resolveWeapon(ctx, params.weapon);
  if (!resolved) notFound();
  if (resolved.matchedById) permanentRedirect(bestLoadoutPath(resolved.slug));

  const { weapon, slug } = resolved;
  const builds = buildsForWeapon(ctx, weapon.id);
  const top = builds[0];
  if (!top) notFound();

  const category = weapon.type ? findCategory(ctx, weapon.type) : undefined;
  const others = builds.slice(1, 10);
  const weaponEntry = top.weapons.find((entry) => String(entry.id) === weapon.id);
  const slots = Object.entries(weaponEntry?.attachments ?? {});
  const rationale = (top.description ?? "").trim();
  const showRationale = rationale.length > 0 && rationale !== top.name.trim();
  const url = bestLoadoutPath(slug);

  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    ...(category ? [{ name: category.name, path: categoryPath(category.slug) }] : []),
    { name: weapon.name, path: weaponPath(slug) },
    { name: "Best loadout", path: url },
  ];

  const video = top.video
    ? videoJsonLd(top.video, {
        name: top.name,
        description: rationale || `${weapon.name} loadout for Modern Warfare 4`,
        uploadDate: top.createdAt ?? "",
        url,
      })
    : null;

  return (
    <main className="pb-24 sm:pb-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-8">
        <Breadcrumbs crumbs={crumbs} />

        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl sm:text-4xl uppercase leading-tight">Best {weapon.name} loadout in MW4</h1>
          <p className="text-[#8d898a]">
            {top.name}
            {top.authorNickname ? (
              <>
                {" "}by <Link href={`/u/${top.authorNickname}`} className="underline underline-offset-2">{top.authorNickname}</Link>
              </>
            ) : null}
          </p>
        </header>

        <section aria-labelledby="build" className="flex flex-col gap-3">
          <h2 id="build" className="font-heading text-xl uppercase">Attachments</h2>
          {slots.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {slots.map(([slot, name]) => (
                <li key={slot} className="flex justify-between border-b border-white/10 py-1">
                  <span className="text-[#8d898a]">{slot}</span>
                  <span>{ctx.labels.get(name) ?? name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#bebcbc]">This build lists no attachments for the {weapon.name}.</p>
          )}
          <p className="text-sm text-[#8d898a]">Rating: {ratingLine(top)}</p>
          <Link href={loadoutPath(LOCKED_GAME_ID, top.id, top.contentType)} className="self-start h-11 inline-flex items-center px-5 rounded-xl bg-[#fafafa] text-[#161414] font-medium">
            Open the full build
          </Link>
        </section>

        {showRationale && (
          <section aria-labelledby="rationale" className="flex flex-col gap-2">
            <h2 id="rationale" className="font-heading text-xl uppercase">Build notes from the author</h2>
            <p className="whitespace-pre-line text-[#bebcbc]">{rationale}</p>
          </section>
        )}

        {top.video && (
          <section aria-labelledby="video" className="flex flex-col gap-2">
            <h2 id="video" className="font-heading text-xl uppercase">Video</h2>
            <a href={top.video.url} rel="noopener noreferrer nofollow" target="_blank" className="underline underline-offset-2">
              {top.video.title ?? "Watch the build"}
            </a>
          </section>
        )}

        {others.length > 0 && (
          <section aria-labelledby="other" className="flex flex-col gap-3">
            <h2 id="other" className="font-heading text-xl uppercase">Other {weapon.name} builds</h2>
            <ul className="flex flex-col gap-2">
              {others.map((build) => (
                <li key={build.id}>
                  <Link href={loadoutPath(LOCKED_GAME_ID, build.id, build.contentType)} className="underline underline-offset-2">
                    {build.name}
                  </Link>
                  <span className="text-sm text-[#8d898a]"> · {ratingLine(build)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p>
          <Link href={weaponPath(slug)} className="underline underline-offset-2">
            Back to all {weapon.name} loadouts
          </Link>
        </p>
      </div>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      {video && <JsonLd data={video} />}
    </main>
  );
}
