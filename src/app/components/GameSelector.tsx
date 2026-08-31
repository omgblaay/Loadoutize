import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { getGameColor } from "../utils/gameColors";
import { gameMeta, GAME_ORDER, LAST_SELECTED_GAME_KEY, GAME_SELECTOR_ENABLED, LOCKED_GAME_ID } from "../utils/games";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { AppLayout } from "./AppLayout";
import { LoadoutCard, type CardLoadout, type CardWeapon, type CardAttachment, type CardTag } from "./ui/LoadoutCard";
import { ChevronRight, Crosshair, Flame, Sparkles, Youtube, Twitch, Video, Music2 } from "lucide-react";
import { WeaponImage } from "./ui/WeaponImage";

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

export function GameSelector() {
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

  const topWeapons = weapons.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0909]">
        <div className="text-[#efedf1]">Loading…</div>
      </div>
    );
  }

  return (
    <AppLayout selectedGame={selectedGame} onGameSelect={setSelectedGame}>
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center">
            {activeLogoUrl ? (
              <img src={activeLogoUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <ActiveIcon className="w-12 h-12 text-[#efedf1]" />
            )}
          </div>
          <h1 className="text-[32px] leading-[40px] text-[#efedf1] font-semibold">
            {activeName} Meta Vault
          </h1>
        </div>
        <p className="text-[16px] leading-[24px] text-[#bebcbc]">
          Build a class, share a link, watch the community rate it.
        </p>
      </div>

      {/* Feature row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
            <Sparkles className="w-8 h-8 text-white" />
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
        </div>

        <div className="relative bg-[#201e1f] rounded-2xl h-[296px] overflow-hidden p-6 flex flex-col gap-4">
          <div className="flex gap-4 text-[#aea6a8]">
            <Youtube className="w-6 h-6" />
            <Twitch className="w-6 h-6" />
            <Video className="w-6 h-6" />
            <Music2 className="w-6 h-6" />
          </div>
          <div className="text-[20px] text-[#fafafa]">From your favourite Streamers &amp; Content Creators</div>
          <p className="text-[14px] text-[#bebcbc] w-[320px] max-w-full flex-1">
            Check what they are currently running in-game for the best outcome.
          </p>
          <button
            onClick={() => navigate(`/${selectedGame}/explore`)}
            className="bg-[#2a2829] border border-white/[0.08] rounded-xl h-[52px] px-4 self-start flex items-center gap-2.5 text-[#fafafa]"
          >
            <span>Explore setups</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top weapons + popular loadouts */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <p className="text-[16px] text-[#fafafa] font-semibold flex items-center gap-2">
            <Flame className="w-4 h-4" style={{ color: accent }} />
            Top 5 weapons
          </p>
          {topWeapons.length > 0 ? (
            <div className="flex flex-row flex-wrap gap-4">
              {topWeapons.map((w) => (
                <button
                  key={w.id}
                  onClick={() => navigate(`/${selectedGame}/explore?weapon=${encodeURIComponent(w.name)}`)}
                  className="flex-1 max-w-sm min-w-xs rounded-xl border border-white/[0.18] p-4 flex flex-col items-center gap-3 text-left hover:border-white/[0.32]"
                  style={{ backgroundImage: "linear-gradient(180deg, rgb(64,49,57) 0%, rgba(64,49,57,0) 20%), #201e1f" }}
                >
                  <div className="w-full h-16 rounded-lg flex items-center justify-center overflow-hidden">
                  <WeaponImage variant="small" imageUrl={w.imageUrl} />
                  </div>
                  <div className="flex items-center gap-2 w-full">

                    <span className="text-[14px] text-[#fafafa] font-semibold flex-1">{w.name}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
              <p className="text-[#8d898a]">No weapon data for {activeName} yet.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[16px] text-[#fafafa] font-semibold">Most popular loadouts</p>
            <p className="text-[14px] text-[#8d898a]">
              Class setups from the latest patch that are currently dominating the game.
            </p>
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
                  onClick={() => navigate(`/${l.gameId}/loadout/${l.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
              <p className="text-[#8d898a]">
                No loadouts published for {activeName} yet. Be the first to create one!
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
