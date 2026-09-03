import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { getGameColor } from "../utils/gameColors";
import { gameMeta, GAME_ORDER, LAST_SELECTED_GAME_KEY, GAME_SELECTOR_ENABLED, LOCKED_GAME_ID } from "../utils/games";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { AppLayout } from "./AppLayout";
import { LoadoutCard, type CardLoadout, type CardWeapon, type CardAttachment, type CardTag } from "./ui/LoadoutCard";
import { ChevronRight, Crosshair, Flame, Sparkles, Youtube, Twitch, Video, Music2 } from "lucide-react";
import { WeaponCard } from "./ui/WeaponCard";
import { usePageTitle } from "../hooks/usePageTitle";
import { Skeleton } from "./ui/skeleton";
import { cn } from "./ui/utils";
import { Countdown } from "./ui/Countdown";
import { Button } from "./ui/button";
import gameLogo from "figma:asset/mw4_logo.png";
import { Container } from "./ui/container";

// Oct 23, 2026, 12:00 AM EDT (UTC-4)
const MW4_RELEASE_DATE = new Date("2026-10-23T04:00:00Z");

interface Loadout extends CardLoadout {
  gameId: string;
  createdAt: string;
}

interface Game {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

function GameSelectorSkeleton() {
  const block = "bg-white/[0.06]";

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className={cn("w-12 h-12 rounded-full", block)} />
          <Skeleton className={cn("h-8 w-64", block)} />
        </div>
        <Skeleton className={cn("h-5 w-80 max-w-full", block)} />
      </div>

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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className={cn("rounded-2xl aspect-square", block)} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className={cn("h-5 w-40", block)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className={cn("rounded-2xl h-[220px]", block)} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function GameSelector() {
  usePageTitle("Loadoutize • Build, Rate, and Share Elite Loadouts");

  const [games, setGames] = useState<Game[]>([]);
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [weapons, setWeapons] = useState<CardWeapon[]>([]);
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [tags, setTags] = useState<CardTag[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>(GAME_SELECTOR_ENABLED ? "" : LOCKED_GAME_ID);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
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
            { headers: { Authorization: `Bearer ${publicAnonKey}` } }
          ).then((r) => r.json())
        )
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
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
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
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
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
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
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
  const ActiveIcon = activeMeta?.icon ?? Crosshair;
  const activeLogoUrl = activeGame?.logoUrl;
  const accent = getGameColor(selectedGame).primary;

  const metaLoadouts = loadouts
    .filter((l) => l.gameId === selectedGame)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const topWeapons = weapons.slice(0, 4);

  if (loading) {
    return (
      <AppLayout selectedGame={selectedGame} onGameSelect={setSelectedGame}>
        <GameSelectorSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout selectedGame={selectedGame} onGameSelect={setSelectedGame}>
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">

              <img src={gameLogo} alt="Modern Warfare 4" className="w-56 object-contain" />
          <h1 className="text-[32px] leading-[40px] text-[#efedf1] font-semibold">
            Meta Vault
          </h1>
        </div>
        <p className="text-secondary text-lg max-w-2xl">
          Build the best Modern Warfare 4 loadouts, rate the community's top class setups, and share your own weapon
          builds and attachments with a link.
        </p>
      </div>

      {selectedGame === "mw4" && (
        <Countdown targetDate={MW4_RELEASE_DATE} label="Modern Warfare 4 releases on Friday 23 October 2026" accent={accent} />
      )}

      {/* Feature row */}
      {/*<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div
          className="relative rounded-2xl border border-white/[0.1] h-[296px] overflow-hidden flex flex-col items-center justify-center gap-6 px-6 py-6"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at top, rgba(102,0,252,0.35), transparent 65%), linear-gradient(#1b141b, #000143)",
            boxShadow: "0px 0px 32px 0px rgba(96,23,199,0.4)",
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              backgroundImage: "linear-gradient(160deg, #6214d3 0%, #a379de 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 0 30px rgba(245,245,250,0.14)",
            }}
          >
            <Sparkles className="w-8 h-8 text-[#fafafa]" />
          </div>
          <div className="text-center flex flex-col gap-2">
            <p className="text-[16px] text-[#f7f6f6] font-semibold">Quick add with AI</p>
            <p className="text-[14px] text-[#fafafa]/50">
              Take a picture of your loadout.
              <br />
              It will appear on your profile with ease.
            </p>
          </div>
          <button
            className="w-full h-[52px] rounded-xl flex items-center justify-center gap-2 text-[#fafafa]"
            style={{ background: "#6600fc", boxShadow: "inset 0 4px 20px rgba(255,255,255,0.24)" }}
          >
            <Sparkles className="w-4 h-4" />
            <span>Try now</span>
            <span className="text-[#bebcbc]">For Free</span>
          </button>
        </div> */}

        <Container className="flex-row">

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center text-teritary gap-2">
            <Youtube className="w-6 h-6" />
            <Twitch className="w-6 h-6" />
            <Video className="w-6 h-6" />
            <Music2 className="w-6 h-6" />
          </div>
          From your favourite Streamers &amp; Content Creators 
          <p className="text-[14px] text-[#bebcbc] w-[320px] max-w-full flex-1">
            Check what they are currently running in-game for the best outcome.
          </p>
          </div>
          <Button
            onClick={() => navigate(`/${selectedGame}/explore`)}
            variant="outline"
            >
            Explore setups
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Container>


      {/* Top weapons + popular loadouts */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="">
              Top Weapons
            </h2>
            <Link
              to={`/${selectedGame}/meta`}
              className="text-[14px] text-teritary hover:text-[#fafafa] flex items-center gap-1 shrink-0"
            >
              View full Meta
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {topWeapons.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {topWeapons.map((w) => (
                <WeaponCard
                  key={w.id}
                  weapon={w}
                  onSelect={() => navigate(`/${selectedGame}/explore?weapon=${encodeURIComponent(w.name)}`)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
              <p className="text-teritary">No weapon data for {activeName} yet.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h2>Recent Loadouts</h2>
          </div>
          {metaLoadouts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {metaLoadouts.map((l, i) => (
                <LoadoutCard
                  key={l.id}
                  loadout={l}
                  weapons={weapons}
                  attachments={attachments}
                  tags={tags}
                  accent={accent}
                  gameShort={activeShort}
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
          <h2>Supported games</h2>
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
                  to={`/${gameId}/explore`}
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
    </AppLayout>
  );
}
