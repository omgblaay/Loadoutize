import { useEffect, useMemo, useState } from "react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { LOCKED_GAME_ID } from "@/lib/games";
import { RatingRing } from "@/components/atoms/RatingRing";
import { Tag } from "@/components/atoms/Tag";

interface ShowcaseLoadout {
  id: string;
  name: string;
  typeShort: string | null;
  imageUrl: string;
  rating: number | null;
}

const SHOWCASE_COLUMN_COUNT = 3;
const SHOWCASE_TARGET_COUNT = 15;
const SHOWCASE_DIRECTIONS: Array<"up" | "down"> = ["up", "down", "up"];
const SHOWCASE_DURATIONS = [42, 48, 45];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ShowcaseCard({ item, scale }: { item: ShowcaseLoadout; scale: number }) {
  return (
    <div
      className="w-44 shrink-0 rounded-xl border border-white/10 bg-[#161415] p-3 flex flex-col gap-2 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.8)]"
      style={{ transform: `scale(${scale})` }}
    >
      <div className="flex items-center gap-2">
        <RatingRing percent={item.rating} size={22} innerClassName="border border-white/5" labelClassName="text-[8px] text-[#fafafa]" fallbackLabel="—" />
        <p className="text-xs font-semibold text-[#fafafa] truncate flex-1">{item.name}</p>
      </div>
      <div className="h-14 flex items-center justify-center">
        <img src={item.imageUrl} alt="" className="max-h-full max-w-full object-contain brightness-200 saturate-0 opacity-90" />
      </div>
      {item.typeShort && <Tag>{item.typeShort}</Tag>}
    </div>
  );
}

function MarqueeColumn({
  items,
  direction,
  duration,
  columnIndex,
}: {
  items: ShowcaseLoadout[];
  direction: "up" | "down";
  duration: number;
  columnIndex: number;
}) {
  if (items.length === 0) return null;
  // Doubled so a -50% translate loops seamlessly back to the start.
  const doubled = [...items, ...items];

  return (
    <div className="relative w-44 shrink-0 h-full overflow-hidden">
      <div
        className="flex flex-col gap-4"
        style={{
          animation: `${direction === "up" ? "marquee-up" : "marquee-down"} ${duration}s linear infinite`,
          willChange: "transform",
        }}
      >
        {doubled.map((item, i) => (
          <ShowcaseCard
            key={`${columnIndex}-${item.id}-${i}`}
            item={item}
            scale={0.9 + ((i * 37) % 20) / 100}
          />
        ))}
      </div>
    </div>
  );
}

export function LoadoutWall() {
  const [items, setItems] = useState<ShowcaseLoadout[]>([]);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${publicAnonKey}` };
    Promise.all([
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${LOCKED_GAME_ID}/loadouts`, { headers }).then((r) => r.json()),
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${LOCKED_GAME_ID}/weapons`, { headers }).then((r) => r.json()),
    ])
      .then(([loadoutsData, weaponsData]) => {
        const weaponById = new Map<string, any>((weaponsData.weapons ?? []).map((w: any) => [w.id, w]));
        const built: ShowcaseLoadout[] = (loadoutsData.loadouts ?? [])
          .map((l: any): ShowcaseLoadout | null => {
            const weapon = weaponById.get(l.weapons?.[0]?.id);
            if (!weapon?.imageUrl) return null;
            return {
              id: l.id,
              name: l.name,
              typeShort: weapon.typeShort ?? null,
              imageUrl: weapon.imageUrl,
              rating: l.ratingPercent ?? null,
            };
          })
          .filter((item: ShowcaseLoadout | null): item is ShowcaseLoadout => item !== null);
        setItems(shuffle(built));
      })
      .catch(() => {});
  }, []);

  const columns = useMemo(() => {
    const cols: ShowcaseLoadout[][] = Array.from({ length: SHOWCASE_COLUMN_COUNT }, () => []);
    if (items.length === 0) return cols;
    // items is already shuffled -- this just takes a random slice, repeating (via modulo) only as a
    // fallback if fewer than SHOWCASE_TARGET_COUNT real loadouts came back.
    Array.from({ length: SHOWCASE_TARGET_COUNT }, (_, i) => items[i % items.length]).forEach((item, i) => {
      cols[i % SHOWCASE_COLUMN_COUNT].push(item);
    });
    return cols;
  }, [items]);

  if (columns.every((col) => col.length === 0)) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 flex items-center justify-center gap-4" style={{ transform: "rotate(15deg) scale(1.4)" }}>
        {columns.map((col, i) => (
          <MarqueeColumn key={i} items={col} direction={SHOWCASE_DIRECTIONS[i]} duration={SHOWCASE_DURATIONS[i]} columnIndex={i} />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0909] via-transparent to-[#0a0909]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0909] via-[#0a0909]/40 to-transparent" />
    </div>
  );
}

