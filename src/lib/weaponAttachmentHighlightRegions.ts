export interface HighlightRegion {
  /** Percent (0-100) from the left edge of the weapon image box. */
  x: number;
  /** Percent (0-100) from the top edge of the weapon image box. */
  y: number;
  /** Percent width of the weapon image box. */
  width: number;
  /** Percent height of the weapon image box. */
  height: number;
}

/**
 * Generic slot -> region layout, modeled on a roughly side-profile weapon
 * silhouette centered in its image box (front/muzzle on the left, stock on
 * the right). Used to tint the part of the image an equipped attachment
 * actually occupies -- unlike the badge icons, this has to line up with the
 * real weapon art, not just be evenly spread out. Keyed by
 * attachment_types.slug.
 */
export const defaultAttachmentHighlightRegions: Record<string, HighlightRegion> = {
  // optic: { x: 49, y: 0, width: 22, height: 16 },
  sight: { x: 35, y: 0, width: 22, height: 16 },
  // laser: { x: 19, y: 0, width: 22, height: 16 },
  // muzzle: { x: 0, y: 24, width: 22, height: 16 },
  barrel: { x: 8, y: 20, width: 45, height: 25 },
  // underbarrel: { x: 13, y: 62, width: 22, height: 16 },
  mag: { x: 42, y: 45, width: 20, height: 40 },
  reargrip: { x: 65, y: 50, width: 12, height: 20 },
  stock: { x: 74, y: 36, width: 22, height: 32 },
};

/**
 * Per-weapon overrides, keyed by weapons.id, for cases where a specific
 * weapon's uploaded image is framed/cropped differently than the generic
 * layout assumes. Add entries here as individual weapon images get
 * calibrated, e.g.:
 *   xm4: { stock: { x: 82, y: 30, width: 20, height: 18 } }
 */
export const weaponAttachmentHighlightOverrides: Record<string, Partial<Record<string, HighlightRegion>>> = {};

export function getAttachmentHighlightRegion(
  weaponId: string | undefined,
  typeSlug: string,
): HighlightRegion | null {
  const override = weaponId ? weaponAttachmentHighlightOverrides[weaponId]?.[typeSlug] : undefined;
  if (override) return override;

  return defaultAttachmentHighlightRegions[typeSlug] ?? null;
}
