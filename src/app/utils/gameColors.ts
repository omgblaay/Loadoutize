export const gameColors = {
  blackops7: {
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
} as const;

export type GameId = keyof typeof gameColors;

export function getGameColor(gameId: string | undefined): typeof gameColors.blackops7 {
  if (!gameId) return gameColors.blackops7;
  const normalizedId = gameId.toLowerCase();
  return gameColors[normalizedId as GameId] || gameColors.blackops7;
}
