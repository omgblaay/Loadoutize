import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";
import { AuthModal } from "./AuthModal";
import { gameMeta, GAME_ORDER } from "../utils/games";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import ldtizeLogoMark from "figma:asset/ldtize-logo-mark.svg";
import {
  Search,
  Zap,
  ChevronDown,
  LogOut,
  Star,
  Heart,
  Home as HomeIcon,
  Globe,
  Flame,
  Crown,
} from "lucide-react";

interface Game {
  id: string;
  name: string;
  slug: string;
}

interface Weapon {
  id: string;
  name: string;
  type: string | null;
}

export function AppLayout({
  selectedGame,
  onGameSelect,
  breadcrumb,
  children,
}: {
  selectedGame: string;
  onGameSelect: (gameId: string) => void;
  breadcrumb?: ReactNode;
  children: ReactNode;
}) {
  const [games, setGames] = useState<Game[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => data.games && setGames(data.games))
      .catch((error) => console.error("Error fetching games:", error));
  }, []);

  useEffect(() => {
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/weapons`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => data.weapons && setWeapons(data.weapons))
      .catch((error) => console.error("Error fetching weapons:", error));
  }, [selectedGame]);

  const orderedGames = GAME_ORDER.map((id) => games.find((g) => g.id === id)).filter(Boolean) as Game[];
  const activeMeta = gameMeta[selectedGame] ?? gameMeta.blackops7;
  const ActiveIcon = activeMeta.icon;
  const categories = Array.from(
    new Set(weapons.map((w) => w.type).filter((t): t is string => Boolean(t)))
  ).slice(0, 6);

  const isHome = location.pathname === "/";
  const isExplore = location.pathname.endsWith("/explore");

  const handleGameSelect = (id: string) => {
    onGameSelect(id);
    setGameMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0909] text-[#efedf1] flex flex-col">
      {/* Navbar */}
      <div className="w-full backdrop-blur-md bg-[rgba(6,5,9,0.6)] border-b border-white/[0.16] sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-6 h-[72px] flex items-center gap-5">
          <div className="flex items-center gap-3 shrink-0">
            <a href="/" className="flex items-center gap-1.5">
              <img src={ldtizeLogoMark} alt="" className="w-8 h-[35px]" />
              <div className="flex flex-col leading-none">
                <span className="font-black italic tracking-tight text-white">LDTIZE</span>
                <span className="text-[8.75px] text-[#464242]">Loadoutize.com</span>
              </div>
            </a>
            <span className="text-[#5D5658] px-1">/</span>
            <div className="relative">
              <button
                onClick={() => setGameMenuOpen((v) => !v)}
                className="h-10 px-3.5 rounded-xl border border-white/[0.18] bg-white/[0.04] flex items-center gap-2 text-[#efedf1]"
              >
                <ActiveIcon className="w-4 h-4" />
                <span>{activeMeta.name}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {gameMenuOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-56 rounded-xl border border-white/10 bg-[#161415] shadow-2xl overflow-hidden z-50">
                  {orderedGames.map((game) => {
                    const meta = gameMeta[game.id];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <button
                        key={game.id}
                        onClick={() => handleGameSelect(game.id)}
                        className={`w-full px-3.5 py-2.5 flex items-center gap-2 text-left hover:bg-white/5 ${
                          selectedGame === game.id ? "text-[#f8f7f9]" : "text-[#aea6a8]"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{meta.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-4 shrink-0">
            <button className="h-[52px] px-4 rounded-xl border border-white/[0.18] flex items-center gap-2 text-[#efedf1]">
              <Heart className="w-4 h-4" />
              <span>Favourites</span>
            </button>
            <button
              onClick={() => (user ? navigate(`/${selectedGame}/create`) : setShowAuthModal(true))}
              className="h-[52px] px-4 rounded-xl border border-white/[0.08] bg-[#2a2829] flex items-center gap-2 text-[#efedf1]"
            >
              <Star className="w-4 h-4" />
              <span>Create new</span>
            </button>
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/u/${user.name}`)}
                  className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center text-white"
                  style={{ backgroundImage: "linear-gradient(135deg, rgb(207,206,212) 0%, rgb(64,62,67) 100%)" }}
                >
                  {user.email?.[0]?.toUpperCase() || "U"}
                </button>
                <button onClick={logout} className="text-[#979098] hover:text-[#efedf1]">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center text-white"
                style={{ backgroundImage: "linear-gradient(135deg, rgb(207,206,212) 0%, rgb(64,62,67) 100%)" }}
              >
                HK
              </button>
            )}
          </div>
        </div>
      </div>

      {breadcrumb && (
        <div className="w-full border-b border-white/[0.07]">
          <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center gap-2 flex-wrap text-[14px] text-[#bebcbc]">
            {breadcrumb}
          </div>
        </div>
      )}

      {/* Body: Sidenav + content */}
      <div className="max-w-[1440px] w-full mx-auto flex gap-6 px-6 py-6 flex-1">
        {/* Sidenav */}
        <aside className="hidden lg:flex flex-col gap-6 w-[320px] shrink-0">
          <div className="h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center gap-3 px-4">
            <Search className="w-4 h-4 text-[#8d898a]" />
            <span className="text-[#8d898a] text-[14px]">Search name, author, weapon, tag...</span>
          </div>

          <div className="flex flex-col gap-1 w-full">
            <p className="text-[10px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold mb-2">Menu</p>
            <button
              onClick={() => navigate("/")}
              className={`min-h-[52px] rounded-xl px-4 flex items-center gap-2 uppercase text-[14px] font-medium ${
                isHome ? "bg-white/[0.08] text-[#fafafa]" : "text-[#fafafa] hover:bg-white/[0.05]"
              }`}
            >
              <HomeIcon className="w-5 h-5" />
              Home
            </button>
            <button
              onClick={() => navigate(`/${selectedGame}/explore`)}
              className={`min-h-[52px] rounded-xl px-4 flex items-center gap-2 uppercase text-[14px] font-medium ${
                isExplore ? "bg-white/[0.08] text-[#fafafa]" : "text-[#fafafa] hover:bg-white/[0.05]"
              }`}
            >
              <Globe className="w-5 h-5" />
              Explore
            </button>
            <button className="min-h-[52px] rounded-xl px-4 flex items-center gap-2 text-[#fafafa] uppercase text-[14px] font-medium hover:bg-white/[0.05]">
              <Flame className="w-5 h-5" />
              Trending
            </button>
            <button className="min-h-[52px] rounded-xl px-4 flex items-center gap-2 text-[#fafafa] uppercase text-[14px] font-medium hover:bg-white/[0.05]">
              <Crown className="w-5 h-5" />
              Meta
            </button>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-col gap-0.5 w-full">
              <p className="text-[10px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold mb-2">Best of</p>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => navigate(`/${selectedGame}/explore?category=${encodeURIComponent(cat)}`)}
                  className="min-h-10 rounded-xl px-3.5 py-2 flex items-center text-[#fafafa] uppercase text-[14px] font-medium hover:bg-white/[0.05] text-left"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div
            className="relative rounded-xl p-6 flex flex-col gap-5 overflow-hidden"
            style={{ backgroundImage: "linear-gradient(to bottom, #1a181a 34%, #212126)" }}
          >
            <div
              className="absolute inset-0 pointer-events-none rounded-[inherit]"
              style={{ boxShadow: "inset 0px -40px 120px 0px rgba(255,255,255,0.04)" }}
            />
            <div className="flex gap-4 items-start relative">
              <Zap className="w-[18px] h-6 text-[#efedf1] shrink-0" />
              <p className="flex-1 text-[20px] text-[#fafafa]">Join the battlefield with the best setups</p>
            </div>
            <p className="text-[14px] leading-[1.4] text-[#bebcbc] relative">
              Join the community now, and enjoy the best configs for your favourite games
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="h-[52px] rounded-xl bg-[#fafafa] flex items-center justify-center gap-2 relative"
            >
              <span className="text-[#161414]">Join now</span>
              <span className="text-[#8d898a]">For free</span>
            </button>
          </div>
        </aside>

        {/* Page content */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">{children}</main>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.18] mt-4">
        <div className="max-w-[1440px] mx-auto px-6 py-7 flex flex-wrap gap-6">
          <div className="flex-1 min-w-[260px] flex flex-col justify-between gap-6">
            <div className="flex gap-6 items-start">
              <img src={ldtizeLogoMark} alt="" className="w-8 h-[35px]" />
              <div className="text-[14px] text-[#857d7f] flex flex-col gap-1">
                <p>Loadoutize © 2027</p>
                <p>Built independently · Not affiliated with any listed game.</p>
              </div>
            </div>
            <div className="flex gap-3 text-[14px] text-[#aea6a8]">
              <span>Instagram</span>
              <span>·</span>
              <span>TikTok</span>
              <span>·</span>
              <span>YouTube</span>
            </div>
          </div>

          <div className="flex-1 min-w-[140px] flex flex-col gap-3 text-[14px] text-[#aea6a8]">
            <a onClick={() => navigate("/")} className="hover:text-[#efedf1] cursor-pointer">
              Home
            </a>
            <a onClick={() => navigate(`/${selectedGame}/explore`)} className="hover:text-[#efedf1] cursor-pointer">
              Explore
            </a>
            <a className="hover:text-[#efedf1]">Ranking</a>
            <a className="hover:text-[#efedf1]">Creator</a>
            <a className="hover:text-[#efedf1]">Favourites</a>
          </div>

          <div className="flex-1 min-w-[140px] flex flex-col gap-3 text-[14px] text-[#aea6a8]">
            <a className="hover:text-[#efedf1]">Privacy Policy</a>
            <a className="hover:text-[#efedf1]">Terms of Use</a>
            <a className="hover:text-[#efedf1]">About us</a>
            <a className="hover:text-[#efedf1]">Blog</a>
          </div>

          <div className="flex-1 min-w-[140px] flex flex-col gap-3 text-[14px] text-[#aea6a8]">
            {orderedGames.map((game) => (
              <a
                key={game.id}
                onClick={() => handleGameSelect(game.id)}
                className="hover:text-[#efedf1] cursor-pointer"
              >
                {gameMeta[game.id]?.name ?? game.name}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} isOpen={showAuthModal} />}
    </div>
  );
}
