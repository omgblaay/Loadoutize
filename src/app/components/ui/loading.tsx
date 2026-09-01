import * as React from "react";
import { cn } from "./utils";

// three.js/@react-three/fiber is heavy -- only fetched once a Loading
// instance actually mounts, same lazy pattern as the sidenav's NavIcon.
const LoaderScene3D = React.lazy(() => import("./icon3d/LoaderScene3D"));

export function Loading({
  label = "Loading…",
  size = 96,
  className,
  fullScreen = false,
}: {
  label?: string | null;
  size?: number;
  className?: string;
  /** Centers the loader in a min-h-screen dark backdrop, matching the app's page-level loading states. */
  fullScreen?: boolean;
}) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div style={{ width: size, height: size }}>
        <React.Suspense fallback={null}>
          <LoaderScene3D />
        </React.Suspense>
      </div>
      {label && <p className="text-[14px] text-[#8d898a]">{label}</p>}
    </div>
  );

  if (!fullScreen) return content;

  return <div className="flex items-center justify-center min-h-screen bg-[#0a0909]">{content}</div>;
}
