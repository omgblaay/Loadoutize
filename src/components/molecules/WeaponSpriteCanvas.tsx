import { useEffect, useMemo, useRef } from "react";
import {
  choosePreviewAsset,
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

let libraryPromise: Promise<SpriteLibrary> | null = null;

function loadLibrary() {
  libraryPromise ??= fetch(CATALOG_URL)
    .then((response) => {
      if (!response.ok) throw new Error("Weapon preview catalog is unavailable.");
      return response.json() as Promise<SpriteLibrary>;
    })
    .then((library) => resolveCatalogAssetUrls(library, CATALOG_URL));
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
    () => attachments.map((item) => `${item.typeSlug}:${item.label}`).join("|"),
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
      .then(async (library) => {
        const weapon = library.weapons.find((item) => item.id === previewRef);
        if (!weapon) throw new Error(`Missing sprite recipe for ${previewRef}.`);

        const catalog = {
          ...library,
          ...weapon,
          weapon: weapon.id,
          assets: library.assets,
        };
        const state = factoryBuild(catalog);
        for (const attachment of attachments) {
          const asset = choosePreviewAsset(weapon, library.assets, attachment);
          if (asset) state.parts[asset.slot] = asset.id;
        }

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
