export interface BadgePosition {
  /** Percent (0-100) from the left edge of the weapon image box. */
  x: number;
  /** Percent (0-100) from the top edge of the weapon image box. */
  y: number;
}

/** Ellipse radius (percent of the image box) that badges are spread around. */
const OVAL_RADIUS = { x: 50, y: 55 };

/** 0° is the left edge; positive angles travel upward across the oval. */
function ovalPositionAtDegrees(
  degrees: number,
  radius: { x: number; y: number } = OVAL_RADIUS,
): BadgePosition {
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
  ironsights: 80,
  optic: 96,
  bolt: 112,
  stock: 128,
  comb: 144,
  guard: 160,
  hammer: 176,
  reargrip: 192,
  cylinder: 208,
  magazine: 224,
  ammunition: 244,
  receiver: 256,
  apex: 270,
  other: 288,
  underbarrel: 306,
  trigger: 330,
};

const SLOT_ALIASES: Record<string, string> = {
  ammo: "ammunition",
  mag: "magazine",
  handguard: "guard",
};

const normalizeSlot = (slug: string) =>
  slug.toLowerCase().replace(/[^a-z0-9]/g, "");

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

export const weaponAttachmentBadgeOverrides: Record<
  string,
  Partial<Record<string, BadgePosition>>
> = {
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

export interface OvalBadgePlacement {
  /** Position around the oval: 0 left, 25 top, 50 right, 75 bottom. */
  percent: number;
  /** Fine adjustment in percentage points of the image box. */
  x?: number;
  y?: number;
}

/** Edit these percentages to move every attachment in a slot around the oval. */
export const ovalAttachmentBadgePlacements: Record<string, OvalBadgePlacement> =
  {
    muzzle: { percent: 1.5 },
    laser: { percent: 9 },
    barrel: { percent: 18 },
    ironsights: { percent: 22 },
    optic: { percent: 27 },
    bolt: { percent: 31 },
    stock: { percent: 36 },
    comb: { percent: 40 },
    guard: { percent: 44 },
    hammer: { percent: 48 },
    reargrip: { percent: 53 },
    cylinder: { percent: 58 },
    magazine: { percent: 62 },
    ammunition: { percent: 64 },
    receiver: { percent: 71 },
    apex: { percent: 75 },
    other: { percent: 80 },
    underbarrel: { percent: 87 },
    trigger: { percent: 92 },
  };

/** Override a slot or an individual asset ID for one weapon. Asset ID wins. */
export const weaponOvalBadgeOverrides: Record<
  string,
  Record<string, Partial<OvalBadgePlacement>>
> = {
  // rex_ar_kilo2: {
  //   apex: { percent: 75, x: 2, y: -3 },
  //   rex_arscope01: { x: -2, y: 1 },
  // },
};

const LABEL_OVAL_RADIUS = { x: 58, y: 75 };

export function getOvalAttachmentBadgePosition(
  weaponId: string | undefined,
  typeSlug: string,
  assetId: string | undefined,
  fallbackIndex: number,
  fallbackTotal: number,
): BadgePosition & { percent: number } {
  const normalizedSlug = normalizeSlot(typeSlug);
  const slot = SLOT_ALIASES[normalizedSlug] ?? normalizedSlug;
  const fallback = {
    percent: (fallbackIndex / Math.max(fallbackTotal, 1)) * 100,
  };
  const placement = ovalAttachmentBadgePlacements[slot] ?? fallback;
  const overrides = weaponId ? weaponOvalBadgeOverrides[weaponId] : undefined;
  const adjusted = {
    ...placement,
    ...overrides?.[slot],
    ...(assetId ? overrides?.[assetId] : undefined),
  };
  const percent = ((adjusted.percent % 100) + 100) % 100;
  const angle = (percent / 100) * Math.PI * 2;

  return {
    percent,
    x: 50 - Math.cos(angle) * LABEL_OVAL_RADIUS.x + (adjusted.x ?? 0),
    y: 50 - Math.sin(angle) * LABEL_OVAL_RADIUS.y + (adjusted.y ?? 0),
  };
}

export function getAttachmentBadgePosition(
  weaponId: string | undefined,
  typeSlug: string,
  fallbackIndex: number,
  fallbackTotal: number,
): BadgePosition {
  const override = weaponId
    ? weaponAttachmentBadgeOverrides[weaponId]?.[typeSlug]
    : undefined;
  if (override) return override;

  const normalizedSlug = normalizeSlot(typeSlug);
  const canonicalSlug = SLOT_ALIASES[normalizedSlug] ?? normalizedSlug;
  const generic = defaultAttachmentBadgePositions[canonicalSlug];
  if (generic) return generic;

  const degrees = (fallbackIndex / Math.max(fallbackTotal, 1)) * 360;
  return ovalPositionAtDegrees(degrees, FALLBACK_RADIUS);
}
