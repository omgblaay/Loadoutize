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
   `perks`, `equipment`, `classes`, `specializations`. For each table's
   `image` column, set the field interface to Directus's built-in
   Image/File type so uploads and thumbnail previews work in the admin UI.
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
