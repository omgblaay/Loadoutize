import { WeaponImage } from "./WeaponImage";
import { Tag } from "./tag";
import { cn } from "./utils";
import { Check } from "lucide-react";

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
}: {
  weapon: Weapon;
  onSelect: () => void;
  selected?: boolean;
  disabled?: boolean;
  stat?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "relative rounded-xl border transition-all flex flex-col p-4",
        selected
          ? "border-white/60 bg-white/[0.05]"
          : "border-white/[0.08] bg-[#121111] hover:border-white/20 hover:bg-[#1a161a]",
        disabled && "opacity-40 cursor-not-allowed",
        className,
      )}
    >
      {selected && (
        <span className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-white/10">
          <Check size={15} />
        </span>
      )}
      <div className="mx-4">
        <WeaponImage imageUrl={weapon.imageUrl} />
      </div>
      <div className="flex gap-2 items-center w-full">
      {weapon.typeShort && <Tag>{weapon.typeShort}</Tag>}
        <p className="font-mono text-left text-xs">{weapon.name}</p>
      </div>
      {stat && <p className="text-xs font-teritary">{stat}</p>}
    </button>
  );
}
