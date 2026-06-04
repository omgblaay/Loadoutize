import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./components/AuthContext";
import { GameSelector } from "./components/GameSelector";
import { GameDashboard } from "./components/GameDashboard";
import { LoadoutBuilder } from "./components/LoadoutBuilder";
import { LoadoutPreview } from "./components/LoadoutPreview";
import { WeaponConfigPreview } from "./components/WeaponConfigPreview";
import { AdminPanel } from "./components/AdminPanel";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<GameSelector />} />
          <Route path="/game/:gameId" element={<GameDashboard />} />
          <Route path="/game/:gameId/builder" element={<LoadoutBuilder />} />
          <Route path="/game/:gameId/loadout/:loadoutId" element={<LoadoutPreview />} />
          <Route path="/game/:gameId/weapon/:configId" element={<WeaponConfigPreview />} />
        </Routes>
        <AdminPanel />
      </BrowserRouter>
    </AuthProvider>
  );
}