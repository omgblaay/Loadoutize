import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
const table = readFileSync(resolve(root, "data/mw4-muzzles.tsv"), "utf8").trim().split(/\r?\n/);
const choices = catalog.assets.filter((asset) => asset.slot === "muzzle" && asset.muzzle_table);
if (table.length !== 119 || choices.length !== 118 ||
    new Set(choices.map((asset) => asset.id)).size !== 118) {
  throw new Error("The 118-row MW4 muzzle table and catalog are out of sync");
}
for (const asset of choices) {
  const row = table[asset.muzzle_order]?.split("\t");
  if (!row || asset.display_name !== row[0].toUpperCase() ||
      asset.subtype_label !== (row[1] ? row[1].toUpperCase() : null) ||
      asset.image_asset_id !== row[2] || !asset.weapon_ids?.length || !asset.src) {
    throw new Error(`Invalid muzzle choice ${asset.id}`);
  }
}

if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await db.connect();
  const type = await db.query("SELECT id FROM public.attachment_types WHERE game_id='mw4' AND slug='muzzle'");
  if (type.rowCount !== 1) throw new Error("Expected one MW4 muzzle type");
  const existing = await db.query(`SELECT id, image, stats->>'assetId' AS asset_id
    FROM public.attachments WHERE game_id='mw4' AND attachment_type_id=$1
    ORDER BY id`, [type.rows[0].id]);
  const byAsset = new Map();
  for (const row of existing.rows) {
    const group = byAsset.get(row.asset_id) ?? [];
    group.push(row);
    byAsset.set(row.asset_id, group);
  }
  const filenames = [...new Set(choices.map((asset) => asset.src.split("/").at(-1)))];
  const files = await db.query("SELECT id, filename_download FROM public.directus_files WHERE filename_download=ANY($1::text[])", [filenames]);
  const images = new Map(files.rows.map((file) => [file.filename_download, file.id]));

  await db.query("BEGIN");
  await db.query("SET LOCAL lock_timeout = '5s'");
  await db.query("SET LOCAL statement_timeout = '60s'");
  let inserted = 0;
  for (const asset of choices) {
    const original = byAsset.get(asset.image_asset_id)?.[0];
    const image = images.get(asset.src.split("/").at(-1)) ?? original?.image ?? null;
    const imagePath = `/weapon-preview/mw4-attachments/${asset.src.split("/mw4-attachments/")[1]}`;
    if (!imagePath.startsWith("/weapon-preview/mw4-attachments/images/")) {
      throw new Error(`Unsafe image path for ${asset.id}`);
    }
    const stats = {
      assetId: asset.id,
      imageAssetId: asset.image_asset_id,
      weaponIds: asset.weapon_ids,
      muzzleOrder: asset.muzzle_order,
      imagePath,
      composable: asset.composable === true,
      builderSelectable: true,
    };
    const old = byAsset.get(asset.id)?.[0];
    if (old) {
      await db.query(`UPDATE public.attachments
        SET name=$2, display_name=$6, subtype_label=$3, image=coalesce($4::uuid,image),
          stats=(coalesce(stats,'{}'::jsonb) - 'displayName' - 'subtypeLabel' - 'weaponDisplayNames') || $5::jsonb
        WHERE id=$1`, [old.id, table[asset.muzzle_order].split("\t")[0],
          asset.subtype_label, image, JSON.stringify(stats), asset.display_name]);
    } else {
      await db.query(`INSERT INTO public.attachments
        (game_id,attachment_type_id,name,display_name,subtype_label,image,stats)
        VALUES ('mw4',$1,$2,$6,$3,$4::uuid,$5::jsonb)`,
      [type.rows[0].id, table[asset.muzzle_order].split("\t")[0],
        asset.subtype_label, image, JSON.stringify(stats), asset.display_name]);
      inserted++;
    }
  }
  const visibleIds = choices.map((asset) => asset.id);
  const hidden = await db.query(`UPDATE public.attachments
    SET stats=coalesce(stats,'{}'::jsonb) || '{"builderSelectable":false,"weaponIds":[]}'::jsonb
    WHERE game_id='mw4' AND attachment_type_id=$1
      AND (stats->>'assetId' IS NULL OR stats->>'assetId' <> ALL($2::text[]) OR id = ANY($3::int[]))
      AND (stats->>'builderSelectable' IS DISTINCT FROM 'false' OR stats->'weaponIds' <> '[]'::jsonb)`,
  [type.rows[0].id, visibleIds,
    [...byAsset.values()].flatMap((rows) => rows.slice(1).map((row) => row.id))]);
  const verified = await db.query(`SELECT count(*)::int AS count,
      count(DISTINCT stats->>'assetId')::int AS distinct_count
    FROM public.attachments WHERE game_id='mw4' AND attachment_type_id=$1
      AND stats->>'builderSelectable'='true' AND stats->>'assetId'=ANY($2::text[])`,
  [type.rows[0].id, visibleIds]);
  if (verified.rows[0].count !== 118 || verified.rows[0].distinct_count !== 118) {
    throw new Error("MW4 muzzle choices failed verification");
  }
  const unexpected = await db.query(`SELECT count(*)::int AS count FROM public.attachments
    WHERE game_id='mw4' AND attachment_type_id=$1
      AND stats->>'builderSelectable'='true'
      AND (stats->>'assetId' IS NULL OR stats->>'assetId' <> ALL($2::text[]))`,
  [type.rows[0].id, visibleIds]);
  if (unexpected.rows[0].count !== 0) throw new Error("Non-table MW4 muzzles remain selectable");
  const canonical = await db.query(`SELECT id, name, stats->>'assetId' AS asset_id
    FROM public.attachments WHERE game_id='mw4' AND attachment_type_id=$1
      AND stats->>'builderSelectable'='true'`, [type.rows[0].id]);
  const canonicalIds = canonical.rows.map((row) => row.id);
  const canonicalByAssetId = new Map(canonical.rows.map((row) => [row.asset_id, row]));
  const canonicalByName = new Map();
  for (const asset of choices) {
    const row = canonicalByAssetId.get(asset.id);
    if (!row) throw new Error(`Missing canonical muzzle ${asset.id}`);
    const group = canonicalByName.get(asset.display_name) ?? [];
    group.push({ id: row.id, weaponIds: asset.weapon_ids });
    canonicalByName.set(asset.display_name, group);
  }
  const obsolete = await db.query(`SELECT a.id, a.name, lwa.id AS relation_id,
      lwa.loadout_weapon_id, lw.weapon_id
    FROM public.attachments a
    LEFT JOIN public.loadout_weapon_attachments lwa ON lwa.attachment_id=a.id
    LEFT JOIN public.loadout_weapons lw ON lw.id=lwa.loadout_weapon_id
    WHERE a.game_id='mw4' AND a.attachment_type_id=$1
      AND a.id <> ALL($2::int[])`, [type.rows[0].id, canonicalIds]);
  let migrated = 0;
  for (const row of obsolete.rows) {
    if (row.relation_id == null) continue;
    if (row.loadout_weapon_id == null) {
      await db.query('DELETE FROM public.loadout_weapon_attachments WHERE id=$1', [row.relation_id]);
      continue;
    }
    const name = row.name.replace(/\s+\[CODMunity[^\]]*\]$/i, '').toUpperCase();
    const target = (canonicalByName.get(name) ?? []).find((choice) =>
      choice.weaponIds.includes(row.weapon_id));
    if (!target) throw new Error(`Cannot map referenced muzzle ${row.id} for ${row.weapon_id}`);
    const duplicate = await db.query(`SELECT id FROM public.loadout_weapon_attachments
      WHERE loadout_weapon_id=$1 AND attachment_id=$2`,
    [row.loadout_weapon_id, target.id]);
    if (duplicate.rowCount) {
      await db.query('DELETE FROM public.loadout_weapon_attachments WHERE id=$1', [row.relation_id]);
    } else {
      await db.query('UPDATE public.loadout_weapon_attachments SET attachment_id=$2 WHERE id=$1',
        [row.relation_id, target.id]);
    }
    migrated++;
  }
  const obsoleteIds = [...new Set(obsolete.rows.map((row) => row.id))];
  const removed = await db.query('DELETE FROM public.attachments WHERE id=ANY($1::int[])', [obsoleteIds]);
  if (removed.rowCount !== obsoleteIds.length) throw new Error('Could not remove all obsolete muzzles');
  await db.query("COMMIT");
  console.log(`Verified 118 MW4 muzzle choices (${inserted} inserted, ${migrated} saved choices migrated, ${removed.rowCount} obsolete rows removed)`);
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await db.end().catch(() => {});
}
