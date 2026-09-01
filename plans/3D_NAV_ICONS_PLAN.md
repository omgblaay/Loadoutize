# Plan: 3D Rotating Nav Icons (Home, Explore, Trending, Meta, Favourites)

## Goal

Sidenav (and the topnavbar's Favourites button) keep their current flat white
lucide icons (`HomeIcon`, `Globe`, `Flame`, `Crown`, `Heart`) at rest. When a
nav item becomes **active** (the current page, or Favourites while hovered/
toggled), its flat icon crossfades into a small real 3D model of the same
icon, slowly auto-rotating in place — rendered live in the browser, not a
pre-baked video/sprite.

## Blocking dependency: the 3D assets themselves

I can't generate real 3D models — this plan assumes **you provide 5 `.glb`
files** (Home, Explore, Trending/flame, Meta/crown, Favourites/heart), one
per icon, ideally from the same pack as the "Explore" reference so all five
share a consistent style/lighting. Practical requirements for whatever you
supply or source:

- Format: `.glb` (binary glTF) — the standard three.js/`@react-three/drei`
  format, single file per icon (no separate texture files to wire up).
- Low poly / small file size — these render at ~28-40px on screen. Target a
  few hundred KB **total** across all 5; if the source pack ships
  high-poly/uncompressed files, they should be run through
  [gltf-transform](https://gltf-transform.dev) (Draco/Meshopt compression)
  before landing in the repo. I can do that compression step once files
  exist — I just can't produce the geometry itself.
- Self-contained materials (baked-in colors/PBR, no external texture
  dependencies) so they render correctly without extra asset wiring.

Until these exist, everything below is buildable but untestable end-to-end —
step 0 of implementation is getting real files into
`src/assets/icons-3d/{home,explore,trending,meta,favourites}.glb`.

## Dependencies to add

- `three` — the underlying WebGL engine.
- `@react-three/fiber` — React renderer for three.js (so the scene is a
  normal React tree: props, state, unmount = automatic disposal).
- `@react-three/drei` — for `useGLTF` (glTF loading with caching/preload)
  and `Center`/`Stage` helpers to auto-frame each model without hand-tuning
  camera math per icon.

This is a genuinely heavy addition for an otherwise lean app (three.js alone
is ~600KB min before gzip) — see **Performance safeguards** below for how
that's kept off the critical path. Flagging the tradeoff up front rather than
after it lands in a bundle-size regression.

**Alternative considered and rejected for now:** Google's `<model-viewer>`
web component also wraps three.js and would avoid pulling in the React
ecosystem around it, but it's harder to drive from React state (crossfade
timing, syncing rotation start to the active-nav transition) and doesn't
buy much size-wise since it still ships its own three.js internally. R3F is
the better fit here since the trigger (`state === "active"`) already lives in
React state.

## Component architecture

**`src/app/components/ui/nav-icon-3d.tsx`** (new):

```tsx
type NavIconKey = "home" | "explore" | "trending" | "meta" | "favourites";

const MODEL_PATHS: Record<NavIconKey, string> = {
  home: "/src/assets/icons-3d/home.glb",
  explore: "/src/assets/icons-3d/explore.glb",
  trending: "/src/assets/icons-3d/trending.glb",
  meta: "/src/assets/icons-3d/meta.glb",
  favourites: "/src/assets/icons-3d/favourites.glb",
};

// Lazy: three.js/R3F/drei only load once *some* nav icon goes active, never
// on initial page load.
const Scene3D = React.lazy(() => import("./nav-icon-3d-scene"));

export function NavIcon3D({ icon, size = 28 }: { icon: NavIconKey; size?: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <React.Suspense fallback={null}>
        <Scene3D modelPath={MODEL_PATHS[icon]} />
      </React.Suspense>
    </div>
  );
}
```

**`src/app/components/ui/nav-icon-3d-scene.tsx`** (new, the actual
three.js/R3F code, split into its own module specifically so the lazy import
above has a clean boundary):

- `<Canvas>` sized to fill its parent (the small icon box), transparent
  background, orthographic-ish framing via `drei`'s `<Stage>`/`<Center>` so
  every model auto-fits regardless of its native scale.
- `useGLTF(modelPath)` to load; `useFrame((_, delta) => { ref.current.rotation.y += delta * ROTATE_SPEED })`
  for the slow constant spin.
- Basic lighting (one ambient + one directional light) so the model actually
  reads as 3D rather than a flat silhouette — not trying to match any
  particular studio-lighting look, just enough to sell depth at 28px.
- Respects `prefers-reduced-motion`: rotation speed goes to 0 (model still
  renders, just holds still) rather than skipping the 3D render entirely —
  consistent with how `reaction-button.tsx` already handles reduced motion
  (freeze the motion, keep the visual).

**Icon slot swap** (wherever a flat icon is rendered today — `sidenav.tsx`'s
full menu buttons, its icon rail, and `topnavbar.tsx`'s Favourites button):

```tsx
{state === "active" ? (
  <NavIcon3D icon="home" size={20} />
) : (
  <HomeIcon className="w-5 h-5" />
)}
```

Crossfade between the two with a short opacity/scale transition (~200ms,
matching the timing scale already used in `reaction-button.tsx`) rather than
a hard swap — both elements can briefly overlap via absolute positioning
during the transition, or a simpler CSS-only crossfade if a hard cut turns
out to look fine once it's actually running.

## Integration points

- `sidenav.tsx` — both icon instances per nav item (full-menu row *and* the
  icon-only rail below 1280px) need the swap, driven by the same
  `state === "active"` value they already compute for the highlight
  background.
- `topnavbar.tsx` — the Favourites button (`Heart` icon, only rendered when
  `user` is truthy) gets the same treatment; "active" here likely means
  "currently on `/u/:nickname`'s favourites view" if that exists, or simplest
  version: active on hover/press only, since Favourites has no persistent
  "you are here" route state today. Worth confirming which you want once
  we're implementing — hover-active is the safe default if undecided.
- Trending has no route yet (dead button in the sidenav today) — its 3D
  icon would only ever show on hover/press until Trending is a real page.

## Performance safeguards

- **Lazy load the whole three.js/R3F/drei subsystem** — `React.lazy` on the
  scene module (shown above) means none of it is in the initial bundle;
  it's fetched the first time any nav icon goes active.
- **One shared `<Canvas>` at a time, not five** — only the currently-active
  icon ever mounts a `Scene3D`; the other four stay flat lucide icons.
  Navigating away unmounts the Canvas, and R3F disposes the WebGL context/
  GPU resources automatically on unmount.
- **`useGLTF.preload()`** for the model likely to be needed next (e.g.
  preload `explore.glb` on hover before the click actually navigates) is a
  nice-to-have once this is working, not required for v1.
- **WebGL-unavailable fallback**: if `Canvas` fails to get a context (rare —
  some locked-down browser configs), catch it and permanently fall back to
  the flat icon for that session rather than showing a broken/black box.

## Open questions

1. Do you have the 5 `.glb` files already (from the same pack as the
   "Explore" reference), or do I need to help track down a source/pack for
   the other 4 to match its style?
2. Favourites "active" state — hover-only, or should Favourites become a
   real route (e.g. `/u/:nickname/favourites`) this ties into?
3. Rotation speed/style — continuous slow spin (as described) vs. a bounded
   "settle" animation (spins briefly then stops facing forward) each time it
   activates? Continuous spin is simpler and is what "rotating" in your
   request suggests, just confirming before building it.

## Implementation steps (once assets exist)

1. `npm install three @react-three/fiber @react-three/drei` (+ `@types/three`).
2. Add the 5 compressed `.glb` files to `src/assets/icons-3d/`.
3. Build `nav-icon-3d.tsx` + `nav-icon-3d-scene.tsx` as described above.
4. Wire the swap into `sidenav.tsx` (both full menu and icon rail) for
   Home/Explore/Trending/Meta.
5. Wire the swap into `topnavbar.tsx` for Favourites.
6. Verify: bundle-size check (confirm three.js/R3F only loads on first
   activation, not upfront), reduced-motion behavior, and a low-end-device
   sanity check since WebGL canvases are heavier than CSS animations.
