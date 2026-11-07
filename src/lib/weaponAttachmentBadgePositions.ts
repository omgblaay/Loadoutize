export interface BadgePosition {
  /** Percent (0-100) from the left edge of the weapon image box. */
  x: number;
  /** Percent (0-100) from the top edge of the weapon image box. */
  y: number;
}

/** Ellipse radius (percent of the image box) that badges are spread around. */
const OVAL_RADIUS = { x: 50, y: 55 };

/** 0° is the left edge; positive angles travel upward across the oval. */
function ovalPositionAtDegrees(degrees: number, radius: { x: number; y: number } = OVAL_RADIUS): BadgePosition {
  const angle = (degrees / 180) * Math.PI;
  return {
    x: 50 - Math.cos(angle) * radius.x,
    y: 50 - Math.sin(angle) * radius.y,
  };
}

/**
 * Generic slot -> position layout: every attachment slot sits at a fixed
 * spot on an oval hugging the image box, rather than being pinned to where
 * that part actually sits on the weapon. Angles begin at 0° on the left and
 * travel over the top, down the right side, and around the bottom. Applied to
 * every weapon unless a per-weapon override exists below.
 */
const OVAL_ANGLE_DEGREES: Record<string, number> = {
  muzzle: 0,
  laser: 32,
  barrel: 64,
  optic: 96,
  stock: 128,
  guard: 160,
  reargrip: 192,
  magazine: 224,
  apex: 270,
  underbarrel: 300,
  trigger: 330,
};

const SLOT_ALIASES: Record<string, string> = {
  ammo: "magazine",
  mag: "magazine",
  handguard: "guard",
};

const normalizeSlot = (slug: string) => slug.toLowerCase().replace(/[^a-z0-9]/g, "");

export const defaultAttachmentBadgePositions: Record<string, BadgePosition> =
  Object.fromEntries(
    Object.entries(OVAL_ANGLE_DEGREES).map(([slug, degrees]) => [
      slug,
      ovalPositionAtDegrees(degrees),
    ]),
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

  const normalizedSlug = normalizeSlot(typeSlug);
  const canonicalSlug = SLOT_ALIASES[normalizedSlug] ?? normalizedSlug;
  const generic = defaultAttachmentBadgePositions[canonicalSlug];
  if (generic) return generic;

  const degrees = (fallbackIndex / Math.max(fallbackTotal, 1)) * 360;
  return ovalPositionAtDegrees(degrees, FALLBACK_RADIUS);
}
