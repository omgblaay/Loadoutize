import * as React from "react";
import * as THREE from "three";
import { ICON_PATHS, type NavIconKey } from "./paths";
import { solidGeometry, tubeGeometry } from "./geometry";

const MATERIAL_PROPS = { color: "#fafafa", roughness: 0.35, metalness: 0.15 } as const;

function ExtrudedIcon({ iconKey }: { iconKey: Exclude<NavIconKey, "explore"> }) {
  const geometries = React.useMemo(() => {
    const { solids, tubes } = ICON_PATHS[iconKey];
    return [...solids.flatMap((d) => solidGeometry(d)), ...tubes.flatMap((d) => tubeGeometry(d))];
  }, [iconKey]);

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

// Explore is special-cased as an actual sphere with latitude/longitude rings
// rather than extruding the flat Globe icon's circle+arcs -- a solid disc
// (what extruding the flat outline would produce) doesn't read as "globe",
// and this is the icon the whole feature was scoped around, so it's worth
// the one-off treatment.
function GlobeIcon() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshStandardMaterial {...MATERIAL_PROPS} transparent opacity={0.25} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.85, 0.045, 12, 48]} />
        <meshStandardMaterial {...MATERIAL_PROPS} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.85, 0.045, 12, 48]} />
        <meshStandardMaterial {...MATERIAL_PROPS} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.85, 0.045, 12, 48]} />
        <meshStandardMaterial {...MATERIAL_PROPS} />
      </mesh>
    </group>
  );
}

export function IconMesh({ icon }: { icon: NavIconKey }) {
  return icon === "explore" ? <GlobeIcon /> : <ExtrudedIcon iconKey={icon} />;
}
