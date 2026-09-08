export interface BadgePosition {
  /** Percent (0-100) from the left edge of the weapon image box. */
  x: number;
  /** Percent (0-100) from the top edge of the weapon image box. */
  y: number;
}

/** Ellipse radius (percent of the image box) that badges are spread around. */
const OVAL_RADIUS = { x: 50, y: 55 };

/** Point on the oval at `percent` of the way around it (0-100), starting at the top (0%) and going clockwise. */
function ovalPositionAtPercent(percent: number, radius: { x: number; y: number } = OVAL_RADIUS): BadgePosition {
  const angle = (percent / 100) * Math.PI * 2 - Math.PI / 2;
  return {
    x: 50 + Math.cos(angle) * radius.x,
    y: 50 + Math.sin(angle) * radius.y,
  };
}

/**
 * Generic slot -> position layout: every attachment slot sits at a fixed
 * spot on an oval hugging the image box, rather than being pinned to where
 * that part actually sits on the weapon. Each slug's percent (0-100% of the
 * way around the oval, clockwise from the top) is set by hand below, so
 * slots aren't forced to be evenly spaced -- tune a slug's number to nudge
 * just that one. Applied to every weapon unless a per-weapon override exists
 * below. Keyed by attachment_types.slug.
 */
const OVAL_ANGLE_PERCENT: Record<string, number> = {
  optic: 5,
  stock: 15,
  reargrip: 28,
  ammo: 37,
  mag: 44,
  apex: 50,
  underbarrel: 58,
  barrel: 85,
  muzzle: 70,
  laser: 95,
};

export const defaultAttachmentBadgePositions: Record<string, BadgePosition> = Object.fromEntries(
  Object.entries(OVAL_ANGLE_PERCENT).map(([slug, percent]) => [slug, ovalPositionAtPercent(percent)]),
);


/**
 * Per-weapon overrides, keyed by weapons.id, for cases where a specific
 * weapon's uploaded image is framed/cropped differently than the generic
 * layout assumes. Add entries here as individual weapon images get
 * calibrated, e.g.:
 *   xm4: { optic: { x: 50, y: 10 }, stock: { x: 92, y: 40 } }
 */


export const weaponAttachmentBadgeOverrides: Record<string, Partial<Record<string, BadgePosition>>> = {
//   m4: {
//   barrel: { x: 40, y: 30 },
//   mag: { x: 58, y:70},
//   reargrip: {x:70, y:69},
//   underbarrel: {x:30,y:55},
//   muzzle: {x:5,y:32},
//   stock: {x:84, y:45},
// },
// iso: {
//   laser: {x:35, y:0},
//   barrel: {x:35,y:25},
//   muzzle: {x:10,y:25},
//   underbarrel: {x:35,y:60},

// }
};

const FALLBACK_RADIUS = { x: 42, y: 38 };

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

  const percent = (fallbackIndex / Math.max(fallbackTotal, 1)) * 100;
  return ovalPositionAtPercent(percent, FALLBACK_RADIUS);
}
