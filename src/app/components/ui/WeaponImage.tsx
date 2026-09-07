import { getAttachmentBadgePosition } from "../../utils/weaponAttachmentBadgePositions";
import { getAttachmentHighlightRegion } from "../../utils/weaponAttachmentHighlightRegions";
import { AppTooltip } from "./tooltip";

export interface WeaponImageBadge {
  key: string;
  /** attachment_types.slug for the equipped attachment, used to place the badge. */
  typeSlug: string;
  label: string;
  iconUrl?: string | null;
  
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
}: {
  imageUrl?: string | null;
  variant?: "small" | "large";
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
  const getVariantClasses = () => {
    switch (variant) {
      case "small":
        return "!w-[250px] max-w-[100rem]";
      case "large":
        return "w-[100%] max-w-[32rem]";
      default:
        return "!w-[320px] max-w-[100rem]";
    }
  };

  const badgeSizeClass = BADGE_SIZE_CLASSES[variant ?? "default"];

  return (
    <div className={`relative ${getVariantClasses()}`}>
      <img
        src={imageUrl ?? undefined}
        alt={alt}
        className="flex h-full w-full items-center  justify-center object-contain"
        // brightness-200 saturate-0
      />
      {highlightSlugs && highlightSlugs.length > 0 && (
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
      {badges && badges.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {badges.map((badge, index) => {
  const position = getAttachmentBadgePosition(weaponId, badge.typeSlug, index, badges.length);
  const isActive = activeBadgeKey === badge.key;
  const isDimmed = activeBadgeKey != null && !isActive;

  return (
    <AppTooltip key={badge.key} content={badge.label}>
      <div
        onPointerEnter={() => onBadgeHover?.(badge.key)}
        onPointerLeave={() => onBadgeHover?.(null)}
        className={[
          "absolute -translate-x-1/2 -translate-y-1/2 rounded-sm flex items-center justify-center overflow-hidden border pointer-events-auto",
          "transition-[opacity,transform,border-color,box-shadow] duration-200 ease-out",
          badgeSizeClass,
          isActive
            ? "z-10 scale-125 bg-black border-white/80 shadow-[0_0_0_3px_rgba(255,255,255,0.10)]"
            : "bg-black/80 border-white/25",
          isDimmed ? "opacity-30" : "opacity-100",
        ].join(" ")}
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
      >
        {badge.iconUrl ? (
          <img src={badge.iconUrl} alt={badge.label} className="w-full h-full object-contain p-1" />
        ) : (
          <span className="text-[9px] font-semibold text-white/70 leading-none">
            {badge.label.slice(0, 2).toUpperCase()}
          </span>
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
