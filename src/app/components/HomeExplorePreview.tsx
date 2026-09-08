import { Link, useNavigate } from "react-router";
import { getGameColor } from "../utils/gameColors";
import { gameMeta, GAME_ORDER } from "../utils/games";
import { LoadoutCard, type CardWeapon, type CardAttachment, type CardTag } from "./ui/LoadoutCard";
import { WeaponCard } from "./ui/WeaponCard";
import { Button } from "./ui/button";
import { ChevronRight, Crosshair } from "lucide-react";
import type { Loadout } from "./Home";
import { explorePath } from "../utils/routes";

const TOP_WEAPON_MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Home page's preview of the Explore feed -- top weapons, recent loadouts, and a
 * "more games coming" teaser. Each section links out to the full Explore/Meta
 * pages rather than duplicating their filtering UI.
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

  const topWeapons = weapons.slice(0, 3);
  const recentLoadouts = loadouts
    .filter((l) => l.gameId === selectedGame)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-sans text-secondary">
            Top Weapons
          </h2>
          <Link
            to={`/${selectedGame}/meta`}
            className="font-medium text-teritary hover:text-[#fafafa] flex items-center gap-1 shrink-0"
          >
            View full Meta
            <ChevronRight className="size-4" />
          </Link>
        </div>
        {topWeapons.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {topWeapons.map((w, i) => (
              <div key={w.id} className="relative">
                {TOP_WEAPON_MEDALS[i] && (
                  <span
                    className="absolute -right-[-0.6rem] -bottom-[-1rem] z-10 text-2xl leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    aria-hidden="true"
                  >
                    {TOP_WEAPON_MEDALS[i]}
                  </span>
                )}
                <WeaponCard
                  weapon={w}
                  onSelect={() => navigate(explorePath(selectedGame, { weapon: w.name }))}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
            <p className="text-teritary">No weapon data for {gameName} yet.</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-sans text-secondary">
            Recent Loadouts</h2>
          <Link
            to={explorePath(selectedGame)}
            className="font-medium text-teritary hover:text-[#fafafa] flex items-center gap-1 shrink-0"
          >
            Explore loadouts
            <ChevronRight className="size-4" />
          </Link>
        </div>
        {recentLoadouts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {recentLoadouts.map((l, i) => (
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
            <Button>
              Create new loadout
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm text-secondary">Supported games</h2>
        <p className="text-teritary text-sm max-w-2xl">
          Modern Warfare 4 is live now. Loadouts for these titles are coming soon.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {GAME_ORDER.filter((id) => id !== "mw4").map((gameId) => {
            const meta = gameMeta[gameId];
            const Icon = meta?.icon ?? Crosshair;
            return (
              <Link
                key={gameId}
                to={explorePath(gameId)}
                className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 flex flex-col items-center gap-2 text-center hover:border-white/20 transition-colors"
              >
                <Icon className="w-6 h-6" style={{ color: getGameColor(gameId).primary }} />
                <span className="text-sm text-[#efedf1]">{meta?.name ?? gameId}</span>
                <span className="text-xs text-teritary">Coming soon</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
