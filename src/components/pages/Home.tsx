import type { Loadout } from "@/types/loadout";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { getGameColor } from "@/lib/gameColors";
import {
  gameMeta,
  GAME_ORDER,
  LAST_SELECTED_GAME_KEY,
  GAME_SELECTOR_ENABLED,
  LOCKED_GAME_ID,
} from "@/lib/games";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { AppLayout } from "@/components/templates/AppLayout";
import type { CardWeapon, CardAttachment, CardTag } from "@/types/loadout";
import { ChevronRight, Crown, Globe, Plus } from "lucide-react";
import { HomeExplorePreview } from "@/components/organisms/HomeExplorePreview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils";
import { Countdown } from "@/components/molecules/Countdown";
import { Button } from "@/components/atoms/Button";
import { NavIcon } from "@/components/atoms/NavIcon";
import gameLogo from "figma:asset/mw4_logo.png";
import { explorePath } from "@/lib/routes";

// Oct 23, 2026, 12:00 AM EDT (UTC-4)
const MW4_RELEASE_DATE = new Date("2026-10-23T04:00:00Z");

interface Game {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

function HomeSkeleton() {
  const block = "bg-white/[0.06]";

  return (
    <>
      <Skeleton className={cn("h-[340px] rounded-[28px]", block)} />

      {/* Primary actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className={cn("h-[180px] rounded-2xl", block)} />
        ))}
      </div>

      {/* Top weapons + popular loadouts */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className={cn("h-5 w-48", block)} />
            <Skeleton className={cn("h-5 w-28", block)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn("rounded-2xl h-[240px]", block)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className={cn("h-5 w-40", block)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn("rounded-2xl h-[220px]", block)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function Home() {
  usePageTitle("Loadoutize • Build, Rate, and Share Elite Loadouts");

  const [games, setGames] = useState<Game[]>([]);
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [weapons, setWeapons] = useState<CardWeapon[]>([]);
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [tags, setTags] = useState<CardTag[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>(
    GAME_SELECTOR_ENABLED ? "" : LOCKED_GAME_ID,
  );
  const [loading, setLoading] = useState(true);
  const [exploreCtaHovered, setExploreCtaHovered] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<
    "explore" | "meta" | "create" | null
  >(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games`,
      {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      },
    )
      .then((r) => r.json())
      .then((data) => data.games && setGames(data.games))
      .catch((error) => console.error("Error fetching games:", error));
  }, []);

  useEffect(() => {
    if (!GAME_SELECTOR_ENABLED) return;
    const gameParam = searchParams.get("game");
    if (gameParam) setSelectedGame(gameParam);
  }, [searchParams]);

  // Falls back to the last game the user picked elsewhere (e.g. on Explore),
  // then the first game in GAME_ORDER actually returned by the API, instead
  // of a hardcoded id that may no longer exist in the database (e.g. a
  // retired game).
  useEffect(() => {
    if (!GAME_SELECTOR_ENABLED) return;
    if (games.length === 0) return;
    setSelectedGame((current) => {
      if (current && games.some((g) => g.id === current)) return current;
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(LAST_SELECTED_GAME_KEY);
      } catch {
        // localStorage may be unavailable (e.g. private browsing).
      }
      if (stored && games.some((g) => g.id === stored)) return stored;
      const preferred = GAME_ORDER.find((id) => games.some((g) => g.id === id));
      return preferred ?? games[0].id;
    });
  }, [games]);

  // While the selector is disabled, only the locked game's loadouts are
  // needed — no reason to wait on or fetch the full games list.
  useEffect(() => {
    if (GAME_SELECTOR_ENABLED) return;
    fetchLoadouts([LOCKED_GAME_ID]);
  }, []);

  useEffect(() => {
    if (!GAME_SELECTOR_ENABLED) return;
    if (games.length === 0) return;
    fetchLoadouts(games.map((g) => g.id));
  }, [games]);

  useEffect(() => {
    if (!selectedGame) return;
    fetchWeapons(selectedGame);
    fetchAttachments(selectedGame);
    fetchTags(selectedGame);
  }, [selectedGame]);

  const fetchLoadouts = async (gameIds: string[]) => {
    try {
      const results = await Promise.all(
        gameIds.map((gameId) =>
          fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`,
            { headers: { Authorization: `Bearer ${publicAnonKey}` } },
          ).then((r) => r.json()),
        ),
      );
      setLoadouts(results.flatMap((data) => data.loadouts ?? []));
    } catch (error) {
      console.error("Error fetching loadouts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeapons = async (gameId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/weapons`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await response.json();
      if (data.weapons) setWeapons(data.weapons);
    } catch (error) {
      console.error("Error fetching weapons:", error);
    }
  };

  const fetchAttachments = async (gameId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/attachments`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await response.json();
      if (data.attachments) setAttachments(data.attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
    }
  };

  const fetchTags = async (gameId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/tags`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await response.json();
      if (data.tags) setTags(data.tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const activeGame = games.find((g) => g.id === selectedGame);
  const activeMeta = gameMeta[selectedGame];
  const activeName = activeGame?.name ?? activeMeta?.name ?? selectedGame;
  const activeShort = activeMeta?.short ?? activeName.slice(0, 3).toUpperCase();
  const accent = getGameColor(selectedGame).primary;

  if (loading) {
    return (
      <AppLayout selectedGame={selectedGame} onGameSelect={setSelectedGame}>
        <HomeSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout selectedGame={selectedGame} onGameSelect={setSelectedGame}>
      <section className="relative overflow-hidden lg:min-h-[350px]">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:gap-12">
          <div className="flex min-w-0 flex-col items-start">
            <img
              src={gameLogo}
              alt="Modern Warfare 4"
              className="w-44 object-contain sm:w-52"
            />
            <h1 className="mt-10 text-[clamp(1.2rem,4.5vw,4rem)] leading-[0.92] uppercase tracking-[-0.04em]">
              LOADOUTS DRIVEN BY COMMUNITY
            </h1>
            {/* <p className="text-sm uppercase tracking-[0.18em] text-teritary">
              Loadoutize Meta Vault
            </p> */}
            <p className="mt-5 max-w-xl text-base leading-7 text-secondary sm:text-lg">
              Discover community-built MW4 and Warzone loadouts. Compare ratings
              and the live meta. Follow creator setups, and share weapon codes
              or downloadable QR codes.
            </p>
          </div>

          {selectedGame === "mw4" && (
            <Countdown
              targetDate={MW4_RELEASE_DATE}
              label="Modern Warfare 4 releases on Friday 23 October 2026"
              accent={accent}
            />
          )}
        </div>
      </section>

      <section
        aria-label="Get started"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <button
          type="button"
          onClick={() => navigate(explorePath(selectedGame))}
          onPointerEnter={() => setHoveredAction("explore")}
          onPointerLeave={() => setHoveredAction(null)}
          onFocus={() => setHoveredAction("explore")}
          onBlur={() => setHoveredAction(null)}
          className="group relative min-h-[180px] overflow-hidden rounded-2xl border border-white/[0.1]  p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-[#1a1719] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <div
            aria-hidden="true"
            className="absolute -right-12 -top-16 size-44 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-25"
          />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-xl border border-white/[0.1] bg-black/25">
                <NavIcon
                  icon="explore"
                  flat={<Globe className="size-5" />}
                  active={false}
                  hovered={hoveredAction === "explore"}
                  size={24}
                />
              </span>
              <ChevronRight className="size-5 text-teritary transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
            </div>
            <div className="mt-auto pt-7">
              <p className="text-xl font-semibold text-white">
                Explore loadouts
              </p>
              <p className="mt-2 text-sm leading-6 text-teritary">
                Find community builds, creator setups, and your next favorite
                weapon.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/${selectedGame}/meta`)}
          onPointerEnter={() => setHoveredAction("meta")}
          onPointerLeave={() => setHoveredAction(null)}
          onFocus={() => setHoveredAction("meta")}
          onBlur={() => setHoveredAction(null)}
          className="group relative min-h-[180px] overflow-hidden rounded-2xl border border-white/[0.1] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-[#1a1719] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <div
            aria-hidden="true"
            className="absolute -right-12 -top-16 size-44 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-25"
          />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-xl border border-white/[0.1] bg-black/25">
                <NavIcon
                  icon="meta"
                  flat={<Crown className="size-5" />}
                  active={false}
                  hovered={hoveredAction === "meta"}
                  size={24}
                />
              </span>
              <ChevronRight className="size-5 text-teritary transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
            </div>
            <div className="mt-auto pt-7">
              <p className="text-xl font-semibold text-white">Explore meta</p>
              <p className="mt-2 text-sm leading-6 text-teritary">
                See the weapons and attachments climbing the community rankings.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/${selectedGame}/create`)}
          onPointerEnter={() => setHoveredAction("create")}
          onPointerLeave={() => setHoveredAction(null)}
          onFocus={() => setHoveredAction("create")}
          onBlur={() => setHoveredAction(null)}
          className="group relative min-h-[180px] overflow-hidden rounded-2xl border border-white/[0.1] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <div aria-hidden="true" className="bg-[#151314] absolute inset-0 " />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-xl border border-black/10 bg-black/10">
                <Plus className="size-6 transition-transform duration-300 group-hover:rotate-90" />
              </span>
              <ChevronRight className="size-5 opacity-55 transition-transform duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
            </div>
            <div className="mt-auto pt-7">
              <p className="text-xl font-semibold">Create new</p>
              <p className="mt-2 text-sm leading-6 opacity-70">
                Build a loadout, add your notes, and share it with the
                community.
              </p>
            </div>
          </div>
        </button>
      </section>

      <HomeExplorePreview
        selectedGame={selectedGame}
        loadouts={loadouts}
        weapons={weapons}
        attachments={attachments}
        tags={tags}
        accent={accent}
        gameShort={activeShort}
        gameName={activeName}
      />
    </AppLayout>
  );
}
