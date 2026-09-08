import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { IconMesh } from "@/components/atoms/icons3d/IconMesh";
import type { NavIconKey } from "@/components/atoms/icons3d/paths";

const ROTATE_SPEED = 0.6; // radians/sec

function RotatingIcon({ icon, spin }: { icon: NavIconKey; spin: boolean }) {
  const groupRef = React.useRef<any>(null);

  useFrame((_, delta) => {
    if (spin && groupRef.current) groupRef.current.rotation.y += delta * ROTATE_SPEED;
  });

  return (
    <group ref={groupRef}>
      <IconMesh icon={icon} />
    </group>
  );
}

export default function Scene3D({ icon }: { icon: NavIconKey }) {
  const prefersReducedMotion =
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

  return (
    <Canvas
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 0, 3.4], fov: 32 }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} />
      <directionalLight position={[-2, -1, -3]} intensity={0.35} />
      <RotatingIcon icon={icon} spin={!prefersReducedMotion} />
    </Canvas>
  );
}
