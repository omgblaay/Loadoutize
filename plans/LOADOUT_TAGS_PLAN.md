# Plan: Loadout Tags

## Goal

Let a player attach **one** playstyle tag (e.g. "Quick Scope", "Run 'n' Gun")
to a loadout when creating/editing it. Tags are colored pills, managed per
game in Directus, and can optionally be restricted to specific weapon
categories (e.g. "Quick Scope" only makes sense on Snipers/Marksman Rifles —
it should not be selectable while an SMG is in the loadout).

This is greenfield: there is currently no tag data model at all. The colored
"Objective / Off meta / Rush / No recoil" pills seen on loadout cards today
(`TAG_CYCLE` in `src/app/components/ui/LoadoutCard.tsx:34`) are a hardcoded,
per-card-index cosmetic placeholder with no connection to real data — this
plan replaces that with real, single, per-loadout tags.

The `Tag` UI component (`src/app/components/ui/tag.tsx`) already renders a
colored pill from a hex `color` prop and is reused as-is; no new UI component
needed.

## 1. Database schema (`SCHEMA.sql`)

### `tags` table

```sql
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,           -- hex, e.g. '#3B82F6' — fed straight into <Tag color={...}>
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, name)
);
```

### `tag_weapon_categories` junction table (the "checkbox list")

Many-to-many: a tag can restrict itself to zero or more weapon categories.
**Empty = unrestricted** (selectable regardless of the loadout's weapons).
Non-empty = only selectable when every weapon in the loadout belongs to one
of the listed categories.

```sql
CREATE TABLE tag_weapon_categories (
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  weapon_category_id INTEGER REFERENCES weapon_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (tag_id, weapon_category_id)
);
```

### `loadouts.tag_id` (single tag per loadout)

```sql
ALTER TABLE loadouts ADD COLUMN tag_id INTEGER REFERENCES tags(id) ON DELETE SET NULL;
```

`ON DELETE SET NULL` so deleting a tag in Directus doesn't break existing
loadouts — they just lose the tag.

> Note: the live DB has already drifted from `SCHEMA.sql` in one relevant way
> — `weapon_categories` no longer has a plain `game_id` FK column; it has a
> `game` JSON column shaped like `{key, collection}` that isn't actually
> registered as a Directus relation (so it edits as raw JSON, not a
> dropdown). Don't copy that pattern for `tags.game_id` — use a real
> `TEXT REFERENCES games(id)` column and register it as a proper M2O
> relation in Directus (see §2), same as we just did for
> `attachments.attachment_type_id`.

## 2. Directus registration

1. Settings → Data Model → Create Collection → "Use Existing Table" for
   `tags` and `tag_weapon_categories` (mark the junction table hidden — it's
   only there to back the M2M field, editors never open it directly).
2. `tags.game_id` → Select Dropdown (M2O), same recipe as
   `attachments.attachment_type_id`:
   - `directus_relations`: `many_collection='tags', many_field='game_id', one_collection='games'`
   - `directus_fields`: `interface='select-dropdown-m2o'`, `options={"template":"{{name}}"}`, `display='related-values'`, `display_options={"template":"{{name}}"}`
3. `tags.color` → Directus's built-in **Color** interface
   (`interface: 'select-color'`) so editors pick from a swatch instead of
   typing raw hex.
4. Allowed weapon categories (the M2M "checkbox list"):
   - Two `directus_relations` rows for the junction: `tag_weapon_categories.tag_id → tags`, `tag_weapon_categories.weapon_category_id → weapon_categories`.
   - An alias field on `tags` (e.g. `allowed_weapon_categories`) of
     `special: "m2m"`, `interface: 'select-multiple-checkbox'`, so editors
     just tick which categories the tag is allowed on — leaving all boxes
     unchecked means unrestricted.
5. `loadouts.tag_id` → Select Dropdown (M2O) to `tags`, filtered to the
   loadout's own game the same way `attachments.game_id` was scoped to its
   attachment type's game (`id equals $CURRENT.tag_id.game_id`-style filter,
   adapted) — mainly for moderator convenience in Directus, not user-facing.

## 3. Backend (`supabase/functions/server/index.tsx`)

