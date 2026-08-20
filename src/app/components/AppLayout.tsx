import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";
import { AuthModal } from "./AuthModal";
import { gameMeta, GAME_ORDER } from "../utils/games";
import { SideNav } from "./ui/sidenav";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { TopNavBar } from "./ui/topnavbar"
import { Footer } from "./ui/footer";


import {
  Globe,
} from "lucide-react";

interface Game {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
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

  // Known games (GAME_ORDER) come first in that order; any game added in
  // Directus that isn't in the hardcoded list yet is appended rather than
  // dropped, so newly created games still show up in the switcher.
  const orderedGames = [...games].sort((a, b) => {
    const ai = GAME_ORDER.indexOf(a.id);
    const bi = GAME_ORDER.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const activeGame = games.find((g) => g.id === selectedGame);
  const activeMeta = gameMeta[selectedGame];
  const activeName = activeGame?.name ?? activeMeta?.name ?? selectedGame;
  const ActiveIcon = activeMeta?.icon ?? Globe;
  const categories = Array.from(
    new Set(weapons.map((w) => w.type).filter((t): t is string => Boolean(t)))
  ).slice(0, 6);

  const isHome = location.pathname === "/";
  const isExplore = location.pathname.endsWith("/explore");

  const [showAuthModal, setShowAuthModal] = useState(false);

  const activeLogoUrl = activeGame?.logoUrl ?? null;
  // SideNav/Footer have no dropdown to close, so they just switch games directly.
  const handleGameSelect = onGameSelect;

  return (
    <div className="min-h-screen bg-[#0a0909] text-[#efedf1] flex flex-col">
      {/* Navbar */}
      <TopNavBar
        activeLogoUrl={activeLogoUrl}
        user={user}
        onGameSelect={onGameSelect}
        selectedGame={selectedGame}
        orderedGames={orderedGames}
        setShowAuthModal={setShowAuthModal}
      />

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
        <SideNav isHome={isHome} isExplore={isExplore} selectedGame={selectedGame} categories={categories} navigate={navigate} setShowAuthModal={setShowAuthModal} handleGameSelect={handleGameSelect} />

        {/* Page content */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">{children}</main>
      </div>


      {/* Footer */}
      <Footer handleGameSelect={handleGameSelect} navigate={navigate} selectedGame={selectedGame} orderedGames={orderedGames} gameMeta={gameMeta} />
      
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} isOpen={showAuthModal} />}
    </div>
  );
}
