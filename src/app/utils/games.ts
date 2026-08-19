import { Crosshair, Target, Rocket, Zap } from "lucide-react";

export interface GameMetaEntry {
  name: string;
  short: string;
  icon: typeof Crosshair;
}

export const gameMeta: Record<string, GameMetaEntry> = {
  blackops7: { name: "Black Ops 7", short: "BO7", icon: Crosshair },
  warzone: { name: "Warzone", short: "WZ", icon: Target },
  bf6: { name: "Battlefield 6", short: "BF6", icon: Rocket },
  thefinals: { name: "The Finals", short: "FIN", icon: Zap },
};

export const GAME_ORDER = ["blackops7", "warzone", "bf6", "thefinals"];
