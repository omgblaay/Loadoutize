import { useEffect, useMemo, useRef } from "react";
import { WeaponSpriteCompositor, factoryBuild } from "@/lib/weaponSpriteCompositor.js";
import {
  createPreviewBuild,
  getWeaponPreviewRef,
  resolveCatalogAssetUrls,
  type SpriteLibrary,
  type SpritePreviewAttachment,
} from "@/lib/weaponSpritePreview";
const CATALOG_URL = "/weapon-preview/weapon-builder/catalog.json";
const CALIBRATION_URL = "/weapon-preview/weapon-builder/source-calibration.json";

type Position = { dx?: number; dy?: number; scale?: number; rotation?: number };
type PlacementOverrides = Record<string, Record<string, Position>>;
type CalibrationOverrides = {
  placementOverrides: PlacementOverrides;
  slotMounts: Record<string, Record<string, { source: string; dx: number; dy: number }>>;
  barrelMuzzleOffsets: Record<string, Record<string, { dx: number; dy: number }>>;
};
let libraryPromise: Promise<{
  library: SpriteLibrary;
  calibration: CalibrationOverrides;
}> | null = null;

function loadLibrary() {
  libraryPromise ??= Promise.all([
    fetch(CATALOG_URL), fetch(CALIBRATION_URL),
  ]).then(async ([catalogResponse, calibrationResponse]) => {
      if (!catalogResponse.ok || !calibrationResponse.ok) {
        throw new Error("Weapon preview calibration is unavailable.");
      }
      const [catalog, calibration] = await Promise.all([
        catalogResponse.json() as Promise<SpriteLibrary>,
        calibrationResponse.json() as Promise<CalibrationOverrides>,
      ]);
      return { library: resolveCatalogAssetUrls(catalog, CATALOG_URL), calibration };
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

    void loadLibrary().then(async ({ library, calibration }) => {
        const weapon = library.weapons.find((item) => item.id === previewRef);
        if (!weapon) throw new Error(`Missing sprite recipe for ${previewRef}.`);

        const catalog = {
          ...library,
          ...weapon,
          weapon: weapon.id,
          assets: library.assets,
          placement_overrides: {
            ...(weapon.default_placement_overrides as PlacementOverrides[string] | undefined),
            ...(calibration.placementOverrides[weapon.id] ?? {}),
          },
          slot_mounts: {
            ...(weapon.default_slot_mounts as Record<string, unknown> | undefined),
            ...(calibration.slotMounts[weapon.id] ?? {}),
          },
          barrel_muzzle_offsets: {
            ...(weapon.default_barrel_muzzle_offsets as Record<string, unknown> | undefined),
            ...(calibration.barrelMuzzleOffsets[weapon.id] ?? {}),
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
