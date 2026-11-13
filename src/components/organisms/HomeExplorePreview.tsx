import { Link, useNavigate } from "react-router";
import { LoadoutCard } from "@/components/organisms/LoadoutCard";
import type { CardWeapon, CardAttachment, CardTag } from "@/types/loadout";
import { WeaponImage } from "@/components/molecules/WeaponImage";
import { Button } from "@/components/atoms/Button";
import {
  ChevronRight,
  Heart,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import type { Loadout } from "@/types/loadout";
import {
  explorePath,
  gamePath,
  loadoutPath,
  weaponMetaListPath,
  weaponMetaPath,
} from "@/lib/routes";
import youtubePlatformIcon from "@/assets/platforms/youtube.webp";
import twitchPlatformIcon from "@/assets/platforms/twitch.webp";
import tiktokPlatformIcon from "@/assets/platforms/tiktok.webp";
import instagramPlatformIcon from "@/assets/platforms/instagram.webp";
import { Tag } from "../atoms/Tag";

const CREATOR_PLATFORMS = [
  {
    key: "youtube",
    label: "YouTube",
    icon: youtubePlatformIcon,
  },
  {
    key: "twitch",
    label: "Twitch",
    icon: twitchPlatformIcon,
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: tiktokPlatformIcon,
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: instagramPlatformIcon,
  },
] as const;
const TOP_WEAPON_CATEGORIES = [
  {
    name: "Assault Rifles",
    short: "AR",
    aliases: ["ar", "assault rifle", "assault rifles"],
  },
  {
    name: "SMGs",
    short: "SMG",
    aliases: ["smg", "smgs", "submachine gun", "submachine guns"],
  },
  {
    name: "Sniper Rifles",
    short: "SR",
    aliases: ["sr", "snp", "sniper", "sniper rifle", "sniper rifles"],
  },
] as const;

/**
 * Home page's preview of the Explore feed. Each data section links out to the
 * full Explore/Meta pages rather than duplicating their filtering UI.
 */
export function HomeExplorePreview({
  selectedGame,
  loadouts,
  weapons,
  attachments,
  tags,
  accent,
  gameShort,
  gameName,
}: {
  selectedGame: string;
  loadouts: Loadout[];
  weapons: CardWeapon[];
  attachments: CardAttachment[];
  tags: CardTag[];
  accent: string;
  gameShort: string;
  gameName: string;
}) {
  const navigate = useNavigate();

  const topWeapons = (aliases: readonly string[]) => {
    const gameLoadouts = loadouts.filter(
      (loadout) => loadout.gameId === selectedGame,
    );

    return weapons
      .filter((weapon) => {
        const categoryNames = [weapon.typeShort, weapon.type]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.toLowerCase());
        return categoryNames.some((value) => aliases.includes(value));
      })
      .map((weapon, index) => {
        const weaponLoadouts = gameLoadouts.filter(
          (loadout) => loadout.weapons?.[0]?.id === weapon.id,
        );
        const ratings = weaponLoadouts
          .filter(
            (loadout) =>
              loadout.likes + loadout.dislikes >= 5 &&
              loadout.ratingPercent != null,
          )
          .map((loadout) => loadout.ratingPercent as number);

        return {
          weapon,
          rating:
            ratings.length > 0
              ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
              : null,
          index,
        };
      })
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.index - b.index)
      .slice(0, 3);
  };

  const topLoadouts = loadouts
    .filter((l) => l.gameId === selectedGame)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return (
    <div className="flex flex-col mt-4 gap-6">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            to={weaponMetaListPath(selectedGame)}
            className="font-medium hover:text-teritary text-white flex items-center gap-1 shrink-0"
          >
            <h2 className="text-sm">Top weapons</h2>
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TOP_WEAPON_CATEGORIES.map((category) => {
            const categoryWeapons = topWeapons(category.aliases);
            const categoryName =
              categoryWeapons[0]?.weapon.type ?? category.name;

            return (
              <section
                key={category.short}
                className="overflow-hidden rounded-2xl border border-white/[0.07]"
              >
                <button
                  type="button"
                  onClick={() =>
                    navigate(weaponMetaListPath(selectedGame, categoryName))
                  }
                  className="group/category flex w-full items-center gap-3 border-b border-white/[0.07] px-4 py-3 text-left transition-colors hover:bg-white/[0.035]"
                >
                  <Tag>{category.short}</Tag>
                  <h3 className="min-w-0 flex-1 truncate text-sm font-sans">
                    {category.name}
                  </h3>
                  <ChevronRight className="size-4 shrink-0 text-white/25 transition-transform group-hover/category:translate-x-0.5 group-hover/category:text-white/70" />
                </button>

                {categoryWeapons.length > 0 ? (
                  <ol className="divide-y divide-white/[0.06]">
                    {categoryWeapons.map((entry, index) => (
                      <li key={entry.weapon.id}>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              weaponMetaPath(
                                selectedGame,
                                String(entry.weapon.id),
                              ),
                            )
                          }
                          className="group flex w-full items-center gap-3 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:bg-white/[0.035]"
                        >
                          <span
                            className="w-6 shrink-0 text-center text-xs text-teritary"
                            aria-label={`Rank ${index + 1}`}
                          >
                            #{index + 1}
                          </span>
                          <div className="relative shrink-0 w-24 sm:w-30">
                            <WeaponImage
                              imageUrl={entry.weapon.imageUrl}
                              alt={entry.weapon.name}
                            />
                          </div>

                          <span className="min-w-0 flex-1 truncate text-sm text-secondary">
                            {entry.weapon.name}
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="bg-white/[0.02] px-4 py-6 text-sm text-teritary">
                    No ranked {category.name.toLowerCase()} for {gameName} yet.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            to={explorePath(selectedGame)}
            className="font-medium hover:text-teritary text-white flex items-center gap-1 shrink-0"
          >
            <h2 className="text-sm">Top Weapon Configs</h2>
            <ChevronRight className="size-4" />
          </Link>
        </div>
        {topLoadouts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {topLoadouts.map((l, i) => (
              <LoadoutCard
                key={l.id}
                loadout={l}
                weapons={weapons}
                attachments={attachments}
                tags={tags}
                accent={accent}
                gameShort={gameShort}
                index={i}
                to={loadoutPath(
                  l.gameId,
                  l.id,
                  l.contentType ?? "weapon_config",
                )}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 py-10 text-center sm:py-16">
            <p className="text-teritary">
              No weapon configs published yet. Be the first to create one!
            </p>
            <Button onClick={() => navigate(gamePath(selectedGame, "create"))}>
              Create weapon config
            </Button>
          </div>
        )}
      </div>

      <section className="relative mt-4 isolate overflow-hidden rounded-xl bg-[#121011] p-5 sm:p-5 lg:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-28 size-80 rounded-full opacity-20 blur-[110px]"
        />

        <div className="relative flex items-center gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(420px,1.18fr)] lg:gap-10">
          <div className="flex flex-col flex-1 items-start">
            <h2 className="mt-4 max-w-lg text-2xl leading-tight sm:text-xl">
              See what your favourite creators actually run
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-secondary sm:text-base">
              Go from the video or stream straight to the complete build—every
              attachment, rating, and shareable code in one place
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CREATOR_PLATFORMS.map(({ key, label, icon }) => (
                <Link
                  key={key}
                  to={`${gamePath(selectedGame, "community")}?social=${key}`}
                  className="group relative flex min-h-16 items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.09] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.065] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 bg-gray-600"
                  />
                  <img
                    src={icon.src}
                    alt=""
                    className="size-6 shrink-0 object-contain"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">
                      {label} creators
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-white/25 transition-all group-hover:translate-x-1 group-hover:text-white/75" />
                </Link>
              ))}
              <Link
                to={gamePath(selectedGame, "community")}
                className="group relative flex min-h-16 items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.09] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.065] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:col-span-2"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 bg-gray-600"
                />
                <Users className="size-6 shrink-0 text-white" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-white">
                    Browse all creators
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-white/25 transition-all group-hover:translate-x-1 group-hover:text-white/75" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden ">
        <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full opacity-15 blur-[90px]" />

        <div className="relative flex gap-8">
          <div>
            <h2 className="text-lg leading-tight ">Why I made Loadoutize</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-secondary sm:text-base sm:leading-7">
              I got tired of opening ten tabs just to find one useful build. So
              I started making the place I wanted as a player: clear loadouts,
              honest community ratings, and no buried answers.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-teritary">
              There is no studio behind Loadoutize—it is a one-person project,
              built one update at a time and shaped by the people who use it.
            </p>
          </div>

          {/* <div className="flex gap-2 flex-1 h-full flex-col">
            {[
              { icon: MessageCircle, label: "Guided by your feedback" },
              { icon: Heart, label: "Made for the community" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center flex-1 gap-3 rounded-xl border border-white/[0.07] bg-black/15 px-4 py-3"
              >
                <Icon className="size-4 shrink-0 text-secondary" />
                <span className="text-sm text-secondary">{label}</span>
              </div>
            ))}
          </div> */}
        </div>
      </section>
    </div>
  );
}
