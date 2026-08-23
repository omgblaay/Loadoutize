import { WeaponImage } from "./WeaponImage";
import { Check } from "lucide-react";

type Weapon = {
  name: string;
  typeShort?: string;
  imageUrl?: string;
};

export function WeaponTile({
  weapon,
  isSelected,
  disabled,
  onToggle,
}: {
  weapon: Weapon;
  isSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`text-left rounded-xl items-center border p-4 flex flex-col gap-3 transition-colors ${
        isSelected ? "border-white/60 bg-white/5" : "border-white/20 hover:border-white/30"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <div className="flex justify-between *:items-center w-full gap-2">
        <span className="h-6 px-2.5 rounded-[10px] border border-white/[0.18] flex items-center text-[10px] tracking-[0.5px] uppercase text-[#fafafa]">
             {weapon.typeShort || "—"}
        </span>

      <p className="w-full font-semibold">{weapon.name}</p>
        {isSelected && <Check className="w-4 h-4 shrink-0 text-accent" />}
      </div>
        <WeaponImage variant="small" imageUrl={weapon.imageUrl} />
    </button>
  );
}