- **New endpoint** `GET /make-server-6db475c7/games/:gameId/tags`:
  fetch `tags` for `gameId`, left-join `tag_weapon_categories` to collect
  each tag's allowed category ids, and return:
  ```ts
  { tags: [{ id, name, color, allowedWeaponCategoryIds: number[] }] }
  ```
  (empty array = unrestricted). Mirrors the existing `/perks` and
  `/equipment` endpoints (index.tsx:201, :225).

- **`GET /games/:gameId/weapons` (index.tsx:135)**: currently maps each
  weapon to `{ id, name, type, typeShort, imageUrl }` — `type`/`typeShort`
  are the category's *name*, not its id. Add `categoryId: category?.id ??
  null` to that mapped object. The frontend needs the numeric category id to
  check it against a tag's `allowedWeaponCategoryIds`; matching by name
  string would be fragile.

- **`mapLoadout` (index.tsx:253)**: add `tagId: l.tag_id ?? null`.

- **`POST /games/:gameId/loadouts` (index.tsx:374)** and
  **`PUT /games/:gameId/loadouts/:loadoutId` (index.tsx:409)**: accept
  `body.tagId` and persist it to `tag_id`. Server-side, re-validate the
  restriction (don't trust the client-side disable logic alone, since this
  is a public write endpoint): if `tagId` is set, look up its
  `allowedWeaponCategoryIds`; if non-empty, confirm every weapon in
  `body.weapons` has a `categoryId` in that set, else drop the tag (or
  `400`) rather than silently save an invalid combination.

## 4. Frontend

### `LoadoutBuilder.tsx`

- Fetch `/games/:gameId/tags` alongside the existing weapons/perks/equipment
  fetches; store as `tags` state.
- Add a "Tag" section rendering each tag as a `<Tag color={tag.color}>` used
  as a single-select control (click to select; clicking a different tag
  replaces the selection — same "only 1" behavior as picking a class, not
  the multi-select `togglePerk`/`toggleEquipment` pattern used for perks).
- Derive `selectedCategoryIds = selectedWeapons.map(w => w.categoryId)`
  (needs the new `categoryId` field from §3, so also add `categoryId` to the
  local `Weapon`/`SelectedWeapon` interfaces at the top of the file).
- A tag button is disabled when it has a non-empty
  `allowedWeaponCategoryIds` **and** any selected weapon's `categoryId` is
  not in that list — e.g. "Quick Scope" (restricted to Sniper/Marksman)
  becomes unselectable the moment an SMG is added.
- If the user already has a tag selected and then adds a weapon that
  violates its restriction, clear the selection rather than leaving an
  invalid state.
- Include `tagId: selectedTagId` in the create/update request body.

### `LoadoutCard.tsx` / `LoadoutPreview.tsx`

- Replace the fake `TAG_CYCLE` pair (index.tsx `ui/LoadoutCard.tsx:34-38`,
  `:103-104`, `:143-144`) with the loadout's real single tag: resolve
  `loadout.tagId` against the game's fetched tags list and render one
  `<Tag color={tag.color}>{tag.name}</Tag>` (or nothing, if `tagId` is
  null) instead of always showing two placeholder pills.

## 5. Open questions to confirm before implementing

- **Multi-weapon restriction rule**: a loadout can have up to 2 weapons
  (`selectedWeapons.length >= 2` cap in `LoadoutBuilder.tsx`). This plan
  assumes a restricted tag requires *every* selected weapon's category to be
  in the allowed set (so e.g. an AR+Sniper loadout still can't take
  "Quick Scope" because of the AR). Confirm that's the intended rule rather
  than "at least one weapon matches."
- **Tag colors**: fixed palette (Directus color presets) vs. any hex? Plan
  assumes Directus's built-in color picker with no preset restriction;
  can add a curated preset list if you want visual consistency across tags.
- **Existing loadouts**: none currently have a tag (column is new), so no
  backfill needed.

## 6. Suggested implementation order

1. `SCHEMA.sql` additions (`tags`, `tag_weapon_categories`,
   `loadouts.tag_id`) + apply to the live DB.
2. Directus registration (§2).
3. Backend: `/tags` endpoint, `categoryId` on `/weapons`, `tagId` on
   `mapLoadout` + create/update routes.
4. Frontend: `LoadoutBuilder.tsx` tag picker + restriction logic.
5. Frontend: swap `TAG_CYCLE` placeholder for the real tag in
   `LoadoutCard.tsx` / `LoadoutPreview.tsx`.
