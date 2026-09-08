import { GAME_SELECTOR_ENABLED, LOCKED_GAME_ID } from "@/lib/games";

type SearchValue = string | number | boolean | null | undefined;

/** Builds the canonical Explore URL while keeping game selection out of the path. */
export function explorePath(gameId: string = LOCKED_GAME_ID, params: Record<string, SearchValue> = {}) {
  const searchParams = new URLSearchParams();

  if (GAME_SELECTOR_ENABLED && gameId) {
    searchParams.set("game", gameId);
  }

  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const search = searchParams.toString();
  return `/explore${search ? `?${search}` : ""}`;
}
