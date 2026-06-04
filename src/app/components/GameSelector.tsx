import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "./AuthContext";
import { AuthModal } from "./AuthModal";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import {
  Search,
  Zap,
  X,
  Camera,
  ChevronRight,
  Crosshair,
  Target,
  Rocket,
  Star,
  Heart,
  LogOut,
} from "lucide-react";

interface Game {
  id: string;
  name: string;
  slug: string;
}

interface Loadout {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  name: string;
  description?: string;
  weapons: any[];
  likes: number;
  views: number;
  createdAt: string;
}

const gameMeta: Record<string, { name: string; short: string; icon: typeof Crosshair }> = {
  blackops7: { name: "Black Ops 7", short: "BO7", icon: Crosshair },
  warzone: { name: "Warzone", short: "WZ", icon: Target },
  bf6: { name: "Battlefield 6", short: "BF6", icon: Rocket },
  thefinals: { name: "The Finals", short: "FIN", icon: Zap },
};

const GAME_ORDER = ["blackops7", "warzone", "bf6", "thefinals"];

export function GameSelector() {
  const [games, setGames] = useState<Game[]>([]);
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("blackops7");
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [dismissPatch, setDismissPatch] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const gameParam = searchParams.get("game");
    if (gameParam) setSelectedGame(gameParam);
    fetchGames();
    fetchLoadouts();
  }, [searchParams]);

  const fetchGames = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.games) setGames(data.games);
    } catch (error) {
      console.error("Error fetching games:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoadouts = async () => {
    try {
      const all: Loadout[] = [];
      for (const gameId of GAME_ORDER) {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } }
        );
        const data = await response.json();
        if (data.loadouts) all.push(...data.loadouts);
      }
      setLoadouts(all);
    } catch (error) {
      console.error("Error fetching loadouts:", error);
    }
  };

  const orderedGames = GAME_ORDER
    .map((id) => games.find((g) => g.id === id))
    .filter(Boolean) as Game[];

  const activeMeta = gameMeta[selectedGame] ?? gameMeta.blackops7;
  const ActiveIcon = activeMeta.icon;

  const metaLoadouts = loadouts
    .filter((l) => l.gameId === selectedGame)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 6);

  const popularWeapons = [
    { label: "Most popular overall", name: "CR-56 AMAX", setups: 142 },
    { label: "Most popular AR", name: "RAM-7", setups: 120 },
    { label: "Most popular SMG", name: "MP5", setups: 110 },
    { label: "Most popular Sniper", name: "HDR", setups: 88 },
  ];

  const patchChanges = [
    { name: "RAM-7", change: "recoil -12%", up: true },
    { name: "GRAU 5.56", change: "ADS faster", up: true },
    { name: "MP5", change: "damage -8%", up: false },
  ];

  const handleGameSelect = (slug: string) => {
    setSelectedGame(slug);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0909]">
        <div className="text-[#efedf1]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0909] text-[#efedf1] flex flex-col items-center">
      {/* Top Nav */}
      <div className="w-full backdrop-blur-md bg-[rgba(6,5,9,0.6)] border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-[1560px] mx-auto px-8 py-4 h-[72px] flex items-center gap-10">
          <div className="font-bold tracking-tight text-[#efedf1] whitespace-nowrap">
            LOADOUTIZE
          </div>

          <nav className="flex items-center gap-3 flex-1">
            <button className="px-2 py-2 text-[#efedf1]">Home</button>
            <button className="px-2 py-2 text-[#979098] hover:text-[#efedf1]">Explore</button>
            <button className="px-2 py-2 text-[#979098] hover:text-[#efedf1]">Meta</button>
            <button className="px-2 py-2 text-[#979098] hover:text-[#efedf1]">Creators</button>
          </nav>

          <div className="flex items-center gap-5">
            <button className="flex items-center gap-2 text-[#a1959d] hover:text-[#efedf1]">
              <Heart className="w-4 h-4" />
              <span>Favourites</span>
            </button>

            <button
              onClick={() => navigate(`/game/${selectedGame}/builder`)}
              className="h-12 px-4 rounded-xl flex items-center gap-1.5 text-[#372f08] border-t border-white/20"
              style={{
                background: "linear-gradient(to bottom, #ffcf00, #ffe576)",
              }}
            >
              <Star className="w-5 h-5" fill="currentColor" />
              <span>Create loadout</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center text-white"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgb(207,206,212) 0%, rgb(64,62,67) 100%)",
                  }}
                >
                  {user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <button onClick={logout} className="text-[#979098] hover:text-[#efedf1]">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center text-white"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, rgb(207,206,212) 0%, rgb(64,62,67) 100%)",
                }}
              >
                HK
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Game selection strip */}
      <div className="w-full bg-[#191718] h-16 flex items-center justify-center">
        <div className="max-w-[1560px] w-full px-8 flex items-center gap-2.5">
          <span className="uppercase tracking-[1.6px] text-[10px] text-[#857d7f] pr-1">
            Game:
          </span>
          {orderedGames.map((game) => {
            const meta = gameMeta[game.id];
            if (!meta) return null;
            const Icon = meta.icon;
            const active = selectedGame === game.id;
            return (
              <button
                key={game.id}
                onClick={() => handleGameSelect(game.id)}
                className={`h-[38px] px-4 rounded-xl flex items-center gap-2 border ${
                  active
                    ? "bg-[#3a3738] border-transparent text-[#f8f7f9]"
                    : "border-white/[0.07] text-[#aea6a8] hover:text-[#f8f7f9]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{meta.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1560px] w-full px-8 py-6 flex flex-col gap-4">
        {/* Patch notes banner */}
        {!dismissPatch && (
          <div
            className="relative rounded-[18px] p-6 flex flex-wrap items-center gap-4"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at top, rgba(255,122,24,0.12), transparent 60%), linear-gradient(90deg, #282527, #282527)",
            }}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-[320px]">
              <div
                className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center"
                style={{
                  background: "rgba(255,122,24,0.1)",
                  boxShadow: "inset 0 0 0 1px rgba(255,122,24,0.22)",
                }}
              >
                <Zap className="w-5 h-5" style={{ color: "#FF7A18" }} />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
                <span
                  className="uppercase tracking-[1.1px] text-[11px]"
                  style={{ color: "#ff7a18" }}
                >
                  Season 2.3 · LIVE
                </span>
                <span className="text-[#979098] text-[12px]">
                  next balance pass in ~5 days
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 flex-1 min-w-[320px]">
              {patchChanges.map((c) => (
                <div key={c.name} className="flex items-center gap-1.5">
                  <ChevronRight
                    className="w-3 h-3 rotate-90"
                    style={{ color: c.up ? "#36D27A" : "#FF4D63" }}
                  />
                  <span className="text-[#f7f6f6] tracking-[0.13px]">{c.name}</span>
                  <span className="text-[#979098] text-[13px]">{c.change}</span>
                </div>
              ))}
              <span className="text-[#979098] text-[12px]">+11 more changes</span>
            </div>

            <button
              onClick={() => setDismissPatch(true)}
              className="absolute top-5 right-5 w-[30px] h-[30px] flex items-center justify-center text-[#5D5658] hover:text-[#efedf1]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hero header */}
        <div className="flex flex-wrap items-end justify-between gap-4 py-5">
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/10"
                style={{ background: "#1b1819" }}
              >
                <ActiveIcon className="w-6 h-6 text-[#efedf1]" />
              </div>
              <h1 className="text-[32px] leading-[1.04] tracking-[-0.64px] text-[#efedf1]">
                {activeMeta.name} Meta Vault
              </h1>
            </div>
            <p className="text-[#979098] tracking-[0.1px]">
              Build a class, share a link, watch the community rate it.
            </p>
          </div>

          <div className="bg-[#262027] border border-white/10 rounded-[14px] h-[52px] w-[360px] max-w-full flex items-center gap-3 px-4">
            <Search className="w-4 h-4 text-white" />
            <input
              className="bg-transparent border-0 outline-none flex-1 text-[#efedf1] placeholder-[#979098]"
              placeholder="Search weapons, setups, creators…"
            />
          </div>
        </div>

        {/* Two-column feature row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5">
          {/* Quick add with AI */}
          <div
            className="relative rounded-3xl h-[358px] overflow-hidden"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at top, rgba(81,18,255,0.45), transparent 60%), linear-gradient(#1b1819, #141213)",
            }}
          >
            <div className="h-full flex flex-col items-center justify-between p-6 text-center">
              <div
                className="w-24 h-24 rounded-[20px] flex items-center justify-center mt-5"
                style={{
                  backgroundImage:
                    "linear-gradient(160deg, #6214d3 0%, #a379de 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.25), 0 0 30px rgba(245,245,250,0.14)",
                }}
              >
                <Camera className="w-12 h-12 text-white" />
              </div>
              <div className="text-[#f7f6f6] text-[20px]">Quick add with AI</div>
              <div className="text-[#efedf1]">
                <p>Take a picture of your loadout.</p>
                <p>It will appear on your profile with ease.</p>
              </div>
              <button
                className="w-full h-[52px] rounded-xl flex items-center justify-center gap-1.5 text-[#f8f7f9] border-t border-white/20"
                style={{
                  background: "#6214d3",
                  boxShadow:
                    "inset 0 -1px 0 rgba(255,255,255,0.5), inset 0 -2px 0 rgba(0,0,0,0.5), inset 0 4px 20px rgba(255,255,255,0.24)",
                }}
              >
                <Star className="w-5 h-5" />
                <span>Try for free</span>
              </button>
            </div>
          </div>

          {/* Streamers card */}
          <div className="relative bg-[#191718] rounded-3xl h-[358px] overflow-hidden p-8 flex flex-col gap-4">
            <div className="flex gap-4 text-[#aea6a8]">
              <Crosshair className="w-6 h-6" />
              <Target className="w-6 h-6" />
              <Rocket className="w-6 h-6" />
              <Zap className="w-6 h-6" />
            </div>
            <div className="text-[#f7f6f6] text-[20px]">
              From your favourite Streamers &amp; Content Creators
            </div>
            <p className="text-[#857d7f] tracking-[0.1px] w-[320px] max-w-full flex-1">
              Check what they are currently running in-game for the best outcome.
            </p>
            <button className="bg-[#211e20] border border-white/10 rounded-[14px] h-12 px-6 self-start flex items-center gap-2.5 text-[#f7f6f6]">
              <span>Explore streamers setups</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Most popular weapons row */}
        <div className="grid grid-cols-2 md:grid-cols-4 rounded-[18px] overflow-hidden bg-[#141213] border border-white/5">
          {popularWeapons.map((w) => (
            <div key={w.name} className="p-5 flex flex-col gap-1 border-r border-white/5 last:border-r-0">
              <div className="text-[#979098] text-[12px] tracking-[0.1px]">{w.label}</div>
              <div className="h-[52px] flex items-center justify-center pt-2 opacity-85">
                <div className="w-full h-full bg-[#1b1819] rounded flex items-center justify-center text-[#857d7f] text-[11px]">
                  weapon
                </div>
              </div>
              <div className="pt-2 text-[#f7f6f6]">{w.name}</div>
              <div className="uppercase tracking-[1px] text-[12px] text-[#857d7f]">
                {w.setups} setups made
              </div>
            </div>
          ))}
        </div>

        {/* Meta loadouts dialog block */}
        <div className="relative rounded-3xl bg-[#1d181e] p-6 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div
              className="w-[30px] h-[34px] rounded"
              style={{
                background: "linear-gradient(to bottom, #FFC24A, #FF7A18 45%, #F0431B)",
                filter: "drop-shadow(0 4px 5px rgba(240,67,27,0.45))",
                clipPath: "polygon(50% 0, 100% 30%, 80% 100%, 20% 100%, 0 30%)",
              }}
            />
            <div className="flex-1 flex flex-col gap-1">
              <div className="text-[#f8f7f9]">Meta</div>
              <div className="text-[#979098] text-[12px] tracking-[0.1px]">
                Class setups from the latest patch that are currently dominating the game.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {(metaLoadouts.length > 0
              ? metaLoadouts
              : Array.from({ length: 6 }).map((_, i) => ({
                  id: `placeholder-${i}`,
                  name: "BEST AMAX RANKED",
                  weapons: [{ name: "M4A4" }],
                  userName: "blaay",
                  likes: 120,
                  gameId: selectedGame,
                } as Loadout))
            ).map((l) => {
              const weaponName = l.weapons?.[0]?.name || "M4A4";
              return (
                <button
                  key={l.id}
                  onClick={() => navigate(`/game/${l.gameId}/loadout/${l.id}`)}
                  className="rounded-2xl px-6 py-2 flex flex-wrap items-center gap-3 hover:bg-white/[0.03] text-left"
                >
                  <div className="relative w-12 h-12 rounded-full border border-white/40 flex items-center justify-center"
                    style={{
                      background: "linear-gradient(to bottom, #FF5425, #CE2D00 67%, #FF9E0C)",
                    }}
                  >
                    <div className="absolute inset-0 m-auto w-7 h-7 rounded-[14px] flex items-center justify-center bg-gradient-to-b from-[rgba(39,39,39,0.09)] to-[rgba(0,0,0,0.27)] text-white tracking-[-0.5px] text-[12px]">
                      {l.likes}
                    </div>
                  </div>
                  <div className="w-[120px] h-[60px] bg-[#1b1819] rounded flex items-center justify-center text-[#857d7f] text-[11px]">
                    weapon
                  </div>
                  <div className="flex-1 min-w-[200px] flex flex-col gap-2 justify-center">
                    <div className="flex items-center gap-2 text-[#f8f7f9]">
                      <span>{weaponName}</span>
                      <span>-</span>
                      <span>{l.name?.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#979098] text-[12px] tracking-[0.1px]">
                      <span>META</span>
                      <span>•</span>
                      <span>NO RECOIL</span>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full"
                          style={{
                            backgroundImage:
                              "linear-gradient(135deg, #cfced4, #403e43)",
                          }}
                        />
                        <span>{l.userName}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.07] mt-4">
        <div className="max-w-[1280px] mx-auto px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[#857d7f] text-[12px] flex-1 min-w-0">
            © 2027 Loadoutize · Built independently · not affiliated with any listed game.
          </p>
          <div className="flex flex-wrap gap-x-5 text-[#aea6a8]">
            <a className="hover:text-[#efedf1]">Home</a>
            <a className="hover:text-[#efedf1]">New setup</a>
            <a className="hover:text-[#efedf1]">Profile</a>
            <a className="hover:text-[#efedf1]">Sign up</a>
            <a className="hover:text-[#efedf1]">Streamers</a>
            <a className="hover:text-[#efedf1]">Meta</a>
          </div>
        </div>
      </footer>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
