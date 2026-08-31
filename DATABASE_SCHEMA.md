# LOADOUTIZE Database & CMS Setup

The full table definitions live in [`SCHEMA.sql`](./SCHEMA.sql) — this file is
just the setup runbook. Catalog data (games, weapons, attachments, perks,
equipment) is managed through a self-hosted [Directus](https://directus.io)
instance pointed directly at the app's Supabase Postgres database, using
Supabase Storage as Directus's file/image backend. Directus only needs to run
when someone is editing content — the live app reads Postgres directly via
the edge function in `supabase/functions/server/index.tsx` and serves images
straight from Supabase Storage, with no runtime dependency on Directus.

## One-time setup

1. **Create a public Storage bucket.** Supabase Dashboard → Storage →
   Buckets → New bucket (e.g. `cms-assets`), marked **Public**. This is
   where Directus will store uploaded images.
2. **Get an S3 access key for that bucket.** Supabase Dashboard → Project
   Settings → Storage → S3 Connection → generate access key/secret.
3. **Get the Postgres connection string.** Supabase Dashboard → Project
   Settings → Database → Connection string → **Session pooler** URI (port
   5432 — Directus wants a stable, non-transaction-mode connection).
4. **Copy `.env.example` to `.env`** and fill in everything from steps 1–3,
   plus a generated `DIRECTUS_KEY`/`DIRECTUS_SECRET` (e.g. `openssl rand -hex
   32` each) and an admin email/password for Directus's first-boot account.
5. **Boot Directus**: `docker compose up -d`. This lets Directus connect to
   the (currently empty) database and create its own system tables,
   including `directus_files`.
6. **Apply the app schema.** Once Directus has booted successfully, open the
   Supabase SQL Editor and run all of `SCHEMA.sql`. It's safe to re-run at
   any point — it drops and recreates the app's own tables, but never
   touches Directus's `directus_*` tables.
7. **Attach the image foreign keys.** Uncomment and run the `ALTER TABLE`
   block at the bottom of `SCHEMA.sql` (kept commented by default so the
   file works even before Directus has booted).
8. **Register the tables in Directus.** Open `http://localhost:8055`, log in
   with your admin credentials, go to Settings → Data Model → Create
   Collection → "Use Existing Table" for each of: `games`,
   `weapon_categories`, `weapons`, `attachment_types`, `attachments`,
   `perks`, `equipment`, `classes`, `specializations`, `tags`,
   `tag_weapon_categories`, `loadout_weapons`, `loadout_weapon_attachments`,
   `loadout_perks`, `loadout_equipment`, `loadout_reactions`.
   Every free-text column in this schema (`name`, `slug`, `description`,
   `user_id`, `user_name`, `type`, ...) is a Postgres `text` type, which
   Directus auto-detects as a multi-line textarea by default — explicitly
   set each one's interface to **Text Input** (single line) instead, with
   one exception: leave `loadouts.description` as a textarea (multi-line
   is the point there — it's freeform loadout notes, not a short label).
   Don't touch FK columns (`game_id`, etc. — those get the M2O dropdown
   treatment below), primary keys, or `tags.color` (color picker). For each table's
   `image` column, set the field interface to Directus's built-in
   Image/File type so uploads and thumbnail previews work in the admin UI.
   For each foreign-key column (e.g. `attachments.attachment_type_id`,
   `attachments.game_id`, `weapons.weapon_category_id`, `weapon_categories.
   game_id`), set the field interface to **Select Dropdown (M2O)** — Directus
   detects the FK and offers this automatically when you create/edit the
   field — so editors pick the related row from a dropdown instead of typing
   a raw ID. `attachments.game_id` duplicates the game already implied by
   `attachment_type_id` (every `attachment_types` row belongs to one game),
   so on that field's dropdown set a **Filter** of
   `id equals $CURRENT.attachment_type_id.game_id` (filtering the `games`
   collection by the game of the currently selected Attachment Type) — this
   scopes the games offered to whichever game the selected Attachment Type
   belongs to, so editors can't pick a mismatched game for an attachment.
   For `tags.color`, set the interface to Directus's built-in **Color**
   picker. Mark `tag_weapon_categories` hidden (Settings on that
   collection) — it's only the junction table backing `tags`' M2M "allowed
   weapon categories" field; editors manage it from the `tags` form, they
   never need to open the junction collection directly. For that field
   (`tags.allowed_weapon_categories`), use the **List M2M** interface, not
   Checkboxes — Directus's Checkboxes interface only works against a static
   `options.choices` array on a plain csv/json field, it can't pull items
   from a related collection at all, so it silently shows "No options
   available" if used on an M2M field. Directus doesn't auto-flatten M2M
   fields at the query layer — `allowed_weapon_categories` resolves to rows
   of the *junction* (`tag_weapon_categories`), each still carrying its own
   `weapon_category_id` FK, not directly to `weapon_categories`. So the
   field's display **template** must reference the second hop —
   `{{weapon_category_id.name}}`, not `{{name}}` — or every read of `tags`
   that touches this field 403s with "You don't have permission to access
   field name in collection tag_weapon_categories... or it does not exist"
   (Directus is quoting the wrong collection because it's still looking at
   the junction row, one hop short). If you're setting this M2M up via raw
   SQL against `directus_relations` (rather than Directus's own field
   wizard, which does this for you): **both** relation rows on the junction
   table need `junction_field` set, each pointing at the *other* row's FK
   column name — `tag_weapon_categories.tag_id`'s relation needs
   `junction_field = 'weapon_category_id'`, and
   `tag_weapon_categories.weapon_category_id`'s relation needs
   `junction_field = 'tag_id'`. Missing the second one makes the admin
   form's `allowed_weapon_categories` field show "The relationship is not
   configured properly or you don't have permission to access it" — the
   app's `useRelationM2M` composable walks from the first relation to the
   second specifically by matching `junction_field` reciprocally, so with
   only one side set it can't find its pair and treats the M2M as entirely
   unconfigured (even though reads/writes against the API work fine
   either way, since PostgREST doesn't care about this Directus-only
   bookkeeping). Leaving the list empty for a tag
   means the tag is unrestricted (selectable regardless of the loadout's
   weapon category). Similarly, mark `loadout_weapons`,
   `loadout_weapon_attachments`, `loadout_perks`, and `loadout_equipment`
   hidden — a loadout's weapon/perk/equipment selections are written by the
   app (`LoadoutBuilder.tsx` via the edge function), not edited directly in
   Directus; browse/moderate them from the `loadouts` form's
   `weapon_slots`/`perk_slots`/`equipment_slots` fields instead of opening
   the junction collections directly.

   These four fields split into two different shapes, and it matters which
   one you pick:
   - **`loadouts.perk_slots`, `loadouts.equipment_slots`, and
     `loadout_weapons.attachments`** should be genuine **M2M** (List M2M
     interface, `{{perk_id.name}}`/`{{equipment_id.name}}`/
     `{{attachment_id.name}}` templates, `junction_field` set reciprocally
     on both `directus_relations` rows per the recipe above). Their
     junction tables (`loadout_perks`, `loadout_equipment`,
     `loadout_weapon_attachments`) carry nothing but the two FKs, so
     there's no per-row data to lose — as real M2M, "Add Existing" browses
     the actual perks/equipment/attachments catalog (what you want), and
     clicking an item opens that catalog row.
   - **`loadouts.weapon_slots`** must stay a plain **O2M** into
     `loadout_weapons` (List O2M interface, `junction_field` left `NULL`
     on both relations) — *don't* convert this one to M2M. Unlike the
     others, `loadout_weapons` rows carry real per-slot data (`slot_order`,
     plus their own nested `attachments` relation), so if this field were
     M2M, clicking a weapon slot would open the raw `weapons` catalog item
     instead of the slot — losing access to that slot's attachments from
     the loadouts form entirely, and risking edits to the shared catalog
     weapon instead of just this one loadout's selection.

   Also mark `loadout_reactions` hidden, with a plain **O2M** `reactions`
   field on `loadouts` (template `{{type}} - {{user_id}}`) for
   moderation — it doesn't relate to another catalog collection at all (its
   only columns are `user_id` and `type`), so the M2M-vs-O2M question above
   doesn't apply here; it's always O2M.
