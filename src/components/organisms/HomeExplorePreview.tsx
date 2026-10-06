import { Link, useNavigate } from "react-router";
import { LoadoutCard } from "@/components/organisms/LoadoutCard";
import type { CardWeapon, CardAttachment, CardTag } from "@/types/loadout";
import { WeaponCard } from "@/components/organisms/WeaponCard";
import { Button } from "@/components/atoms/Button";
import { ChevronRight, Heart, MessageCircle, Wrench } from "lucide-react";
import type { Loadout } from "@/types/loadout";
import { explorePath } from "@/lib/routes";
import { Tag } from "../atoms/Tag";
import { BorderBeam } from "@/components/ui/border-beam";

const TOP_WEAPON_MEDALS = ["🥇", "🥈", "🥉"];
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
          <h2 className="font-sans text-secondary">Top weapons</h2>
          <Link
            to={`/${selectedGame}/meta`}
            className="font-medium text-teritary hover:text-[#fafafa] flex items-center gap-1 shrink-0"
          >
            View full Meta
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TOP_WEAPON_CATEGORIES.map((category) => {
            const categoryWeapons = topWeapons(category.aliases);

            return (
              <div key={category.short} className="flex flex-col gap-3">
                <h3 className="font-sans text-secondary flex items-center gap-2">
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
                          className="pr-10"
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
                        <li key={weapon.id} className="relative">
                          <span
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-xl leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pointer-events-none"
                            aria-label={`Rank ${index + 1}`}
                          >
                            {TOP_WEAPON_MEDALS[index]}
                          </span>
                          {index === 0 ? (
                            <BorderBeam
                              size="sm"
                              colorVariant="colorful"
                              borderRadius={12}
                              strength={0.58}
                              duration={3.2}
                              className="h-full"
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

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-sans text-secondary">Top Loadouts</h2>
          <Link
            to={explorePath(selectedGame)}
            className="font-medium text-teritary hover:text-[#fafafa] flex items-center gap-1 shrink-0"
          >
            Explore loadouts
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
                to={`/${l.gameId}/l/${l.id}`}
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
            <h2 className="text-lg leading-tight text-[#fafafa]">
              Why I made Loadoutize
            </h2>
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
