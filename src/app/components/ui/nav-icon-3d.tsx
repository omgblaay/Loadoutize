import * as React from "react";
import type { NavIconKey } from "./icon3d/paths";

export type { NavIconKey };

// three.js/@react-three/fiber only loads the first time some icon actually
// needs it (first hover or an already-active icon on mount) -- never on
// initial page load, since this is a heavy dependency for an otherwise lean
// bundle. Shared across every NavIcon instance since dynamic imports are
// cached by the module loader.
const Scene3D = React.lazy(() => import("./icon3d/Scene3D"));

/**
 * Flat lucide icon at rest; crossfades into a small rotating 3D render of
 * the same icon when active or hovered. The flat icon shrinks out exactly as
 * the 3D one grows in (mirrored scale/opacity, same duration) so only one is
 * ever visibly present -- never both at once mid-transition.
 */
export function NavIcon({
  icon,
  flat,
  active,
  hovered,
  size = 20,
}: {
  icon: NavIconKey;
  flat: React.ReactElement;
  active: boolean;
  hovered: boolean;
  size?: number;
}) {
  const show3d = active || hovered;
  // Mounts the (lazy) 3D scene the first time it's needed and leaves it
  // mounted -- repeat hovers just toggle CSS, not a re-fetch/re-init.
  const [mounted3d, setMounted3d] = React.useState(active);
  React.useEffect(() => {
    if (show3d) setMounted3d(true);
  }, [show3d]);

  const prefersReducedMotion =
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  const transition = prefersReducedMotion ? "opacity 0.001ms" : "opacity 0.2s ease, transform 0.2s ease";

  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: show3d ? 0 : 1,
          transform: show3d ? "scale(0.4)" : "scale(1)",
          transition,
          pointerEvents: "none",
        }}
      >
        {flat}
      </span>
      {mounted3d && (
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{
            opacity: show3d ? 1 : 0,
            transform: show3d ? "scale(1)" : "scale(0.4)",
            transition,
            pointerEvents: "none",
          }}
        >
          <React.Suspense fallback={null}>
            <Scene3D icon={icon} />
          </React.Suspense>
        </span>
      )}
    </span>
  );
}
