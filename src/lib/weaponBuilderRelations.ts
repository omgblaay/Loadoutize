import { normalizePreviewSlot } from "./weaponSpritePreview";

export interface BuilderRelationAsset {
  id: string;
  slot: string;
  title?: string;
  display_name?: string | null;
  locked_slots?: string[];
  dependencies?: Record<string, string>;
  default_parts?: Record<string, string>;
}

export interface BuilderAttachment {
  name: string;
  type: string;
  typeSlug?: string | null;
  stats?: { assetId?: string } | null;
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
) {
  const relation = getBuilderApexRelation(selected, attachments, assets);
  if (!relation) return selected;
  return Object.fromEntries(
    Object.entries(selected).filter(
      ([slot]) => !relation.lockedSlots.has(normalizePreviewSlot(slot)),
    ),
  );
}
