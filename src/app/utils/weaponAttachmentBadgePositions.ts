export interface BadgePosition {
  /** Percent (0-100) from the left edge of the weapon image box. */
  x: number;
  /** Percent (0-100) from the top edge of the weapon image box. */
  y: number;
}

/**
 * Generic slot -> position layout, modeled on a roughly side-profile weapon
 * silhouette centered in its image box. Applied to every weapon unless a
 * per-weapon override exists below. Keyed by attachment_types.slug.
 */
export const defaultAttachmentBadgePositions: Record<string, BadgePosition> = {
  optic: { x: 60, y: 8 },
  sight: { x: 46, y: 8 },
  laser: { x: 30, y: 4 },
  muzzle: { x: 2, y: 32 },
  barrel: { x: 24, y: 40 },
  underbarrel: { x: 24, y: 70 },
  mag: { x: 45, y: 68 },
  reargrip: { x: 65, y: 74 },
  stock: { x: 96, y: 44 },
};

/**
 * Per-weapon overrides, keyed by weapons.id, for cases where a specific
 * weapon's uploaded image is framed/cropped differently than the generic
 * layout assumes. Add entries here as individual weapon images get
 * calibrated, e.g.:
 *   xm4: { optic: { x: 50, y: 10 }, stock: { x: 92, y: 40 } }
 */
export const weaponAttachmentBadgeOverrides: Record<string, Partial<Record<string, BadgePosition>>> = {};

const FALLBACK_RADIUS = { x: 42, y: 38 };

/** Spreads slugs with no known position evenly around the image so nothing stacks at the same spot. */
function fallbackPosition(index: number, total: number): BadgePosition {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  return {
    x: 50 + Math.cos(angle) * FALLBACK_RADIUS.x,
    y: 50 + Math.sin(angle) * FALLBACK_RADIUS.y,
  };
}

export function getAttachmentBadgePosition(
  weaponId: string | undefined,
  typeSlug: string,
  fallbackIndex: number,
  fallbackTotal: number,
): BadgePosition {
  const override = weaponId ? weaponAttachmentBadgeOverrides[weaponId]?.[typeSlug] : undefined;
  if (override) return override;

  const generic = defaultAttachmentBadgePositions[typeSlug];
  if (generic) return generic;

  return fallbackPosition(fallbackIndex, fallbackTotal);
}
