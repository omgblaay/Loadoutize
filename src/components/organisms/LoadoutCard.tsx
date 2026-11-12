import type {
  CardLoadout,
  CardWeapon,
  CardAttachment,
  CardTag,
} from "@/types/loadout";
import * as React from "react";
import { Link } from "react-router";
import {
  WeaponImage,
  type WeaponImageBadge,
} from "@/components/molecules/WeaponImage";
import { Tag } from "@/components/atoms/Tag";
import { RatingRing } from "@/components/atoms/RatingRing";
import { FireCardEffect } from "@/components/atoms/FireCardEffect";
import { VIDEO_PLATFORM_META } from "@/lib/video";
import { explorePath } from "@/lib/routes";
import { AttachmentIcon } from "@/components/atoms/AttachmentIcon";
import {
  builderAttachmentImageUrl,
  loadBuilderAttachmentAssets,
} from "@/lib/builderAttachmentImages";
import { apexAttachmentIconUrl } from "@/lib/apexAttachmentIcon";
import { isApexAttachment } from "@/lib/attachmentPresentation";
import { findAttachmentForWeapon } from "@/lib/attachmentLookup";
import type { BuilderRelationAsset } from "@/lib/weaponBuilderRelations";
import { AppTooltip } from "@/components/atoms/Tooltip";

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
  const [builderAssets, setBuilderAssets] = React.useState<
    BuilderRelationAsset[]
  >([]);
  React.useEffect(() => {
    if (loadout.gameId !== "mw4") return;
    let active = true;
    loadBuilderAttachmentAssets()
      .then((assets) => {
        if (active) setBuilderAssets(assets);
      })
      .catch((error) =>
        console.error("Could not load attachment images:", error),
      );
    return () => {
      active = false;
    };
  }, [loadout.gameId]);
  const builderAssetsById = React.useMemo(
    () => new Map(builderAssets.map((asset) => [asset.id, asset])),
    [builderAssets],
  );
  const primaryWeaponId = loadout.weapons?.[0]?.id;
  const primaryWeaponData = weapons.find((w) => w.id === primaryWeaponId);
  const primaryWeapon = primaryWeaponData?.name || "SGX 124";
  const primaryAttachments: Record<string, string> =
    loadout.weapons?.[0]?.attachments || {};
  const attachmentIcons = Object.entries(primaryAttachments)
    .map(([type, name]) =>
      findAttachmentForWeapon(attachments, type, name, primaryWeaponId),
    )
    .filter((a): a is CardAttachment => Boolean(a))
    .map((attachment) => {
      const isApex =
        (attachment.typeSlug || attachment.type || "").toLowerCase() === "apex";
      return {
        ...attachment,
        imageUrl: isApex
          ? apexAttachmentIconUrl(attachment.typeImageUrl, loadout.gameId)
          : attachment.imageUrl ||
            (loadout.gameId === "mw4"
              ? builderAttachmentImageUrl(
                  attachment.stats?.assetId,
                  builderAssetsById,
                  attachment.name,
                )
              : null) ||
            attachment.stats?.imagePath ||
            null,
      };
    })
    .slice(0, MAX_ATTACHMENT_ICONS);
  const tag =
    loadout.tagId != null
      ? tags.find((t) => t.id === loadout.tagId)
      : undefined;
  const glowColor = tag?.color;
  const voteCount = loadout.likes + loadout.dislikes;
  const authorLabel =
    [
      loadout.userName,
      loadout.authorNickname ? `@${loadout.authorNickname}` : null,
    ]
      .filter(Boolean)
      .join(" ") || "Community member";

  const card = (
    <Link
      to={to}
      className="relative bg-card rounded-2xl border border-white/[0.08] hover:bg-[#1a161a] hover:border-white/20 transition-[background-color,border-color,box-shadow] duration-200 flex flex-col text-left overflow-hidden w-full h-full"
      // style={{
      //   boxShadow: "0px 30px 70px -36px rgba(0,0,0,0.85)",
      // }}
    >
      <div
        className="absolute bottom-[-100px] right-[-100px] w-[200px] h-[200px] blur-[80px] opacity-[20%] pointer-events-none"
        style={{ background: glowColor }}
      />

      <div className="relative flex p-4 items-start gap-2 w-full">
        <RatingRing
          percent={loadout.ratingPercent}
          votes={voteCount}
          size={56}
          innerClassName="border border-white/5"
          fallbackLabel="New"
        />
        {/* <h3 className="text-base antialiased wrap-anywhere">
          <span
            style={{ color: tag?.color }}
            className="font-handwritten text-xl py-4 font-light"
          >
            {tag?.name}
          </span>{" "}
          <Tag
            color={""}
            className="inline relative top-[-5px]"
            link={
              primaryWeaponData?.type
                ? explorePath(loadout.gameId, { category: primaryWeaponData.type })
                : undefined
            }
          >
            {primaryWeaponData?.typeShort || gameShort}
          </Tag>
          <span className="text-se font-sans text-teritary">{" "}{primaryWeapon}</span>
          {" "}{loadout.name}
        </h3> */}
        <div className="flex-1 min-w-0 flex flex-col gap-0 justify-center">
          <h3 className="text-base font-sans font-semibold">{loadout.name}</h3>
          {/* <p className="text-sm text-teritary truncate">
            {loadout.video && (
              <div
                className="absolute right-4 top-4"
                title={`Video: ${VIDEO_PLATFORM_META[loadout.video.platform].label}`}
              >
                {React.createElement(
                  VIDEO_PLATFORM_META[loadout.video.platform].icon,
                  {
                    className: "size-5 saturate-0 brightness-200",
                  },
                )}
              </div>
            )} 
            {loadout.description}
          </p> */}
        </div>
        <AppTooltip content={authorLabel} side="top">
          <span
            className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.08] text-xs font-semibold text-white"
            role="img"
            aria-label={authorLabel}
          >
            {loadout.authorAvatarUrl ? (
              <img
                src={loadout.authorAvatarUrl}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            ) : (
              (loadout.userName?.[0]?.toUpperCase() ?? "U")
            )}
          </span>
        </AppTooltip>
      </div>
      <div className="h-full flex items-center mt-4 mb-6 mx-10 justify-center relative">
        <WeaponImage
          imageUrl={primaryWeaponData?.imageUrl}
          loading={
            !primaryWeaponData &&
            Boolean(primaryWeaponId) &&
            weapons.length === 0
          }
          weaponId={primaryWeaponId}
          enableSpritePreview={loadout.gameId === "mw4"}
          fitSpriteToBounds
          showSkeleton
          imageLoading={index < 3 ? "eager" : "lazy"}
          badges={attachmentIcons.map(
            (a): WeaponImageBadge => ({
              key: a.id,
              assetId: a.stats?.assetId,
              typeSlug: a.typeSlug || a.type || "",
              label: a.displayName ?? a.stats?.displayName ?? a.name,
              iconUrl: a.imageUrl ?? a.stats?.imagePath,
              isApex: a.type?.toLowerCase() === "apex",
            }),
          )}
        />
      </div>
      <div className="p-4 pt-0 flex flex-col items-center w-full">
        <div className="flex mt-2 items-center justify-center gap-2 w-full">
          <Tag color={""}>{primaryWeaponData?.typeShort || gameShort}</Tag>
          <p className="flex-1 font-mono text-body uppercase text-sm">
            {primaryWeapon}
          </p>

          <p
            className="font-handwritten antialiased text-shadow-lg"
            style={{ color: tag?.color ?? accent, fontSize: "1.1rem" }}
          >
            {tag?.name}
          </p>
        </div>
      </div>

      {attachmentIcons.length > 0 && (
        <div className="relative flex items-center w-full">
          {attachmentIcons.map((a) => (
            <div
              key={a.id}
              className="bg-gradient-to-b from-white/0 from-[60%] to-white/[0.08] opacity-80 p-2 border w-full border-white/12 h-14 flex items-center justify-center"
            >
              <AttachmentIcon
                attachment={a}
                className="size-9"
                tintApex={isApexAttachment(a)}
              />
            </div>
          ))}
        </div>
      )}

      {/* <div className="absolute inset-0 rounded-xl pointer-events-none shadow-[inset_0px_0px_0px_1px_rgba(255,255,255,0.07)]" /> */}
    </Link>
  );

  return (
    <div className="relative h-full w-full transition-[transform,filter] duration-200 ease-out hover:-translate-y-1 hover:drop-shadow-[0_16px_18px_rgba(0,0,0,0.45)]">
      {fire && <FireCardEffect radius={12} />}
      {card}
    </div>
  );
}