9. **Set `SUPABASE_STORAGE_BUCKET`** (and confirm `SUPABASE_URL` /
   `SUPABASE_SERVICE_ROLE_KEY`) as environment variables on the Supabase Edge
   Function, matching the bucket name from step 1, so the backend can build
   public image URLs.

## Day to day

- **Editing catalog content** (add a weapon, upload an attachment icon,
  tweak a perk description): run `docker compose up -d`, edit in Directus at
  `localhost:8055`, then `docker compose down` when done. Changes are live
  in the app immediately (same Postgres tables), no redeploy needed.
- **Moderating loadouts**: the `loadouts` table (user-generated, tied to
  Supabase Auth `user_id`) is also visible as a normal collection in
  Directus if you register it the same way as step 8 — useful for deleting
  abusive content without needing dashboard SQL access.

## Why not the fully-normalized loadout schema?

The frontend's `LoadoutBuilder.tsx` currently embeds full weapon objects and
free-text perk/equipment name arrays in each loadout, rather than
referencing catalog rows by ID. `SCHEMA.sql`'s `loadouts` table matches that
shape (a `weapons` JSONB column, `perks`/`equipment` as `TEXT[]`) instead of
the fully-relational `loadout_weapons`/`loadout_perks` junction-table design
from earlier drafts of this doc. Normalizing loadouts to reference catalog
IDs is real future work, but it requires rebuilding the loadout builder UI
to pick from catalog items instead of embedding copies — a separate, larger
change from "add a CMS for the catalog."
