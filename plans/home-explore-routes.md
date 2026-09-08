# Home and Explore Routes

## Goal

Make `/home` and `/explore` the canonical pages while preserving game selection,
filters, existing shared links, and the current Modern Warfare 4 game lock.

## Current Ownership

| Canonical page | Current component | Current route |
| --- | --- | --- |
| Home | `GameSelector.tsx` | `/` |
| Explore | `GameDashboard.tsx` | `/:gameId/explore` |

## Route Contract

| Route | Behavior |
| --- | --- |
| `/` | Redirect to `/home` |
| `/home` | Render `Home` |
| `/explore` | Render `Explore` |
| `/:gameId/explore` | Redirect to `/explore`, retaining filters and other query parameters |

When the game selector is enabled, Explore resolves its game from the `game`
query parameter, then `LAST_SELECTED_GAME_KEY`, then the default game. While
the selector is locked, every Explore URL resolves to Modern Warfare 4.

## Implementation Steps

1. Rename `src/app/components/GameSelector.tsx` to `Home.tsx`, and rename its
   `GameSelector` export and skeleton accordingly.
2. Rename `src/app/components/GameDashboard.tsx` to `Explore.tsx`, and rename
   its `GameDashboard` export and skeleton accordingly.
3. Update `App.tsx` imports and add the `/home` and `/explore` routes. Change
   `/` to a redirect, then add a legacy `/:gameId/explore` redirect that carries
   its query string forward.
4. Update Explore to obtain its selected game from `game` or local storage
   instead of `useParams`, and persist game changes through the existing
   selection mechanism.
5. Replace internal `/${gameId}/explore` navigation with a single route helper
   that produces `/explore` plus a `game` parameter when necessary. Preserve
   `category` and weapon filter query parameters.
6. Update `AppLayout` and `SideNav` active state checks and Home navigation to
   use `/home` and `/explore`.
7. Retain game-scoped loadout, weapon, meta, community, and builder URLs for
   now; they still need a game identifier and should not become part of this
   route change.

## Verification

1. Load `/`, `/home`, `/explore`, and `/explore?game=mw4&category=SMG`.
2. Confirm a legacy URL such as `/mw4/explore?category=SMG` redirects without
   losing its category filter.
3. Confirm Home, Explore, game selection, category links, loadout cards, and
   builder return navigation use the canonical routes.
4. Check browser back/forward behavior and navigation active states.
5. Run `npm run build`.
