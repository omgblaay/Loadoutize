import * as React from "react";
import { WeaponImage } from "./WeaponImage";
import { Tag } from "./tag";

export interface CardLoadout {
  id: string;
  gameId: string;
  name: string;
  description?: string;
  weapons: any[];
  userName: string;
  likes: number;
  score: number;
  ratingPercent: number | null;
  views: number;
  tagId?: number | null;
}

export interface CardWeapon {
  id: string;
  name: string;
  type: string | null;
  typeShort?: string | null;
  imageUrl?: string | null;
}

export interface CardAttachment {
  id: string;
  name: string;
  type: string | null;
  imageUrl?: string | null;
}

export interface CardTag {
  id: number;
  name: string;
  color: string;
}

const MAX_ATTACHMENT_ICONS = 10;


function RatingRing({ percent, accent }: { percent: number | null; accent: string }) {
  if (percent == null) {
    return (
      <div
        className="relative shrink-0 size-14 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.1)" }}
      >
        <div className="absolute inset-[3px] rounded-full bg-[#201e1f] border border-white/5 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-teritary tracking-[-0.3px]">New</span>
        </div>
      </div>
    );
  }
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

export function LoadoutCard({
  loadout,
  weapons,
  attachments,
  tags,
  accent,
  gameShort,
  index,
  onClick,
}: {
  loadout: CardLoadout;
  weapons: CardWeapon[];
  attachments: CardAttachment[];
  tags: CardTag[];
  accent: string;
  gameShort: string;
  index: number;
  onClick: () => void;
}) {
  const primaryWeaponId = loadout.weapons?.[0]?.id;
  const primaryWeaponData = weapons.find((w) => w.id === primaryWeaponId);
  const primaryWeapon = primaryWeaponData?.name || "SGX 124";
  const primaryAttachments: Record<string, string> = loadout.weapons?.[0]?.attachments || {};
  const attachmentIcons = Object.entries(primaryAttachments)
    .map(([type, name]) => attachments.find((a) => a.type === type && a.name === name))
    .filter((a): a is CardAttachment => Boolean(a))
    .slice(0, MAX_ATTACHMENT_ICONS);
  const tag = loadout.tagId != null ? tags.find((t) => t.id === loadout.tagId) : undefined;
  const glowColor = tag?.color ?? accent;

  return (
    <button
      onClick={onClick}
      className="relative bg-[#100D10] rounded-xl border border-white/[0.08] hover:bg-[#1a161a] hover:border-white/20 transition-all flex flex-col text-left overflow-hidden w-full"
      style={{
        boxShadow: "0px 30px 70px -36px rgba(0,0,0,0.85)",
      }}
    >
      <div
        className="absolute bottom-[-50%] right-[-50%] top-0 left-0 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 50%)`, opacity: 0.16 }}
      />

      <div className="relative flex p-4 items-start gap-[9px] w-full">
        <RatingRing percent={loadout.ratingPercent} accent={accent} />
        <div className="flex-1 min-w-0 flex flex-col gap-0 justify-center">
          <p className="text-lg font-semibold">{loadout.name}</p>
          <p className="text-sm text-teritary truncate">{loadout.description}</p>
        </div>
      </div>

      <div className="px-4 pb-4 flex flex-col items-center w-full">

          <WeaponImage imageUrl={primaryWeaponData?.imageUrl} variant="small" />
        <div className="flex items-center justify-center gap-2 w-full">

          <Tag color={""}>{primaryWeaponData?.typeShort || gameShort}</Tag>
          <p className="w-full font-mono text-body text-sm">{primaryWeapon}</p>
          <Tag color={loadout.tagId ? tags.find((t) => t.id === loadout.tagId)?.color : undefined}>
          {tag?.name}
          </Tag>
        </div>

      </div>

      {attachmentIcons.length > 0 && (
        <div className="relative flex items-center w-full">
          {attachmentIcons.map((a) => (
            <div
              key={a.id}
              className="bg-gradient-to-b from-white/0 from-[60%] to-white/[0.08] opacity-80 p-2 border w-full border-white/12 h-14 flex items-center justify-center"
            >
              <img src={a.imageUrl ?? undefined} alt={a.name} className="max-size-6 object-contain" />
            </div>
          ))}
        </div>
      )}

      <div className="absolute inset-0 rounded-xl pointer-events-none shadow-[inset_0px_0px_0px_1px_rgba(255,255,255,0.07)]" />
    </button>
  );
}
