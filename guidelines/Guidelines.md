# Loadoutize Guidelines

Project-specific rules for generating or editing UI in this codebase. See `CLAUDE.md` at the repo root for architecture details (routing, auth, backend).

## General guidelines

* There is no light/dark mode toggle — the app has exactly one mode, and it's visually dark. `:root` in `src/styles/theme.css` carries the real (dark) values (e.g. `--card: #100D10`); the `.dark` class block alongside it is unused dead code (nothing ever adds `.dark` to the DOM). Don't rely on `dark:` variants or the `.dark` class to make something look right — style against the `:root` tokens directly, and check actual rendered contrast rather than assuming a separate "dark mode" token set is active.
* Prefer the existing wrappers in `src/components/atoms/` and `src/components/molecules/` (shadcn/Radix-based) over raw Radix, MUI, or hand-rolled equivalents. MUI (`@mui/material`) is a dependency but should only be reached for when there's no equivalent in the existing atomic layers.
* Per-game accent colors always come from `getGameColor(gameId)` in `src/lib/gameColors.ts` — never hardcode a game's hex color inline.
* Use flexbox/grid layouts by default; reserve absolute positioning for cases that genuinely need it (overlays, decorative layers, 3D canvas overlays).
* Keep components in their own PascalCase files under the appropriate atomic layer in `src/components/`: atoms, molecules, organisms, templates, or pages. Follow [the architecture guide](../docs/ARCHITECTURE.md). Extract helper functions/hooks rather than growing a single file.
* Routes are locked behind `GAME_SELECTOR_ENABLED` / `LOCKED_GAME_ID` (`src/lib/games.ts`) — when adding a new `/:gameId/*` route, wrap it in `GameLock` like the existing routes in `App.tsx`, so the lock behavior stays consistent instead of being bypassed for the new route.
* Backend responses use camelCase field names regardless of the underlying snake_case columns (see `CLAUDE.md`) — map new fields explicitly rather than passing raw row data through.

## Design system guidelines

* Base font size is `16px` (`--font-size` in `theme.css`), not the 14px shadcn default — don't override it per-component.
* Use the CSS custom properties defined in `theme.css` (`--background`, `--card`, `--muted`, `--border`, `--primary`, etc.) via the corresponding Tailwind tokens instead of raw hex/oklch values, so a future theme pass only has to touch one file.
* `--card` is intentionally near-black (`#100D10`), distinct from `--background` (`#ffffff` at the token level but visually dark in practice) — don't assume `card` and `background` are interchangeable surfaces.
* When adding a new primitive to `src/components/atoms/`, match the existing pattern: Radix primitive + `class-variance-authority` for variants + `cn()` from `src/lib/utils.ts` for class merging.
