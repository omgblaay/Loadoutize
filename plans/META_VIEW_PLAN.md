# Plan: Meta View (Weapon Tier List)

## Current state (why this is needed)

- The sidenav (`sidenav.tsx`) already has a "Meta" nav button (both the full
  menu and the icon rail), but it's inert — no `onClick`, no route. Same for
  "Trending". `AppLayout.tsx` only tracks `isHome`/`isExplore` for active-state
  highlighting.
- There is no `/meta` route in `App.tsx` — only `/`, `/u/:nickname`,
  `/:gameId/explore`, `/:gameId/create`, `/:gameId/loadout/:loadoutId`,
  `/:gameId/weapon/:configId`.
- All the data this view needs already exists and is already fetched in full
  by `GameDashboard.tsx` on every Explore page load — no new backend work is
  required for v1:
  - `GET /games/:gameId/loadouts` returns every public loadout with
    `weapons[]` (each `{ id, attachments }`, `weapons[0]` = primary weapon),
    `tagId`, `score`, `ratingPercent` (weighted like/dislike/favorite %,
    `null` below `MIN_VOTES_FOR_RATING = 3`), `likes`/`dislikes`/`favorites`.
  - `GET /games/:gameId/weapons` returns `{ id, name, type, typeShort,
    categoryId, imageUrl }` for every weapon in the game.
  - `GET /games/:gameId/tags` returns `{ id, name, color }` for every
    playstyle tag in the game (`tag_weapon_categories` further restricts
    which categories a tag is valid for, but that's a loadout-creation-time
    constraint, not something the Meta view needs to re-check).
  - `games.has_weapon_categories` is `false` for The Finals — weapons there
    have `type: null`, so the category scope has nothing to group by.
- This is a **read/aggregate** view over existing data, not a new
  entity — no schema changes, no new endpoints, no Directus work.

## What "meta" means here

A weapon tier list (S/A/B/C/D), computed by aggregating the public loadouts
that use each weapon as their primary weapon (`loadout.weapons[0].id`). Two
independent controls narrow *which* loadouts feed the aggregation, and one
switch changes *how* weapons are ranked from that pool:

1. **Scope** (mutually exclusive, like a segmented control):
   - **All** — every public loadout for the game.
   - **By tag** — pick one playstyle tag (Balanced, Run 'n' Gun, ...) from a
     pill row (reusing `<Tag>` with its real `color`, like the "Best of"
     category list already does with plain buttons); only loadouts with that
     `tagId` count.
   - **By weapon category** — pick one category (AR, SMG, ...) from a pill
     row (same pattern `GameDashboard.tsx` already uses for
     `activeCategory`); only weapons in that category are shown/ranked, and
     only loadouts using one of those weapons count.
   - Tag and category scope are **not combined** in v1 (picking a tag clears
     any category selection and vice versa) — keeps the empty-state matrix
     small. Flagging this as an assumption to confirm.
2. **Ranking switch** (independent of scope):
   - **Community Rated** (default) — rank weapons by the average
     `ratingPercent` across their loadouts, counting only loadouts that
     themselves cleared `MIN_VOTES_FOR_RATING` (i.e. have a non-null
     `ratingPercent`). Reflects "which weapon actually performs well",
     weighted by community approval, not raw popularity.
   - **Most Loadouts** — rank weapons by the raw count of public loadouts
     that use them (within the current scope). Reflects "what's popular
     right now" regardless of whether people rate it well.

## Tier thresholds

- **Community Rated**: fixed bands on `ratingPercent` (consistent regardless
  of scope, so "S tier" means the same thing everywhere):
  - S: ≥ 90%, A: ≥ 75%, B: ≥ 60%, C: ≥ 40%, D: < 40%.
  - A weapon needs **at least 1 rated loadout** (i.e. at least one loadout
    that itself cleared the 3-vote minimum) to be tiered; otherwise it drops
    into a separate "Not enough data yet" bucket at the bottom instead of a
    fabricated tier (mirrors the existing `RatingRing` "New" state in
    `LoadoutCard.tsx`).
- **Most Loadouts**: relative to the current scope's max count, since raw
  volume varies wildly by game maturity — top 10% of weapons (by count) = S,
  next 20% = A, next 30% = B, next 25% = C, remainder = D. Weapons with zero
  loadouts in scope are always excluded from tiering (shown in the "no data"
  bucket, not forced into D) so a category isn't padded with meaningless
  D-tier entries for weapons nobody has built yet.
