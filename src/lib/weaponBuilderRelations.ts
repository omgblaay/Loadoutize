import { normalizePreviewSlot } from "./weaponSpritePreview";

export const AR_OPTIC_IDS = [
  "rex_minireddot01", "rex_minireddot02", "rex_minireddot03",
  "rex_minireddot04", "rex_reflex01", "rex_reflex02", "rex_reflex03",
  "rex_reflex04", "rex_holo01", "rex_holo02", "rex_holo03",
  "rex_holo04", "rex_holo_therm01", "rex_fourx01", "rex_fourx02",
  "rex_fourx_hybcant01", "rex_fourx_hybflip01", "rex_fourx_therm01",
  "rex_arscope01", "rex_arscope_vz01", "rex_arscope_therm01",
  "rex_arscope_hybrid01", "rex_arscope_rf01",
] as const;

export const SMG_OPTIC_IDS = [
  "rex_minireddot01", "rex_minireddot02", "rex_minireddot03",
  "rex_minireddot04", "rex_reflex01", "rex_reflex02", "rex_reflex03",
  "rex_reflex04", "rex_holo01", "rex_holo02", "rex_holo03",
  "rex_holo04", "rex_holo_therm01", "rex_fourx01", "rex_fourx02",
  "rex_fourx_hybflip01", "rex_fourx_hybcant01", "rex_fourx_therm01",
] as const;

export const AR_LASER_IDS = [
  "rex_laserads_lrg02", "rex_laserads_lrg01", "rex_laserhip_lrg04",
  "rex_laserhip_lrg03", "rex_lasercant_lrg05", "rex_lasercant_lrg06",
  "rex_flashlgt_lrg01",
] as const;

export const VEL_AMMUNITION_IDS = [
  "rex_ammo_4x30_ap", "rex_ammo_4x30_fr", "rex_ammo_4x30_hp",
  "rex_ammo_4x30_hv", "rex_ammo_4x30_op",
] as const;

/** The 23 optics shared by the assault-rifle class menu. */
export function arAllowsOptic(assetId?: string): boolean {
  return Boolean(assetId && AR_OPTIC_IDS.some((id) => id === assetId));
}

export function smgAllowsOptic(assetId?: string): boolean {
  return Boolean(assetId && SMG_OPTIC_IDS.some((id) => id === assetId));
}

/** The seven laser choices in the assault-rifle class menu. */
export function arAllowsLaser(assetId?: string): boolean {
  return Boolean(assetId && AR_LASER_IDS.some((id) => id === assetId));
}

export function velAllowsAmmunition(assetId?: string): boolean {
  return Boolean(assetId && VEL_AMMUNITION_IDS.some((id) => id === assetId));
}

export interface BuilderRelationAsset {
  id: string;
  slot: string;
  src?: string;
  title?: string;
  display_name?: string | null;
  subtype_label?: string | null;
  muzzle_table?: boolean;
  underbarrel_table?: boolean;
  weapon_ids?: string[];
  muzzle_order?: number;
  underbarrel_order?: number;
  image_asset_id?: string;
  locked_slots?: string[];
  dependencies?: Record<string, string>;
  default_parts?: Record<string, string>;
}

export function mw4MuzzleAllowed(
  assetId: string | undefined,
  weaponId: string,
  assetsById: Map<string, BuilderRelationAsset>,
): boolean {
  const tableEntry = assetId ? assetsById.get(assetId) : undefined;
  return Boolean(tableEntry?.muzzle_table && tableEntry.weapon_ids?.includes(weaponId));
}

export function mw4UnderbarrelAllowed(
  assetId: string | undefined,
  weaponId: string,
  assetsById: Map<string, BuilderRelationAsset>,
): boolean {
  const tableEntry = assetId ? assetsById.get(assetId) : undefined;
  return Boolean(tableEntry?.underbarrel_table && tableEntry.weapon_ids?.includes(weaponId));
}

/** An attachment asset has one canonical name across every compatible weapon. */
export function builderAttachmentDisplayName(
  assetId: string | undefined,
  _weaponId: string | undefined,
  assetsById: Map<string, BuilderRelationAsset>,
  fallback: string,
): string {
  const asset = assetId ? assetsById.get(assetId) : undefined;
  return asset?.display_name || fallback;
}

