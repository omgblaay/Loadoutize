import { Crosshair, Target, Rocket, Zap, Shield } from "lucide-react";

export interface GameMetaEntry {
  name: string;
  short: string;
  icon: typeof Crosshair;
}

export const gameMeta: Record<string, GameMetaEntry> = {
  mw4: { name: "Modern Warfare 4", short: "MW4", icon: Crosshair },
  warzone: { name: "Warzone", short: "WZ", icon: Target },
  bf6: { name: "Battlefield 6", short: "BF6", icon: Rocket },
  thefinals: { name: "The Finals", short: "FIN", icon: Zap },
  df: { name: "Delta Force", short: "DF", icon: Shield },
};

// mw4 is the primary/default game for now; this will later be driven by
// per-subdomain SEO config instead of a hardcoded order.
export const GAME_ORDER = ["mw4", "warzone", "df", "thefinals", "bf6"];

// Launch config: only Modern Warfare 4 is live for now. Flip this back on to
// restore the game switcher (navbar dropdown, footer game list) and multi-game
// routing once other games are ready.
export const GAME_SELECTOR_ENABLED = false;
export const LOCKED_GAME_ID = "mw4";

// Key used to remember the last game the user picked, so switching games on
// one page (e.g. Explore) is reflected when navigating back to Home.
export const LAST_SELECTED_GAME_KEY = "loadoutize:lastSelectedGame";
