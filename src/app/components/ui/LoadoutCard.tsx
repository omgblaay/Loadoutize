import * as React from "react";
import { Link } from "react-router";
import { WeaponImage, type WeaponImageBadge } from "./WeaponImage";
import { Tag } from "./tag";
import { RatingRing } from "./rating-ring";
import { FireCardEffect } from "./FireCardEffect";
import { VIDEO_PLATFORM_META, type LoadoutVideo } from "../../utils/video";

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
  video?: LoadoutVideo | null;
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
  typeSlug?: string | null;
  imageUrl?: string | null;
}

export interface CardTag {
  id: number;
  name: string;
  color: string;
}

const MAX_ATTACHMENT_ICONS = 10;


export function LoadoutCard({
  loadout,
  weapons,
  attachments,
  tags,
  accent,
  gameShort,
  index,
  to,
  fire = false,
}: {
  loadout: CardLoadout;
  weapons: CardWeapon[];
  attachments: CardAttachment[];
  tags: CardTag[];
  accent: string;
  gameShort: string;
  index: number;
  /** Route to the loadout's own page -- rendered as a real `<a href>` (via react-router's Link) so search engines and "open in new tab" can follow it, not just an onClick handler. */
  to: string;
  /** Layers a shader flame effect over the card's edge -- reserve for a single standout card (e.g. the #1 ranked loadout), not whole grids: each instance is its own WebGL context. */
  fire?: boolean;
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
  const glowColor = tag?.color;


  return (
    <div className="relative w-full">
      {fire && <FireCardEffect radius={12} />}
    <Link
      to={to}
      className="relative bg-card rounded-2xl border border-white/[0.08] hover:bg-[#1a161a] hover:border-white/20 hover:-translate-y-1 transition-all duration-100 flex flex-col text-left overflow-hidden w-full h-full"
      // style={{
      //   boxShadow: "0px 30px 70px -36px rgba(0,0,0,0.85)",
      // }}
    >
      <div
        className="absolute bottom-[-50%] right-[-50%] w-[320px] h-[320px] blur-[160px] opacity-[32%] pointer-events-none"
        style={{ background: glowColor}}
      />

      <div className="relative flex p-4 items-start gap-4 w-full">
        <RatingRing
          percent={loadout.ratingPercent}
          size={56}
          innerClassName="border border-white/5"
          labelClassName={
            loadout.ratingPercent == null ? "text-[10px] text-teritary" : "text-[11px] text-[#fafafa]"
          }
          fallbackLabel="New"
        />
        <div className="flex-1 min-w-0 flex flex-col gap-0 justify-center">
          <p className="text-lg font-semibold">{loadout.name}</p>
          <p className="text-sm text-teritary truncate">{loadout.description}</p>
        </div>
        {loadout.video && (
          <div
            title={`Video: ${VIDEO_PLATFORM_META[loadout.video.platform].label}`}
          >
            {React.createElement(VIDEO_PLATFORM_META[loadout.video.platform].icon, {
              className: "size-5 saturate-0 brightness-200",
            })}
          </div>
        )}
      </div>
      <div className="h-full flex items-center my-6 mx-6 justify-center relative" >
        <WeaponImage
          imageUrl={primaryWeaponData?.imageUrl}
          weaponId={primaryWeaponId}
          badges={attachmentIcons.map(
            (a): WeaponImageBadge => ({
              key: a.id,
              typeSlug: a.typeSlug || a.type || "",
              label: a.name,
              iconUrl: a.imageUrl,
            }),
          )}
        />

        </div>
      <div className="p-4 pt-0 flex flex-col items-center w-full">
        
        <div className="flex mt-2 items-center justify-center gap-2 w-full">

          <Tag color={""}>{primaryWeaponData?.typeShort || gameShort}</Tag>
          <p className="flex-1 font-mono text-body text-sm">{primaryWeapon}</p>

          <p className="font-handwritten antialiased" style={{ color: tag?.color ?? accent, fontSize: "1.1rem" }} >
          {tag?.name}</p>
          {/*}
          <Tag color={loadout.tagId ? tags.find((t) => t.id === loadout.tagId)?.color : undefined}>
          {tag?.name}
          </Tag> */}
        </div>

      </div>

      {/* {attachmentIcons.length > 0 && (
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
      )} */}

      <div className="absolute inset-0 rounded-xl pointer-events-none shadow-[inset_0px_0px_0px_1px_rgba(255,255,255,0.07)]" />
    </Link>
    </div>
  );
}
