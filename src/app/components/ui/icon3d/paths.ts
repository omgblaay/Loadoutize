// Raw path data copied from lucide-react's own icon sources (Home/House,
// Globe, Flame, Crown, Heart -- the exact icons rendered flat elsewhere in
// the sidenav/topnavbar) so the 3D version is a real extrusion of the same
// artwork, not a separately-authored lookalike. All in the shared 24x24
// lucide viewBox, which is what lets every icon use the same camera/scale.
//
// `solids` are closed silhouette paths (end in Z) -> extruded as solid fill.
// `tubes` are open stroke paths -> rendered as round 3D tubes, matching
// lucide's stroke-width:2 / round line caps.
export type NavIconKey = "home" | "explore" | "trending" | "meta" | "favourites" | "clock" | "community";

export const ICON_PATHS: Record<
  Exclude<NavIconKey, "explore" | "clock" | "community">,
  { solids: string[]; tubes: string[] }
> = {
  home: {
    solids: [
      "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    ],
    tubes: ["M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"],
  },
  trending: {
    solids: [
      "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
    ],
    tubes: [],
  },
  meta: {
    solids: [
      "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
    ],
    tubes: ["M5 21h14"],
  },
  favourites: {
    solids: [
      "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
    ],
    tubes: [],
  },
};
