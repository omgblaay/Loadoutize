import * as React from "react";
import * as THREE from "three";
import { ICON_PATHS, type NavIconKey } from "./paths";
import { solidGeometry, tubeGeometry } from "./geometry";

const MATERIAL_PROPS = { color: "#fafafa", roughness: 0.35, metalness: 0.15 } as const;

function ExtrudedIcon({ iconKey }: { iconKey: Exclude<NavIconKey, "explore" | "clock" | "community"> }) {
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

// Clock is special-cased the same way as Explore's globe: extruding the flat
// icon's outline circle would produce a solid disc, not a ring, so the face
// is a torus instead. The hour/minute hands are lucide's own stroke path
// ("M12 6 12 12 16 14"), rendered as a tube like any other open stroke path.
function ClockIcon() {
  const hands = React.useMemo(() => tubeGeometry("M12 6 12 12 16 14"), []);
  React.useEffect(() => () => hands.forEach((g) => g.dispose()), [hands]);

  return (
    <group>
      {/* No rotation: the default torus orientation already faces the camera, like the un-rotated "equator" ring in GlobeIcon above. */}
      <mesh>
        <torusGeometry args={[0.85, 0.09, 12, 48]} />
        <meshStandardMaterial {...MATERIAL_PROPS} />
      </mesh>
      {hands.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial {...MATERIAL_PROPS} />
        </mesh>
      ))}
    </group>
  );
}

// Community: a single person silhouette (lucide's UserRound: a head circle +
// shoulders arc), the same special-case pattern as Clock/Explore. The head is
// a solid sphere (heads read fine solid, unlike Clock's hollow ring face)
// hand-positioned/scaled to match the shared lucide-viewbox coordinate space
// geometry.ts uses (VIEW_CENTER=12, SCALE=1/12): circle cx=12 cy=8 r=5 in raw
// viewbox space becomes position [0, 4/12, 0], radius 5/12. The shoulders
// reuse lucide's own arc path as a tube, just like Clock's hands.
function CommunityIcon() {
  const shoulders = React.useMemo(() => tubeGeometry("M20 21a8 8 0 0 0-16 0"), []);
  React.useEffect(() => () => shoulders.forEach((g) => g.dispose()), [shoulders]);

  return (
    <group>
      <mesh position={[0, 4 / 12, 0]}>
        <sphereGeometry args={[5 / 12, 24, 24]} />
        <meshStandardMaterial {...MATERIAL_PROPS} />
      </mesh>
      {shoulders.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial {...MATERIAL_PROPS} />
        </mesh>
      ))}
    </group>
  );
}

export function IconMesh({ icon }: { icon: NavIconKey }) {
  if (icon === "explore") return <GlobeIcon />;
  if (icon === "clock") return <ClockIcon />;
  if (icon === "community") return <CommunityIcon />;
  return <ExtrudedIcon iconKey={icon} />;
}
