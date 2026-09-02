import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";
import { AuthModal } from "./AuthModal";
import { gameMeta, GAME_ORDER, LAST_SELECTED_GAME_KEY, GAME_SELECTOR_ENABLED, LOCKED_GAME_ID } from "../utils/games";
import { SideNav } from "./ui/sidenav";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { TopNavBar } from "./ui/topnavbar"
import { Footer } from "./ui/footer";


import {
  Globe,
} from "lucide-react";

export interface Game {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface Weapon {
  id: string;
  name: string;
  type: string | null;
  typeShort: string | null;
}

// Shared with GameDashboard so the "no loadouts yet" empty state (and anywhere
// else outside AppLayout) shows the same resolved name AppLayout uses in the
// navbar/dropdown, rather than falling back to the static gameMeta list only.
export function useGameName(selectedGame: string) {
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => data.games && setGames(data.games))
      .catch((error) => console.error("Error fetching games:", error));
  }, []);

  const game = games.find((g) => g.id === selectedGame) ?? null;
  const name = game?.name ?? gameMeta[selectedGame]?.name ?? selectedGame;

  return { games, game, name };
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
  const [weapons, setWeapons] = useState<Weapon[]>([]);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const { games, game: activeGame, name: activeName } = useGameName(selectedGame);

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
  const orderedGames = [...games]
    .sort((a, b) => {
      const ai = GAME_ORDER.indexOf(a.id);
      const bi = GAME_ORDER.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    .filter((g) => GAME_SELECTOR_ENABLED || g.id === LOCKED_GAME_ID);
  const activeMeta = gameMeta[selectedGame];
  const ActiveIcon = activeMeta?.icon ?? Globe;
  const categories = Array.from(
    new Map(
      weapons
        .filter((w): w is Weapon & { type: string } => Boolean(w.type))
        .map((w) => [w.type, { name: w.type, typeShort: w.typeShort }] as const)
    ).values()
  ).slice(0, 6);

  const isHome = location.pathname === "/";
  const isExplore = location.pathname.endsWith("/explore");
  const isMeta = location.pathname.endsWith("/meta");

  const [showAuthModal, setShowAuthModal] = useState(false);

  const activeLogoUrl = activeGame?.logoUrl ?? null;
  // SideNav/Footer have no dropdown to close, so they just switch games directly.
  // Persisted here (the single funnel all game switches go through) so Home
  // remembers the last game picked on Explore/other pages, instead of always
  // resetting to the default.
  const handleGameSelect = (id: string) => {
    try {
      localStorage.setItem(LAST_SELECTED_GAME_KEY, id);
    } catch {
      // localStorage may be unavailable (e.g. private browsing); persistence is best-effort.
    }
    onGameSelect(id);
  };

  return (
    <div className="min-h-screen bg-[#0a0909] text-[#efedf1] flex flex-col">
      {/* Navbar */}
      <TopNavBar
        activeLogoUrl={activeLogoUrl}
        user={user}
        selectedGame={selectedGame}
        orderedGames={orderedGames}
        handleGameSelect={handleGameSelect}
        setShowAuthModal={setShowAuthModal}
      />



      {/* Body: Sidenav + content */}
      <div className="max-w-[1440px] w-full mx-auto flex gap-6 p-2 sm:p-6  flex-1">
        {/* Sidenav */}
        <SideNav isHome={isHome} isExplore={isExplore} isMeta={isMeta} selectedGame={selectedGame} categories={categories} navigate={navigate} setShowAuthModal={setShowAuthModal} handleGameSelect={handleGameSelect} />

        {/* Page content */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">
          {breadcrumb && (
            <div className="w-full">
              <div className="flex items-center gap-2 flex-wrap text-[14px] text-[#bebcbc]">
                {breadcrumb}
              </div>
            </div>
          )}
          {children}</main>
      </div>


      {/* Footer */}
      <Footer handleGameSelect={handleGameSelect} navigate={navigate} selectedGame={selectedGame} orderedGames={orderedGames} gameMeta={gameMeta} />

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} isOpen={showAuthModal} />}
    </div>
  );
}
