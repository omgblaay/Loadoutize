import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Globe, Heart, LogOut, Star } from "lucide-react";
import { useAuth } from "../AuthContext";
import { gameMeta } from "@/app/utils/games";
import { Logo } from "./logo";



export function TopNavBar({
  activeLogoUrl,
  user,
  onGameSelect,
  selectedGame,
  orderedGames,
  setShowAuthModal,
}: {
  activeLogoUrl: string | null;
  user: any;
  onGameSelect: (id: string) => void;
  selectedGame: string;
  orderedGames: { id: string; name: string; slug: string; logoUrl: string | null }[];
  setShowAuthModal: (show: boolean) => void;
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [gameMenuOpen, setGameMenuOpen] = useState(false);

  const handleGameSelect = (id: string) => {
    onGameSelect(id);
    setGameMenuOpen(false);
  };

  const activeGame = orderedGames.find((g) => g.id === selectedGame);
  const activeMeta = gameMeta[selectedGame];
  const activeName = activeGame?.name ?? activeMeta?.name ?? selectedGame;
  const ActiveIcon = activeMeta?.icon ?? Globe;
    return (<div className="w-full backdrop-blur-md bg-[rgba(6,5,9,0.6)] border-b border-white/[0.16] sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-6 h-[72px] flex items-center gap-5">
          <div className="flex items-center gap-3 shrink-0">
            <a href="/" className="flex items-center gap-1.5">
              <Logo />

            </a>
            <span className="text-[#5D5658] px-1">/</span>
            <div className="relative">
              <button
                onClick={() => setGameMenuOpen((v) => !v)}
                className="h-10 px-3.5 rounded-xl border border-white/[0.18] bg-white/[0.04] flex items-center gap-2 text-[#efedf1]"
              >
                {activeLogoUrl ? (
                  <img src={activeLogoUrl} alt="" className="w-4 h-4 object-contain shrink-0" />
                ) : (
                  <ActiveIcon className="w-4 h-4" />
                )}
                <span>{activeName}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {gameMenuOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-56 rounded-xl border border-white/10 bg-[#161415] shadow-2xl overflow-hidden z-50">
                  {orderedGames.map((game) => {
                    const meta = gameMeta[game.id];
                    const Icon = meta?.icon ?? Globe;
                    return (
                      <button
                        key={game.id}
                        onClick={() => handleGameSelect(game.id)}
                        className={`w-full px-3.5 py-2.5 flex items-center gap-2 text-left hover:bg-white/5 ${
                          selectedGame === game.id ? "text-[#f8f7f9]" : "text-[#aea6a8]"
                        }`}
                      >
                        {game.logoUrl ? (
                          <img src={game.logoUrl} alt="" className="w-4 h-4 object-contain shrink-0" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                        <span>{meta?.name ?? game.name}</span>
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
      </div>);
}