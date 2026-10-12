import * as React from "react";
import type { NavIconKey } from "@/components/atoms/icons3d/paths";

export type { NavIconKey };

// three.js/@react-three/fiber only loads the first time some icon actually
// needs it (first hover or an already-active icon on mount) -- never on
// initial page load, since this is a heavy dependency for an otherwise lean
// bundle. Shared across every NavIcon instance since dynamic imports are
// cached by the module loader.
const Scene3D = React.lazy(() => import("@/components/atoms/icons3d/Scene3D"));

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
  const prefersReducedMotion =
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  const transition = prefersReducedMotion ? "opacity 0.001ms" : "opacity 0.2s ease, transform 0.2s ease";
  const hostRef = React.useRef<HTMLSpanElement>(null);
  const [mounted3d, setMounted3d] = React.useState(false);

  React.useEffect(() => {
    if (!show3d) {
      // Let the opacity transition finish, then release the WebGL context.
      // Keeping every previously-hovered icon mounted eventually exhausts
      // the browser's context limit on navigation-heavy pages.
      const timeout = window.setTimeout(
        () => setMounted3d(false),
        prefersReducedMotion ? 0 : 220,
      );
      return () => window.clearTimeout(timeout);
    }

    const host = hostRef.current;
    if (!host) return;

    const syncVisibility = () => {
      const rect = host.getBoundingClientRect();
      // SideNav renders desktop, rail, and mobile variants together and
      // hides two with CSS. A shared hover key reaches all copies, so only
      // create a Canvas for the copy that actually occupies layout space.
      setMounted3d(rect.width > 0 && rect.height > 0);
    };

    syncVisibility();
    const observer = new ResizeObserver(syncVisibility);
    observer.observe(host);
    return () => observer.disconnect();
  }, [prefersReducedMotion, show3d]);
  const display3d = show3d && mounted3d;

  return (
    <span
      ref={hostRef}
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: display3d ? 0 : 1,
          transform: display3d ? "scale(0.4)" : "scale(1)",
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
            opacity: display3d ? 1 : 0,
            // Never transform the Canvas host. React Three Fiber measures
            // its rendered bounds when WebGL initializes; mounting at
            // scale(0.4) can leave an 8px drawing buffer inside a 20px icon.
            transition: prefersReducedMotion
              ? "opacity 0.001ms"
              : "opacity 0.2s ease",
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
