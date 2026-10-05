import { WeaponImage } from "@/components/molecules/WeaponImage";
import { Tag } from "@/components/atoms/Tag";
import { cn } from "@/lib/utils";
import { Check, ChevronRight } from "lucide-react";
import { FireCardEffect } from "@/components/atoms/FireCardEffect";

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
  variant = "default",
  selected = false,
  disabled = false,
  stat,
  className,
  fire = false,
}: {
  weapon: Weapon;
  onSelect: () => void;
  /** `compact` renders a horizontal row with a small weapon image beside its name. */
  variant?: "default" | "compact";
  selected?: boolean;
  disabled?: boolean;
  stat?: string;
  className?: string;
  /** Layers a shader flame effect over the card's edge -- reserve for a single standout card (e.g. the #1 meta weapon), not whole grids: each instance is its own WebGL context. */
  fire?: boolean;
}) {
  const isCompact = variant === "compact";

  return (
    <div className="relative h-full">
      {fire && (
        <FireCardEffect radius={12} margin={{ x: 14, top: 30, bottom: 10 }} />
      )}
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={selected ? true : undefined}
        className={cn(
          "group/weapon isolate relative flex h-full w-full overflow-hidden rounded-xl border text-left",
          "transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out",
          "hover:-translate-y-1 hover:shadow-[0_16px_35px_-22px_rgba(0,0,0,0.95)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60",
          isCompact
            ? "min-h-[76px] flex-row items-center gap-3 p-3"
            : "min-h-[164px] flex-col p-3",
          selected
            ? "border-white/50 bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
            : "border-white/[0.09] bg-[#121111] hover:border-white/25 hover:bg-[#181517]",
          disabled &&
            "cursor-not-allowed opacity-40 hover:translate-y-0 hover:border-white/[0.09] hover:bg-[#121111] hover:shadow-none",
          className,
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-70 transition-opacity duration-300 group-hover/weapon:opacity-100"
          style={{
            background:
              "radial-gradient(circle at 72% 18%, rgba(255,255,255,0.09), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.035), transparent 48%)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60" />

        {selected && (
          <span className="absolute right-2 top-2 z-20 flex size-6 items-center justify-center rounded-full border border-white/20 bg-[#fafafa] text-[#161414] shadow-lg">
            <Check size={14} strokeWidth={2.5} />
          </span>
        )}

        {isCompact ? (
          <>
            <div className="relative w-24 shrink-0 rounded-lg  px-2 py-1 sm:w-28">
              <div className="transition-transform duration-300 group-hover/weapon:scale-[1.06]">
                <WeaponImage imageUrl={weapon.imageUrl} alt={weapon.name} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              {weapon.typeShort && (
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-teritary">
                  {weapon.typeShort}
                </p>
              )}
              <p className="truncate font-mono text-sm uppercase text-[#f2eff2]">
                {weapon.name}
              </p>
              {stat && (
                <p className="mt-1 truncate text-xs text-teritary">{stat}</p>
              )}
            </div>
            <ChevronRight className="size-4 shrink-0 text-white/20 transition-[color,transform] duration-200 group-hover/weapon:translate-x-0.5 group-hover/weapon:text-white/60" />
          </>
        ) : (
          <>
            <div className="relative my-2 flex w-full flex-1 items-center justify-center rounded-lg px-2 py-2">
              <div className="w-full transition-transform duration-300 ease-out group-hover/weapon:scale-[1.06]">
                <WeaponImage imageUrl={weapon.imageUrl} alt={weapon.name} />
              </div>
              <div className="pointer-events-none absolute inset-x-4 bottom-1 h-3 rounded-full bg-black/40 blur-md" />
            </div>

            <div className="flex w-full items-center gap-2">
              <div className="flex w-full items-center justify-between gap-2">
                {weapon.typeShort ? (
                  <Tag className="relative z-10">{weapon.typeShort}</Tag>
                ) : (
                  <span />
                )}
                <p className="min-w-0 flex-1 truncate font-mono text-sm uppercase text-[#f2eff2]">
                  {weapon.name}
                </p>

                {stat && (
                  <span className="truncate rounded-md border  bg-black/20 px-2 py-1 font-mono text-[10px] text-secondary">
                    {stat}
                  </span>
                )}
              </div>

              <ChevronRight className="size-4 shrink-0 text-white/20 transition-[color,transform] duration-200 group-hover/weapon:translate-x-0.5 group-hover/weapon:text-white/60" />
            </div>
          </>
        )}
      </button>
    </div>
  );
}
