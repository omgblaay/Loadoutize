import { useEffect, useMemo, useRef } from "react";
import {
  createPreviewBuild,
  getWeaponPreviewRef,
  resolveCatalogAssetUrls,
  type SpriteLibrary,
  type SpritePreviewAttachment,
} from "@/lib/weaponSpritePreview";
import {
  WeaponSpriteCompositor,
  factoryBuild,
} from "@/lib/weaponSpriteCompositor.js";

const CATALOG_URL = "/weapon-preview/weapon-builder/catalog.json";
const PLACEMENTS_URL = "/weapon-preview/weapon-builder/placement-overrides.json";

type PlacementOverrides = Record<string, Record<string, { dx: number; dy: number; scale: number }>>;
let libraryPromise: Promise<{ library: SpriteLibrary; placements: PlacementOverrides }> | null = null;

function loadLibrary() {
  libraryPromise ??= Promise.all([fetch(CATALOG_URL), fetch(PLACEMENTS_URL)])
    .then(async ([catalogResponse, placementsResponse]) => {
      if (!catalogResponse.ok || !placementsResponse.ok) {
        throw new Error("Weapon preview calibration is unavailable.");
      }
      const [catalog, placements] = await Promise.all([
        catalogResponse.json() as Promise<SpriteLibrary>,
        placementsResponse.json() as Promise<PlacementOverrides>,
      ]);
      return { library: resolveCatalogAssetUrls(catalog, CATALOG_URL), placements };
    });
  return libraryPromise;
}

export function WeaponSpriteCanvas({
  weaponId,
  weaponName,
  attachments,
  onReady,
  onError,
}: {
  weaponId: string;
  weaponName: string;
  attachments: SpritePreviewAttachment[];
  onReady: () => void;
  onError: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const attachmentKey = useMemo(
    () => attachments.map((item) => `${item.typeSlug}:${item.assetId ?? item.label}`).join("|"),
    [attachments],
  );

  useEffect(() => {
    const previewRef = getWeaponPreviewRef(weaponId);
    const canvas = canvasRef.current;
    if (!previewRef || !canvas) {
      onError();
      return;
    }

    let cancelled = false;
    onError();

    void loadLibrary()
      .then(async ({ library, placements }) => {
        const weapon = library.weapons.find((item) => item.id === previewRef);
        if (!weapon) throw new Error(`Missing sprite recipe for ${previewRef}.`);

        const catalog = {
          ...library,
          ...weapon,
          weapon: weapon.id,
          assets: library.assets,
          placement_overrides: {
            ...(weapon.default_placement_overrides as PlacementOverrides[string] | undefined),
            ...(placements[weapon.id] ?? {}),
          },
        };
        const state = {
          ...factoryBuild(catalog),
          ...createPreviewBuild(weapon, library.assets, attachments),
        };

        const renderer = new WeaponSpriteCompositor(catalog);
        await renderer.load(state);
        if (cancelled) return;
        renderer.render(canvas, state);
        onReady();
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("Falling back to the catalog weapon image:", error);
        onError();
      });

    return () => {
      cancelled = true;
    };
  }, [attachmentKey, onError, onReady, weaponId]);

  return (
    <canvas
      ref={canvasRef}
      width={1024}
      height={512}
      role="img"
      aria-label={`${weaponName} with selected attachments`}
      className="absolute inset-0 size-full object-contain"
    />
  );
}
