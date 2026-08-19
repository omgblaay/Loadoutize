import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router";
import { AuthProvider } from "./components/AuthContext";
import { GameSelector } from "./components/GameSelector";
import { GameDashboard } from "./components/GameDashboard";
import { LoadoutBuilder } from "./components/LoadoutBuilder";
import { LoadoutPreview } from "./components/LoadoutPreview";
import { WeaponConfigPreview } from "./components/WeaponConfigPreview";
import { UserPage } from "./components/UserPage";

function GameRedirect() {
  const { gameId } = useParams();
  return <Navigate to={`/${gameId}/explore`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<GameSelector />} />
          <Route path="/u/:nickname" element={<UserPage />} />
          <Route path="/:gameId" element={<GameRedirect />} />
          <Route path="/:gameId/explore" element={<GameDashboard />} />
          <Route path="/:gameId/create" element={<LoadoutBuilder />} />
          <Route path="/:gameId/loadout/:loadoutId" element={<LoadoutPreview />} />
          <Route path="/:gameId/weapon/:configId" element={<WeaponConfigPreview />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}