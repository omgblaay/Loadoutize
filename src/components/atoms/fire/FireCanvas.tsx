import * as React from "react";
import * as THREE from "three";
import { VERT, FRAG } from "@/components/atoms/fire/shader";
import type { FireMargin } from "@/components/atoms/fire/types";

/**
 * The actual WebGL layer -- a single fullscreen-triangle shader driven by an
 * imperative Three.js renderer (not @react-three/fiber: there's no scene
 * graph here, just one shaded quad, so the extra abstraction isn't worth
 * it). Kept in its own chunk and only ever mounted via FireCardEffect's
 * `React.lazy`, matching how nav-icon-3d/loading.tsx keep three.js out of
 * the main bundle until something on screen actually needs it.
 */
export default function FireCanvas({
  width,
  height,
  radius,
  intensity,
  margin,
}: {
  width: number;
  height: number;
  radius: number;
  intensity: number;
  margin: FireMargin;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const intensityRef = React.useRef(intensity);
  intensityRef.current = intensity;

  const cw = width + margin.x * 2;
  const ch = height + margin.top + margin.bottom;
  // card centre relative to canvas centre, y up
  const offsetY = margin.bottom + height / 2 - ch / 2;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cw <= 0 || ch <= 0) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(cw, ch, false);

    const uniforms = {
      uRes: { value: new THREE.Vector2(cw, ch) },
      uCard: { value: new THREE.Vector2(width / 2, height / 2) },
      uOffset: { value: new THREE.Vector2(0, offsetY) },
      uRadius: { value: radius },
      uTime: { value: 0 },
      uIntensity: { value: intensityRef.current },
    };

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf: number | undefined;
    let current = intensityRef.current;

    const tick = () => {
      const t = reduced ? 6 : (performance.now() - start) / 1000;
      uniforms.uTime.value = t;
      // ease toward the target so intensity changes flare up, not snap
      current += (intensityRef.current - current) * 0.045;
      uniforms.uIntensity.value = current;
      renderer.render(scene, camera);
      if (!reduced) raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [cw, ch, width, height, radius, offsetY]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", left: -margin.x, top: -margin.top, width: cw, height: ch }}
    />
  );
}
