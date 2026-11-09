import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { builderWeaponIds } from "./weapon-builder-compatibility.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
const entries = catalog.assets
  .filter((asset) => ["ammunition", "apex"].includes(asset.slot))
  .map((asset) => ({ asset, weaponIds: builderWeaponIds(asset, catalog) }))
  .filter(({ weaponIds }) => weaponIds.length)
  .map(({ asset, weaponIds }) => ({
    assetId: asset.id,
    slot: asset.slot,
    name: asset.internal_title || asset.title,
    imagePath: asset.src ? `/weapon-preview/mw4-attachments/${asset.src.split("/mw4-attachments/")[1]}` : null,
    displayName: asset.display_name || asset.title,
    subtypeLabel: asset.subtype_label ?? null,
    weaponDisplayNames: asset.weapon_display_names ?? {},
    weaponIds,
    composable: asset.composable === true,
    families: asset.families ?? [],
    evidence: asset.evidence ?? null,
  }));
if (entries.some((entry) => entry.imagePath && !entry.imagePath.startsWith("/weapon-preview/mw4-attachments/images/"))) {
  throw new Error("Unexpected ammunition or APEX image path");
}
if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing database connection");
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await db.connect();
  await db.query("BEGIN");
  await db.query("SET LOCAL lock_timeout = '5s'");
  await db.query("SET LOCAL statement_timeout = '60s'");
  const types = await db.query("SELECT id, slug FROM public.attachment_types WHERE game_id = 'mw4' AND slug = ANY($1::text[])", [["ammunition", "apex"]]);
  if (types.rowCount !== 2) throw new Error("MW4 ammunition or APEX attachment type is missing");
  const existing = await db.query("SELECT stats->>'assetId' AS asset_id FROM public.attachments WHERE game_id = 'mw4' AND stats->>'assetId' = ANY($1::text[])", [entries.map((entry) => entry.assetId)]);
  const present = new Set(existing.rows.map((row) => row.asset_id));
  const pending = entries.filter((entry) => !present.has(entry.assetId));
  if (pending.length) {
    await db.query(`INSERT INTO public.attachments (game_id, attachment_type_id, name, image, stats)
      SELECT 'mw4', t.id, a.name,
        (SELECT f.id FROM public.directus_files f
          WHERE f.filename_download = split_part(a.image_path, '/',
            array_length(string_to_array(a.image_path, '/'), 1)) LIMIT 1),
        jsonb_build_object('assetId', a.asset_id,
          'displayName', a.display_name, 'subtypeLabel', a.subtype_label,
          'weaponDisplayNames', a.weapon_display_names, 'weaponIds', a.weapon_ids,
          'composable', a.composable, 'builderSelectable', true,
          'families', a.families, 'evidence', a.evidence)
      FROM jsonb_to_recordset($1::jsonb) AS a(asset_id text, slot text,
        name text, image_path text, display_name text, subtype_label text,
        weapon_display_names jsonb, weapon_ids jsonb, composable boolean,
        families jsonb, evidence text)
      JOIN public.attachment_types t ON t.game_id = 'mw4' AND t.slug = a.slot`, [JSON.stringify(pending.map((entry) => ({
      asset_id: entry.assetId, slot: entry.slot, name: entry.name,
      image_path: entry.imagePath, display_name: entry.displayName,
      subtype_label: entry.subtypeLabel, weapon_display_names: entry.weaponDisplayNames,
      weapon_ids: entry.weaponIds, composable: entry.composable,
      families: entry.families, evidence: entry.evidence,
    })))]);
  }
  await db.query(`UPDATE public.attachments a
    SET stats = a.stats || jsonb_build_object('weaponIds', e.weapon_ids,
      'displayName', e.display_name,
      'builderSelectable', true)
    FROM jsonb_to_recordset($1::jsonb) AS e(asset_id text, weapon_ids jsonb,
      image_path text, display_name text)
    WHERE a.game_id = 'mw4' AND a.stats->>'assetId' = e.asset_id
      AND (a.stats->'weaponIds' IS DISTINCT FROM e.weapon_ids OR
        a.stats->>'displayName' IS DISTINCT FROM e.display_name OR
        a.stats->'builderSelectable' IS DISTINCT FROM 'true'::jsonb)`,
  [JSON.stringify(entries.map((entry) => ({ asset_id: entry.assetId,
    weapon_ids: entry.weaponIds, image_path: entry.imagePath,
    display_name: entry.displayName })))]);
  await db.query(`UPDATE public.attachments a SET image = f.id
    FROM public.directus_files f,
      jsonb_to_recordset($1::jsonb) AS e(asset_id text, image_path text)
    WHERE a.game_id = 'mw4' AND a.image IS NULL
      AND a.stats->>'assetId' = e.asset_id
      AND f.filename_download = split_part(e.image_path, '/',
        array_length(string_to_array(e.image_path, '/'), 1))`,
  [JSON.stringify(entries.map((entry) => ({ asset_id: entry.assetId, image_path: entry.imagePath })))]);
  const verified = await db.query(`SELECT count(*)::int AS count FROM public.attachments
    WHERE game_id = 'mw4' AND stats->>'assetId' = ANY($1::text[])`, [entries.map((entry) => entry.assetId)]);
  if (verified.rows[0].count !== entries.length) throw new Error("Some ammunition or APEX options were not synchronized");
  await db.query("COMMIT");
  console.log(`Synchronized and verified ${entries.length} ammunition/APEX options (${pending.length} new)`);
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await db.end().catch(() => {});
}
