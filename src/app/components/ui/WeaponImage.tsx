import { getAttachmentBadgePosition } from "../../utils/weaponAttachmentBadgePositions";

export interface WeaponImageBadge {
  key: string;
  /** attachment_types.slug for the equipped attachment, used to place the badge. */
  typeSlug: string;
  label: string;
  iconUrl?: string | null;
}

const BADGE_SIZE_CLASSES: Record<"small" | "large" | "default", string> = {
  small: "w-6 h-6",
  large: "w-11 h-11",
  default: "w-8 h-8",
};

export function WeaponImage({
  imageUrl,
  variant,
  alt = "",
  weaponId,
  badges,
}: {
  imageUrl?: string | null;
  variant?: "small" | "large";
  alt?: string;
  /** weapons.id, used to look up per-weapon badge position overrides. */
  weaponId?: string;
  /** Equipped attachments to render as positioned icon badges over the image. */
  badges?: WeaponImageBadge[];
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
        className="flex h-full w-full items-center brightness-200 saturate-0 justify-center object-contain"
      />
      {badges && badges.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {badges.map((badge, index) => {
            const position = getAttachmentBadgePosition(weaponId, badge.typeSlug, index, badges.length);
            return (
              <div
                key={badge.key}
                title={badge.label}
                className={`absolute ${badgeSizeClass} -translate-x-1/2 -translate-y-1/2 bg-black/80 border border-white/25 rounded-sm flex items-center justify-center overflow-hidden`}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
