import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router";
import { AuthProvider } from "./components/AuthContext";
import { GameSelector } from "./components/GameSelector";
import { GameDashboard } from "./components/GameDashboard";
import { MetaView } from "./components/MetaView";
import { LoadoutBuilder } from "./components/LoadoutBuilder";
import { LoadoutPreview } from "./components/LoadoutPreview";
import { WeaponConfigPreview } from "./components/WeaponConfigPreview";
import { UserPage } from "./components/UserPage";
import { LikedLoadouts } from "./components/LikedLoadouts";
import { Settings } from "./components/Settings";
import { AuthCallback } from "./components/AuthCallback";
import { NotFound } from "./components/NotFound";
import { GAME_SELECTOR_ENABLED, LOCKED_GAME_ID } from "./utils/games";

function GameRedirect() {
  const { gameId } = useParams();
  const target = !GAME_SELECTOR_ENABLED ? LOCKED_GAME_ID : gameId;
  return <Navigate to={`/${target}/explore`} replace />;
}

// Loadout links moved from /:gameId/loadout/:id to the shorter /:gameId/l/:id
// -- this keeps any already-shared /loadout/ link (Discord, QR codes, etc.)
// working instead of 404ing.
function LegacyLoadoutRedirect() {
  const { gameId, loadoutId } = useParams();
  return <Navigate to={`/${gameId}/l/${loadoutId}`} replace />;
}

// While the game selector is disabled, any /:gameId/* route for a game other
// than LOCKED_GAME_ID redirects to its Modern Warfare 4 equivalent instead of
// rendering — so switching is off everywhere, not just hidden from the UI.
function GameLock({ children }: { children: ReactNode }) {
  const { gameId } = useParams();
  const location = useLocation();
  if (!GAME_SELECTOR_ENABLED && gameId !== LOCKED_GAME_ID) {
    const rest = location.pathname.split("/").slice(2).join("/");
    return <Navigate to={`/${LOCKED_GAME_ID}${rest ? `/${rest}` : ""}${location.search}`} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<GameSelector />} />
          <Route path="/u/:nickname" element={<UserPage />} />
          <Route path="/liked" element={<LikedLoadouts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/:gameId" element={<GameRedirect />} />
          <Route
            path="/:gameId/explore"
            element={
              <GameLock>
                <GameDashboard />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/meta"
            element={
              <GameLock>
                <MetaView />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/create"
            element={
              <GameLock>
                <LoadoutBuilder />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/l/:loadoutId"
            element={
              <GameLock>
                <LoadoutPreview />
              </GameLock>
            }
          />
          <Route path="/:gameId/loadout/:loadoutId" element={<LegacyLoadoutRedirect />} />
          <Route
            path="/:gameId/weapon/:configId"
            element={
              <GameLock>
                <WeaponConfigPreview />
              </GameLock>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}