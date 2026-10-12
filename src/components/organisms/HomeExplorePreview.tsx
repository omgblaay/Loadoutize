import { Link, useNavigate } from "react-router";
import { LoadoutCard } from "@/components/organisms/LoadoutCard";
import type { CardWeapon, CardAttachment, CardTag } from "@/types/loadout";
import { WeaponCard } from "@/components/organisms/WeaponCard";
import { Button } from "@/components/atoms/Button";
import {
  ChevronRight,
  Heart,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import type { Loadout } from "@/types/loadout";
import { explorePath, loadoutPath } from "@/lib/routes";
import { Tag } from "../atoms/Tag";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  InstagramIcon,
  TiktokIcon,
  TwitchIcon,
  YoutubeIcon,
} from "@/assets/icons/socials";

const CREATOR_PLATFORMS = [
  {
    key: "youtube",
    label: "YouTube",
    description: "Video builds",
    icon: YoutubeIcon,
  },
  {
    key: "twitch",
    label: "Twitch",
    description: "Live setups",
    icon: TwitchIcon,
  },
  {
    key: "tiktok",
    label: "TikTok",
    description: "Quick loadouts",
    icon: TiktokIcon,
  },
  {
    key: "instagram",
    label: "Instagram",
    description: "Creator picks",
    icon: InstagramIcon,
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
    short: "SNP",
    aliases: ["snp", "sniper", "sniper rifle", "sniper rifles"],
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

  const topWeapons = (aliases: readonly string[]) =>
    weapons
      .filter((weapon) => {
        const categoryNames = [weapon.typeShort, weapon.type]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.toLowerCase());
        return categoryNames.some((value) => aliases.includes(value));
      })
      .map((weapon, index) => {
        const ratings = loadouts
          .filter(
            (loadout) =>
              loadout.gameId === selectedGame &&
              loadout.weapons?.[0]?.id === weapon.id &&
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
      .slice(0, 3)
      .map((entry) => entry.weapon);

  const topLoadouts = loadouts
    .filter((l) => l.gameId === selectedGame)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            to={`/${selectedGame}/meta/weapons`}
            className="font-medium hover:text-teritary text-white flex items-center gap-1 shrink-0"
          >
            <h2 className="text-sm">Top weapons</h2>
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TOP_WEAPON_CATEGORIES.map((category) => {
            const categoryWeapons = topWeapons(category.aliases);

            return (
              <div key={category.short} className="flex flex-col gap-3">
                <h3 className="text-xs text-secondary flex items-center gap-2">
                  <Tag>{category.short}</Tag>
                  {category.name}
                </h3>

                {categoryWeapons.length > 0 ? (
                  <ol className="flex flex-col gap-2">
                    {categoryWeapons.map((weapon, index) => {
                      const weaponCard = (
                        <WeaponCard
                          variant="compact"
                          weapon={weapon}
                          rank={index + 1}
                          hoverLift={index !== 0}
                          onSelect={() =>
                            navigate(
                              explorePath(selectedGame, {
                                weapon: weapon.name,
                              }),
                            )
                          }
                        />
                      );

                      return (
                        <li key={weapon.id}>
                          {index === 0 ? (
                            <BorderBeam
                              size="sm"
                              colorVariant="colorful"
                              borderRadius={12}
                              strength={0.58}
                              duration={3.2}
                              className="h-full transition-[transform,filter] duration-200 ease-out hover:-translate-y-1 hover:drop-shadow-[0_16px_18px_rgba(0,0,0,0.45)]"
                            >
                              {weaponCard}
                            </BorderBeam>
                          ) : (
                            weaponCard
                          )}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="text-sm text-teritary py-4">
                    No ranked {category.name.toLowerCase()} for {gameName} yet.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative mt-10  isolate overflow-hidden rounded-3xl border border-white/[0.1] bg-[#121011] p-5 sm:p-7 lg:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-28 size-80 rounded-full opacity-20 blur-[110px]"
        />

        <div className="relative grid items-center gap-7 lg:grid-cols-[minmax(0,0.82fr)_minmax(420px,1.18fr)] lg:gap-10">
          <div className="flex flex-col items-start">
            <h2 className="mt-4 max-w-lg text-2xl leading-tight sm:text-xl">
              See what your favourite creators actually run.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-secondary sm:text-base">
              Go from the video or stream straight to the complete build—every
              attachment, rating, and shareable code in one place.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate(`/${selectedGame}/community`)}
              className="group mt-6"
            >
              <Users className="size-4" />
              Browse all creators
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CREATOR_PLATFORMS.map(
              ({ key, label, description, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    navigate(`/${selectedGame}/community?social=${key}`)
                  }
                  className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.065]"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                    style={{ backgroundColor: accent }}
                  />
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-200 group-hover:scale-105">
                    <Icon size={24} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">
                      {label}
                    </span>
                    <span className="mt-1 block text-xs text-teritary">
                      {description}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-white/25 transition-all group-hover:translate-x-1 group-hover:text-white/75" />
                </button>
              ),
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            to={explorePath(selectedGame)}
            className="font-medium hover:text-teritary text-white flex items-center gap-1 shrink-0"
          >
            <h2 className="text-sm">Top Loadouts</h2>
            <ChevronRight className="size-4" />
          </Link>
        </div>
        {topLoadouts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
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
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 flex gap-8 text-center">
            <p className="text-teritary">
              No loadouts published yet. Be the first to create one!
            </p>
            <Button>Create new loadout</Button>
          </div>
        )}
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-white/[0.09] p-6 sm:p-8">
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

          <div className="flex gap-2 flex-1 h-full flex-col">
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
          </div>
        </div>
      </section>
    </div>
  );
}
