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
import { ChevronRight } from "lucide-react";
import {
  YoutubeIcon,
  TwitchIcon,
  TiktokIcon,
  InstagramIcon,
} from "@/assets/icons/socials/index";
import { HomeExplorePreview } from "@/components/organisms/HomeExplorePreview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils";
import { Countdown } from "@/components/molecules/Countdown";
import { Button } from "@/components/atoms/Button";
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

      {/* Feature row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className={cn("rounded-2xl h-[296px]", block)} />
        <Skeleton className={cn("rounded-2xl h-[296px]", block)} />
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
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-teritary sm:text-xs">
              Loadoutize Meta Vault
            </p>
            <h1 className="mt-3 max-w-2xl text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.92] uppercase tracking-[-0.04em]">
              Build smarter from day one
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-secondary sm:text-lg">
              Discover community-built Modern Warfare 4 loadouts, compare
              ratings and the live meta, follow creator setups, and share weapon
              codes or downloadable QR codes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button onClick={() => navigate(explorePath(selectedGame))}>
                Explore loadouts
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/${selectedGame}/create`)}
              >
                Create a loadout
              </Button>
            </div>
          </div>

          {selectedGame === "mw4" && (
            <Countdown
              targetDate={MW4_RELEASE_DATE}
              label="Modern Warfare 4 releases on Friday 23 October 2026"
              accent={accent}
            />
          )}
        </div>
        <div className="mt-8 grid gap-5 rounded-2xl bg-white/[0.035] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-teritary">
              Creator loadouts
            </p>
            <h2 className="mt-2 text-lg  sm:text-xl">
              See what your favourite creators actually run.
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-secondary">
              Jump straight to verified builds shared by streamers and content
              creators across the platforms you follow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                navigate(`/${selectedGame}/community?social=youtube`)
              }
              className="opacity-75 transition-opacity hover:opacity-100"
              aria-label="Find YouTube creators"
            >
              <YoutubeIcon size={22} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                navigate(`/${selectedGame}/community?social=twitch`)
              }
              className="opacity-75 transition-opacity hover:opacity-100"
              aria-label="Find Twitch creators"
            >
              <TwitchIcon size={22} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                navigate(`/${selectedGame}/community?social=tiktok`)
              }
              className="opacity-75 transition-opacity hover:opacity-100"
              aria-label="Find TikTok creators"
            >
              <TiktokIcon size={22} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                navigate(`/${selectedGame}/community?social=instagram`)
              }
              className="opacity-75 transition-opacity hover:opacity-100"
              aria-label="Find Instagram creators"
            >
              <InstagramIcon size={22} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(`/${selectedGame}/community`)}
              className="group ml-auto sm:ml-2"
            >
              Browse all creators
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
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
