export const gameColors = {
  mw4: {
    primary: "#FF6B35",
    light: "#FF8C61",
    dark: "#E5572D",
    bg: "#FF6B35",
  },
  warzone: {
    primary: "#00D9FF",
    light: "#33E3FF",
    dark: "#00C3E6",
    bg: "#00D9FF",
  },
  bf6: {
    primary: "#00FF85",
    light: "#33FFA0",
    dark: "#00E676",
    bg: "#00FF85",
  },
  thefinals: {
    primary: "#FF00FF",
    light: "#FF33FF",
    dark: "#E600E6",
    bg: "#FF00FF",
  },
  df: {
    primary: "#FFC400",
    light: "#FFD84D",
    dark: "#E6B000",
    bg: "#FFC400",
  },
} as const;

export type GameId = keyof typeof gameColors;

export function getGameColor(gameId: string | undefined): typeof gameColors.mw4 {
  if (!gameId) return gameColors.mw4;
  const normalizedId = gameId.toLowerCase();
  return gameColors[normalizedId as GameId] || gameColors.mw4;
}
