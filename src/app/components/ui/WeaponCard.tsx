import { WeaponImage } from "./WeaponImage";
import { Tag } from "./tag";
import { cn } from "./utils";
import { Check } from "lucide-react";
import { FireCardEffect } from "./FireCardEffect";

type Weapon = {
  name: string;
  typeShort?: string | null;
  imageUrl?: string | null;
};

/**
 * Shared weapon card -- image, name, type tag -- used everywhere a weapon is
 * shown as a compact tile: the Meta tier lists, the homepage's top weapons,
 * and the loadout builder's weapon picker. `selected`/`disabled` opt into the
 * picker's selection styling (checkmark badge, dimmed when at the pick
 * limit); `stat` opts into Meta's rating/loadout-count line. Neither is
 * required, so the same component covers plain "navigate on click" usage too.
 */
export function WeaponCard({
  weapon,
  onSelect,
  selected = false,
  disabled = false,
  stat,
  className,
  fire = false,
}: {
  weapon: Weapon;
  onSelect: () => void;
  selected?: boolean;
  disabled?: boolean;
  stat?: string;
  className?: string;
  /** Layers a shader flame effect over the card's edge -- reserve for a single standout card (e.g. the #1 meta weapon), not whole grids: each instance is its own WebGL context. */
  fire?: boolean;
}) {
  return (
    <div className="relative">
      {fire && <FireCardEffect radius={12} margin={{ x: 14, top: 30, bottom: 10 }} />}
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "relative rounded-xl border transition-all flex flex-col p-2 sm:p-4 w-full h-full",
        selected
          ? "border-white/60 bg-white/[0.05]"
          : "border-white/[0.08] bg-[#121111] hover:border-white/20 hover:bg-[#171417]",
        disabled && "opacity-40 cursor-not-allowed",
        className,
      )}
    >
      {selected && (
        <span className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-white/10">
          <Check size={15} />
        </span>
      )}

        <WeaponImage imageUrl={weapon.imageUrl} variant="large" alt={weapon.name} />

      <div className="flex gap-2 items-center w-full">

        <p className="font-mono text-left text-xs"><span className="uppercase text-teritary">{weapon.typeShort} • </span>{weapon.name}</p>
      </div>
      {stat && <p className="text-xs font-teritary">{stat}</p>}
    </button>
    </div>
  );
}
