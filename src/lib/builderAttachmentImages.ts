import type { BuilderRelationAsset } from "@/lib/weaponBuilderRelations";

const CATALOG_URL = "/weapon-preview/weapon-builder/catalog.json";
let catalogPromise: Promise<BuilderRelationAsset[]> | null = null;

// Icon-only matches for source labels that are not yet named in the builder
// catalog. These do not set a compositor asset ID for the saved loadout.
const sourceIconAssetIds: Record<string, string> = {
  "Sakin Rubber Grip [CODMunity VEL 46]": "rex_pgrip_mpapa7",
  "Cronen 56 [CODMunity Cronen Osprey]": "rex_pgrip_aim_cromeo",
  "XRK Mil-Tac Suppressor [CODMunity Cronen Osprey]": "rex_sil_tac_a",
  "60 Round Mag [CODMunity Cronen Osprey]": "rex_xmag_cromeo",
  "Ivanov QR600 [CODMunity KG-7 Vulcan]": "rex_sil_svictor98",
};

export function loadBuilderAttachmentAssets(): Promise<BuilderRelationAsset[]> {
  catalogPromise ??= fetch(CATALOG_URL, { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("Could not load weapon builder assets");
      return response.json();
    })
    .then((catalog: { assets?: BuilderRelationAsset[] }) =>
      Array.isArray(catalog.assets) ? catalog.assets : [])
    .catch((error) => {
      catalogPromise = null;
      throw error;
    });
  return catalogPromise;
}

export function builderAttachmentImageUrl(
  assetId: string | undefined,
  assetsById: Map<string, BuilderRelationAsset>,
  attachmentName?: string,
): string | null {
  const iconAssetId = assetId || (attachmentName ? sourceIconAssetIds[attachmentName] : undefined);
  const src = iconAssetId ? assetsById.get(iconAssetId)?.src : null;
  return src ? new URL(src, new URL(CATALOG_URL, window.location.origin)).toString() : null;
}