export interface BuilderAttachment {
  name: string;
  type: string;
  typeSlug?: string | null;
  stats?: { assetId?: string } | null;
}

export function strigaDreadlineSelected(
  selected: Record<string, string>,
  attachments: BuilderAttachment[],
  weaponId?: string,
): boolean {
  if (weaponId !== "rex_sm_pmike63") return false;
  const barrelName = Object.entries(selected).find(
    ([slot]) => normalizePreviewSlot(slot) === "barrel",
  )?.[1];
  return attachments.some((attachment) =>
    attachment.name === barrelName && attachment.stats?.assetId === "rex_bar_hvy_pmike63");
}

export interface LockedBuilderSlot {
  slot: string;
  included?: boolean;
  includedPart?: string;
}

export interface BuilderApexRelation {
  apexName: string;
  lockedSlots: Map<string, LockedBuilderSlot>;
}

/** The catalog's APEX recipe is the source of truth for controlled slots. */
export function getBuilderApexRelation(
  selected: Record<string, string>,
  attachments: BuilderAttachment[],
  assets: BuilderRelationAsset[],
): BuilderApexRelation | null {
  const apexEntry = Object.entries(selected).find(
    ([slot, value]) => normalizePreviewSlot(slot) === "apex" && Boolean(value),
  );
  if (!apexEntry) return null;

  const apex = attachments.find(
    (attachment) =>
      normalizePreviewSlot(attachment.typeSlug || attachment.type) === "apex" &&
      attachment.name === apexEntry[1],
  );
  const recipe = assets.find((asset) => asset.id === apex?.stats?.assetId);
  if (!recipe) return null;

  const lockedSlots = new Map<string, LockedBuilderSlot>();
  for (const slot of recipe.locked_slots ?? []) {
    lockedSlots.set(normalizePreviewSlot(slot), { slot });
  }
  for (const [slot, id] of Object.entries({
    ...recipe.default_parts,
    ...recipe.dependencies,
  })) {
    const part = assets.find((asset) => asset.id === id);
    lockedSlots.set(normalizePreviewSlot(slot), {
      slot,
      included: true,
      includedPart: part?.display_name || undefined,
    });
  }
  return { apexName: recipe.display_name || recipe.title || apexEntry[1], lockedSlots };
}

export function applyBuilderRelations(
  selected: Record<string, string>,
  attachments: BuilderAttachment[],
  assets: BuilderRelationAsset[],
  weaponId?: string,
) {
  const relation = getBuilderApexRelation(selected, attachments, assets);
  const blockedComb = rezi12NoStockBlocksComb(selected, attachments, weaponId);
  const hiddenMw4Slots = weaponId?.startsWith("rex_")
    ? new Set(["iron_sights", "other"])
    : null;
  const striga = weaponId === "rex_sm_pmike63";
  const strigaUnderbarrelBlocked = striga &&
    !strigaDreadlineSelected(selected, attachments, weaponId);
  if (!relation && !blockedComb && !Object.keys(selected).some(
    (slot) => hiddenMw4Slots?.has(normalizePreviewSlot(slot)),
  ) && !striga) return selected;
  return Object.fromEntries(
    Object.entries(selected).filter(
      ([slot]) =>
        !hiddenMw4Slots?.has(normalizePreviewSlot(slot)) &&
        !(striga && normalizePreviewSlot(slot) === "guard") &&
        !(strigaUnderbarrelBlocked && normalizePreviewSlot(slot) === "underbarrel") &&
        !relation?.lockedSlots.has(normalizePreviewSlot(slot)) &&
        !(normalizePreviewSlot(slot) === "comb" && blockedComb),
    ),
  );
}

export function rezi12NoStockBlocksComb(
  selected: Record<string, string>,
  attachments: BuilderAttachment[],
  weaponId?: string,
): boolean {
  if (weaponId !== "rex_sh_bmike3") return false;
  const stockName = Object.entries(selected).find(
    ([slot]) => normalizePreviewSlot(slot) === "stock",
  )?.[1];
  return attachments.some(
    (attachment) =>
      attachment.name === stockName &&
      attachment.stats?.assetId === "rex_stockno_bmike3",
  );
}
