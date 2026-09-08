import { useEffect, useState } from "react";
import { gameMeta } from "@/lib/games";
import type { Game } from "@/types/game";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

// Shared with Explore so the "no loadouts yet" empty state (and anywhere
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

