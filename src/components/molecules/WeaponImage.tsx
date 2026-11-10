import { getAttachmentBadgePosition, getOvalAttachmentBadgePosition, getOvalAttachmentBadgeTransform } from "@/lib/weaponAttachmentBadgePositions";
import { getAttachmentHighlightRegion } from "@/lib/weaponAttachmentHighlightRegions";
import { AppTooltip } from "@/components/atoms/Tooltip";
import { Skeleton } from "@/components/atoms/Skeleton";
import { WeaponSpriteCanvas } from "@/components/molecules/WeaponSpriteCanvas";
import { WeaponPreviewSmoke } from "@/components/molecules/WeaponPreviewSmoke";
import { getWeaponPreviewRef } from "@/lib/weaponSpritePreview";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

export interface WeaponImageBadge {
  key: string;
  assetId?: string;
  /** attachment_types.slug for the equipped attachment, used to place the badge. */
  typeSlug: string;
  label: string;
  subtypeLabel?: string | null;
  iconUrl?: string | null;
  isApex?: boolean;
  to?: string;
}

const BADGE_SIZE_CLASSES: Record<"small" | "large" | "default", string> = {
  small: "w-8 h-8",
  large: "w-11 h-11",
  default: "w-8 h-8",
};

export function WeaponImage({
  imageUrl,
  variant,
  alt = "",
  weaponId,
  badges,
  highlightSlugs,
  activeBadgeKey,
  onBadgeHover,
  showSkeleton = true,
  loading = false,
  imageLoading = "eager",
  enableSpritePreview = false,
  fitSpriteToBounds = false,
  showPreviewBackground = false,
  ovalBadgeLabels = false,
}: {
  imageUrl?: string | null;
  variant?: "small" | "large";
  /** Shows the shared loading placeholder while the weapon asset is downloading. Enabled by default. */
  showSkeleton?: boolean;
  /** Keeps the skeleton visible while the parent is still resolving the image URL. */
  loading?: boolean;
  imageLoading?: "eager" | "lazy";
  /** Uses the calibrated MW4 sprite compositor when a verified weapon recipe exists. */
  enableSpritePreview?: boolean;
  /** Fit the visible assembled sprite to the image area on compact cards. */
  fitSpriteToBounds?: boolean;
  /** Shows the cropped white smoke behind the assembled weapon preview. */
  showPreviewBackground?: boolean;
  /** Shows labeled attachment callouts around the weapon on desktop. */
  ovalBadgeLabels?: boolean;
  alt?: string;
  /** weapons.id, used to look up per-weapon badge position overrides. */
  weaponId?: string;
  /** Equipped attachments to render as positioned icon badges over the image. */
  badges?: WeaponImageBadge[];
  /** attachment_types.slugs to tint yellow over the image, e.g. the part just added in the builder. */
  highlightSlugs?: string[];
  activeBadgeKey?: string | null;
  onBadgeHover?: (key: string | null) => void;
}) {
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [spriteReady, setSpriteReady] = useState(false);
  const spriteSupported = Boolean(
    enableSpritePreview && getWeaponPreviewRef(weaponId),
  );
  const spriteAttachmentKey =
    badges
      ?.map((badge) => `${badge.typeSlug}:${badge.assetId ?? badge.label}`)
      .join("|") ?? "";
  const markSpriteReady = useCallback(() => setSpriteReady(true), []);
  const markSpriteUnavailable = useCallback(() => setSpriteReady(false), []);

  useEffect(() => {
    setSpriteReady(false);
  }, [weaponId, spriteAttachmentKey]);
  const isLoading =
    showSkeleton &&
    (loading ||
      (Boolean(imageUrl) &&
        loadedImageUrl !== imageUrl &&
        failedImageUrl !== imageUrl));

  const getVariantClasses = () => {
    switch (variant) {
      case "small":
        return "!w-[250px] max-w-[100rem]";
      case "large":
        return "w-[100%] max-w-[32rem]";
      default:
        return "max-w-[100rem]";
    }
  };

  const badgeSizeClass = BADGE_SIZE_CLASSES[variant ?? "default"];

  return (
    <div
      className={`relative w-full ${getVariantClasses()} `}
      aria-busy={isLoading || undefined}
    >
      {isLoading && (
        <Skeleton className="absolute inset-0 z-20 aspect-2/1 rounded-md !bg-[#171417]" />
      )}
      {showPreviewBackground && spriteSupported && spriteReady && (
        <WeaponPreviewSmoke />
      )}
      <img
        src={imageUrl ?? undefined}
        alt={alt}
        loading={imageLoading}
        decoding="async"
        className={`relative z-[1] w-full aspect-2/1 transition-opacity duration-200 ${isLoading || spriteReady ? "opacity-0" : "opacity-100"}`}
        onLoad={() => imageUrl && setLoadedImageUrl(imageUrl)}
        onError={() => imageUrl && setFailedImageUrl(imageUrl)}
        // brightness-200 saturate-0
      />
      {spriteSupported && weaponId && (
        <div
          className={`absolute inset-0 z-[2] transition-opacity duration-200 ${spriteReady ? "opacity-100" : "opacity-0"}`}
        >
          <WeaponSpriteCanvas
            weaponId={weaponId}
            weaponName={alt}
            attachments={badges ?? []}
            fitToBounds={fitSpriteToBounds}
            onReady={markSpriteReady}
            onError={markSpriteUnavailable}
          />
        </div>
      )}
      {!spriteReady && highlightSlugs && highlightSlugs.length > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {highlightSlugs.map((slug) => {
            const region = getAttachmentHighlightRegion(weaponId, slug);
            if (!region) return null;
            return (
              <div
                key={slug}
                className="absolute bg-yellow-400 rounded-sm"
                style={{
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.width}%`,
                  height: `${region.height}%`,
                  mixBlendMode: "color",
                }}
              />
            );
          })}
        </div>
      )}
      {(!spriteReady || ovalBadgeLabels) && badges && badges.length > 0 && (
        <div
          className={`${ovalBadgeLabels ? "pointer-events-none absolute inset-0 hidden lg:block" : "pointer-events-none absolute inset-0"}`}
        >
          {badges.map((badge, index) => {
            const ovalPosition = ovalBadgeLabels
              ? getOvalAttachmentBadgePosition(weaponId, badge.typeSlug, badge.assetId, index, badges.length)
              : null;
            const position = ovalPosition ?? getAttachmentBadgePosition(weaponId, badge.typeSlug, index, badges.length);
            const isActive = activeBadgeKey === badge.key;
            const isDimmed = activeBadgeKey != null && !isActive;

            const ovalPercent = ovalPosition?.percent ?? 0;
            const transform = getOvalAttachmentBadgeTransform(ovalPercent);
            const content = ovalBadgeLabels ? (
              <div className="flex w-[200px] items-center gap-2 rounded-lg border border-white/5 bg-[#151315]/95 py-1.5 pl-1.5 pr-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
                  {badge.iconUrl ? (
                    <img
                      src={badge.iconUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-white/70">
                      {badge.label.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-white">
                    {badge.label}
                  </span>
                  <span className="truncate text-[9px] uppercase tracking-[0.1em] text-white/50">
                    {badge.subtypeLabel || badge.typeSlug}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex size-full items-center justify-center">
                {badge.iconUrl ? (
                  <img
                    src={badge.iconUrl}
                    alt={badge.label}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-contain p-1"
                  />
                ) : (
                  <span className="text-sm font-semibold text-white/70 leading-none">
                    {badge.label.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            );

            return (
              <AppTooltip
                key={badge.key}
                content={
                  badge.subtypeLabel ? (
                    <span className="flex flex-col gap-0.5">
                      <span>{badge.label}</span>
                      <span className="uppercase text-white/60">{badge.subtypeLabel}</span>
                    </span>
                  ) : badge.label
                }
              >
                <div
                  onPointerEnter={() => onBadgeHover?.(badge.key)}
                  onPointerLeave={() => onBadgeHover?.(null)}
                  className={[
                    "absolute flex items-center justify-center pointer-events-auto transition-[opacity,transform,border-color,box-shadow] duration-200 ease-out",
                    ovalBadgeLabels
                      ? "z-10"
                      : `-translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border ${badgeSizeClass} ${isActive ? "z-10 scale-125 bg-black border-white/80 shadow-[0_0_0_3px_rgba(255,255,255,0.10)]" : "bg-black/80 border-white/25"}`,
                    isDimmed ? "opacity-30" : "opacity-100",
                  ].join(" ")}
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    ...(ovalBadgeLabels ? { transform } : {}),
                  }}
                >
                  {badge.to && ovalBadgeLabels ? (
                    <Link
                      to={badge.to}
                      className="pointer-events-auto rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </div>
              </AppTooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}
