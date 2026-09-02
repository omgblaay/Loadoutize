import * as React from "react";
import type { FireMargin } from "./fire/types";

// three.js is a heavy dependency for an otherwise lean card -- only loaded
// once a card actually opts into `fire`, same lazy pattern as NavIcon's 3D
// scene. Render at most a handful of these on screen at once: each is its
// own WebGL context, and browsers cap how many can be live simultaneously.
const FireCanvas = React.lazy(() => import("./fire/FireCanvas"));

const DEFAULT_MARGIN: FireMargin = { x: 20, top: 46, bottom: 14 };

/**
 * Drop this as the first child inside a `position: relative` wrapper around
 * a card -- it sizes itself to that wrapper via ResizeObserver, then layers
 * a pulsing ember glow on the card's own edge plus a shader flame overlay
 * that spills past it. `pointer-events: none` throughout, so it never
 * blocks the card's own click/hover.
 *
 * The wrapper must NOT clip overflow (no `overflow-hidden`) or the flames
 * spilling past the card's box will be cut off -- put `overflow-hidden` on
 * the card's own inner element instead, one level down.
 */
export function FireCardEffect({
  radius = 12,
  intensity = 1,
  margin = DEFAULT_MARGIN,
}: {
  radius?: number;
  intensity?: number;
  margin?: FireMargin;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState<{ width: number; height: number } | null>(null);

  React.useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="absolute inset-0 z-10 pointer-events-none" aria-hidden="true">
      <div className="fire-card-glow absolute inset-0" style={{ borderRadius: radius }} />
      {size && size.width > 0 && size.height > 0 && (
        <React.Suspense fallback={null}>
          <FireCanvas width={size.width} height={size.height} radius={radius} intensity={intensity} margin={margin} />
        </React.Suspense>
      )}
      <style>{`
        @keyframes fire-card-glow-pulse {
          0%, 100% {
            box-shadow:
              inset 0 0 0 1px rgba(255, 176, 96, 0.24),
              inset 0 -30px 60px -30px rgba(255, 120, 30, 0.30),
              0 0 30px rgba(255, 104, 16, 0.28),
              0 0 84px rgba(255, 70, 0, 0.15);
          }
          50% {
            box-shadow:
              inset 0 0 0 1px rgba(255, 196, 120, 0.36),
              inset 0 -34px 66px -30px rgba(255, 140, 40, 0.44),
              0 0 44px rgba(255, 120, 24, 0.42),
              0 0 110px rgba(255, 80, 0, 0.24);
          }
        }
        .fire-card-glow {
          animation: fire-card-glow-pulse 4.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .fire-card-glow {
            animation: none;
            box-shadow:
              inset 0 0 0 1px rgba(255, 176, 96, 0.24),
              inset 0 -30px 60px -30px rgba(255, 120, 30, 0.30),
              0 0 30px rgba(255, 104, 16, 0.28),
              0 0 84px rgba(255, 70, 0, 0.15);
          }
        }
      `}</style>
    </div>
  );
}
