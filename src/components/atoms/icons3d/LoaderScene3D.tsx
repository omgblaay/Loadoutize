import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { LoaderMesh } from "@/components/atoms/icons3d/LoaderMesh";

const ROTATE_SPEED = 1.4; // radians/sec -- faster than the sidenav icons since this is the sole focus on screen

function SpinningLoader({ spin }: { spin: boolean }) {
  const groupRef = React.useRef<any>(null);

  useFrame((_, delta) => {
    if (spin && groupRef.current) groupRef.current.rotation.y += delta * ROTATE_SPEED;
  });

  return (
    <group ref={groupRef}>
      <LoaderMesh />
    </group>
  );
}

export default function LoaderScene3D() {
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
      <SpinningLoader spin={!prefersReducedMotion} />
    </Canvas>
  );
}
