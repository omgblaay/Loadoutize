import { Crosshair, Rocket } from "lucide-react";

export interface CardLoadout {
  id: string;
  gameId: string;
  name: string;
  description?: string;
  weapons: any[];
  userName: string;
  likes: number;
  views: number;
}

export interface CardWeapon {
  id: string;
  name: string;
  type: string | null;
}

const TAG_CYCLE: { label: string; tone: "amber" | "teal" | "violet" | "blue" }[] = [
  { label: "Objective", tone: "amber" },
  { label: "Off meta", tone: "teal" },
  { label: "Rush", tone: "violet" },
  { label: "No recoil", tone: "blue" },
];

const tagToneStyles: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  amber: { bg: "rgba(255,162,61,0.2)", border: "rgba(255,162,61,0.5)", dot: "#ffa23d", text: "#ffc07b" },
  teal: { bg: "rgba(47,214,195,0.2)", border: "rgba(47,214,195,0.5)", dot: "#2fd6c3", text: "#97ebe1" },
  violet: { bg: "rgba(168,110,255,0.2)", border: "rgba(168,110,255,0.5)", dot: "#a86eff", text: "#d6bfff" },
  blue: { bg: "rgba(90,169,255,0.2)", border: "rgba(90,169,255,0.5)", dot: "#5aa9ff", text: "#aed4ff" },
};

function LoadoutTag({ label, tone }: { label: string; tone: keyof typeof tagToneStyles }) {
  const s = tagToneStyles[tone];
  return (
    <div
      className="h-7 pl-2 pr-[11px] rounded-[9px] border flex items-center gap-[7px] shrink-0"
      style={{ background: s.bg, borderColor: s.border }}
    >
      <span className="w-[7px] h-[7px] rounded-full" style={{ background: s.dot, boxShadow: `0 0 8px ${s.dot}` }} />
      <span className="text-[10px] tracking-[0.5px] uppercase font-semibold" style={{ color: s.text }}>
        {label}
      </span>
    </div>
  );
}

function RatingRing({ percent, accent }: { percent: number; accent: string }) {
  const color = percent >= 90 ? "#36D27A" : percent >= 70 ? accent : "#FF4D63";
  return (
    <div
      className="relative shrink-0 size-14 rounded-full flex items-center justify-center"
      style={{ background: `conic-gradient(${color} ${percent * 3.6}deg, rgba(255,255,255,0.1) 0deg)` }}
    >
      <div className="absolute inset-[3px] rounded-full bg-[#201e1f] border border-white/5 flex items-center justify-center">
        <span className="text-[11px] font-semibold text-white tracking-[-0.3px]">{percent}%</span>
      </div>
    </div>
  );
}

function WeaponArt({ accent }: { accent: string }) {
  return (
    <div
      className="w-full aspect-[407/120] rounded-xl flex items-center justify-center shrink-0"
      style={{ background: `radial-gradient(ellipse at center, ${accent}14, transparent 70%), #141213` }}
    >
      <Crosshair className="w-8 h-8" style={{ color: `${accent}80` }} />
    </div>
  );
}

export function LoadoutCard({
  loadout,
  weapons,
  accent,
  gameShort,
  index,
  onClick,
}: {
  loadout: CardLoadout;
  weapons: CardWeapon[];
  accent: string;
  gameShort: string;
  index: number;
  onClick: () => void;
}) {
  const primaryWeapon = loadout.weapons?.[0]?.name || "SGX 124";
  const rating = 95 + (index % 2) * 3;
  const tagA = TAG_CYCLE[index % TAG_CYCLE.length];
  const tagB = TAG_CYCLE[(index + 1) % TAG_CYCLE.length];

  return (
    <button
      onClick={onClick}
      className="relative rounded-[26px] border border-white/10 p-5 flex flex-col gap-4 text-left overflow-hidden w-full"
      style={{
        backgroundImage: "linear-gradient(179deg, rgb(34,28,38) 0%, rgb(17,15,18) 20%, rgb(10,9,9) 100%)",
        boxShadow: "0px 30px 70px -36px rgba(0,0,0,0.85)",
      }}
    >
      <div className="flex items-start gap-2 w-full">
        <RatingRing percent={rating} accent={accent} />
        <div className="flex-1 flex flex-col gap-2 justify-center">
          <div className="flex items-center gap-1 text-[10px] tracking-[0.5px] uppercase">
            <span className="text-white">Elite</span>
            <span className="text-white/55">•{loadout.views || 310} ratings</span>
          </div>
          <div className="inline-flex backdrop-blur-[2px] bg-black/[0.28] border border-white/[0.24] rounded-[7px] px-2.5 py-1 w-fit">
            <span className="text-[10px] tracking-[0.5px] uppercase text-white/66">Season 4</span>
          </div>
        </div>
        <div className="backdrop-blur-[2px] bg-black/[0.28] border border-white/[0.24] rounded-[7px] px-2.5 py-1 h-fit">
          <span className="text-[10px] tracking-[0.5px] uppercase text-white/66">Loadout</span>
        </div>
      </div>

      <WeaponArt accent={accent} />

      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-wrap gap-2 w-full">
          <div className="flex-1 min-w-[160px] h-10 rounded-xl bg-white/5 border border-white/[0.07] flex items-center gap-2 px-2">
            <span className="h-6 px-2.5 rounded-[10px] border border-white/[0.18] flex items-center text-[10px] tracking-[0.5px] uppercase text-[#fafafa]">
              {weapons.find((w) => w.name === primaryWeapon)?.type?.slice(0, 3).toUpperCase() || "PRI"}
            </span>
            <span className="text-[14px] text-[#fafafa]">{primaryWeapon}</span>
          </div>
          <div className="flex-1 min-w-[120px] h-10 rounded-xl bg-white/5 border border-white/[0.07] flex items-center gap-2 px-2">
            <Rocket className="w-[19px] h-[19px]" style={{ color: accent }} />
            <span className="text-[10px] tracking-[0.5px] uppercase text-white">{gameShort}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full">
          <div className="flex-1 min-w-[160px] h-8 rounded-xl bg-white/5 border border-white/[0.07] flex items-center gap-1.5 px-2">
            <span className="h-6 px-2.5 rounded-[10px] border border-white/[0.18] flex items-center text-[10px] tracking-[0.5px] uppercase text-[#fafafa]">
              PST
            </span>
            <span className="text-[14px] text-[#fafafa]">Sidearm</span>
          </div>
          <div className="flex-1 min-w-[120px] flex gap-2">
            <div className="flex-1 h-8 rounded-xl bg-white/5 border border-white/[0.07]" />
            <div className="flex-1 h-8 rounded-xl bg-white/5 border border-white/[0.07]" />
            <div className="flex-1 h-8 rounded-xl bg-white/5 border border-white/[0.07]" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        <p className="text-[16px] text-white font-semibold">{loadout.name}</p>
        <p className="text-[12px] text-white/72">
          {loadout.description || "Community build tuned for consistent objective play."}
        </p>
      </div>

      <div className="flex items-center justify-between w-full">
        <div className="flex gap-3 items-center">
          <LoadoutTag label={tagA.label} tone={tagA.tone} />
          <LoadoutTag label={tagB.label} tone={tagB.tone} />
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full border border-[#3f3c3d]"
            style={{ backgroundImage: "linear-gradient(135deg, rgb(207,206,212), rgb(64,62,67))" }}
          />
          <span className="text-[12px] text-[#fafafa]">{loadout.userName}</span>
        </div>
      </div>
    </button>
  );
}
