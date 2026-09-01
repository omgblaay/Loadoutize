import * as React from "react";
import { solidGeometryFromViewBox } from "./geometry";
import loaderSvgRaw from "../../../../assets/loader.svg?raw";

const MATERIAL_PROPS = { color: "#fafafa", roughness: 0.35, metalness: 0.15 } as const;

// Pulls the path data + viewBox straight out of src/assets/loader.svg at
// build time (via Vite's ?raw import) rather than hand-copying the path --
// stays correct if the mark is ever re-exported from Figma.
function parseLoaderSvg(raw: string) {
  const viewBoxAttr = raw.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 1 1";
  const [, , width, height] = viewBoxAttr.trim().split(/\s+/).map(Number);
  const d = raw.match(/\sd="([^"]+)"/)?.[1] ?? "";
  return { d, width, height };
}

const LOADER_SVG = parseLoaderSvg(loaderSvgRaw);

export function LoaderMesh() {
  const geometries = React.useMemo(
    () => solidGeometryFromViewBox(LOADER_SVG.d, { width: LOADER_SVG.width, height: LOADER_SVG.height }),
    []
  );

  React.useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  return (
    <group>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial {...MATERIAL_PROPS} />
        </mesh>
      ))}
    </group>
  );
}