- These numbers are a starting point, easy to tune after seeing it with real
  data — not calling them final.

## Page layout (`/:gameId/meta`, new `MetaView.tsx`, uses `AppLayout`)

```
Meta                                          [Community Rated | Most Loadouts]
Community-ranked weapon tiers for <Game>

[ All ]  [ By Tag ]  [ By Category ]
  (if By Tag selected)     Balanced  Run 'n' Gun  Quick Scope  ...
  (if By Category selected) AR  SMG  Shotgun  Sniper  ...

S  ████ [weapon tile] [weapon tile] [weapon tile]
A  ████ [weapon tile] [weapon tile]
B  ████ [weapon tile] [weapon tile] [weapon tile] [weapon tile]
C  ████ [weapon tile]
D  ████ [weapon tile] [weapon tile]

Not enough data yet: [weapon] [weapon] [weapon]
```

- Weapon tile: `WeaponImage` (small variant, already used in `LoadoutCard`),
  weapon name, `typeShort` badge (reusing `<Tag>`), and the driving stat
  underneath (`92%` or `14 loadouts`). Clicking it navigates to
  `/${gameId}/explore?category=${weapon.type}` (Explore has no per-weapon
  filter today, only per-category — good enough for v1, matches what the
  sidenav's "Best of" links already do).
- Tier row color bands: S gold/amber, A green, B the game's own accent
  (`getGameColor(gameId).primary`, same as everywhere else), C neutral grey,
  D muted red — distinct from but consistent with the existing
  `RatingRing`/reaction-button accent usage.
- Empty state (scope has zero eligible loadouts): reuse `GameDashboard`'s
  empty-state card copy pattern ("No loadouts match this filter yet").

## Routing / nav wiring

- `App.tsx`: add `<Route path="/:gameId/meta" element={<GameLock><MetaView /></GameLock>} />`.
- `AppLayout.tsx`: add `isMeta = location.pathname.endsWith("/meta")`, pass
  to `SideNav` alongside `isHome`/`isExplore`.
- `sidenav.tsx`: wire the two currently-inert "Meta" `SideNavButton`s
  (full menu ~line 57, icon rail ~line 142) with
  `state={isMeta ? "active" : "default"}` and
  `onClick={() => go(`/${selectedGame}/meta`)}`, matching how
  Home/Explore already work. ("Trending" stays inert — out of scope here.)

## Data flow

`MetaView.tsx` fetches the same three endpoints `GameDashboard.tsx` already
calls (`/loadouts`, `/weapons`, `/tags`) and does the scope-filter → group-by
weapon → aggregate → tier-bucket entirely client-side, mirroring how
`GameDashboard.tsx` already does its filter/sort client-side over the full
loadout list. No new backend work, no caching layer — revisit only if loadout
volume grows enough to make this expensive (not a concern today).

## Open questions / assumptions to confirm before implementing

1. Tag and category scope being mutually exclusive (not combinable) — okay
   for v1, or do you want to filter by both at once (e.g. "Run 'n' Gun SMGs"
   specifically)?
2. Tier thresholds above are placeholders — fine to ship and tune later, or
   do you have specific bands in mind?
3. "Not enough data yet" bucket for untiered weapons — keep it visible
   (so people can see what's missing data) or hide those weapons entirely?
4. Default scope/switch on page load — "All" + "Community Rated" seems like
   the obvious default; confirming before wiring it up.

## Implementation steps

1. `App.tsx` — add the `/:gameId/meta` route.
2. `AppLayout.tsx` — compute `isMeta`, pass to `SideNav`.
3. `sidenav.tsx` — wire both "Meta" buttons to navigate + active state.
4. `MetaView.tsx` (new) — fetch loadouts/weapons/tags, scope filter, switch,
   aggregation + tiering logic, tier-row layout, weapon tile, empty states.
5. Manual QA across: a game with real data, a game with too little data
   (empty/low-sample states), The Finals (`has_weapon_categories = false`,
   category scope should have nothing to show — confirm it degrades
   gracefully rather than rendering an empty pill row awkwardly).
