import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
const rows = readFileSync(resolve(root, "data/mw4-underbarrels.tsv"), "utf8").trim().split(/\r?\n/);
const choices = catalog.assets.filter((asset) => asset.slot === "underbarrel" && asset.underbarrel_table);
const factoryIds = new Set(catalog.weapons.map((weapon) => weapon.factory_parts?.underbarrel).filter(Boolean));
if (rows.length !== 22 || choices.length !== 21 ||
    catalog.assets.filter((asset) => asset.slot === "underbarrel" && !asset.underbarrel_table && !factoryIds.has(asset.id)).length ||
    new Set(choices.map((asset) => asset.id)).size !== 21) {
  throw new Error("The 21-row MW4 underbarrel table and catalog are out of sync");
}
for (const asset of choices) {
  const row = rows[asset.underbarrel_order]?.split("\t");
  if (!row || asset.display_name !== row[0].toUpperCase() ||
      asset.subtype_label !== row[1].toUpperCase() ||
      asset.image_asset_id !== row[2] || !asset.weapon_ids?.length || !asset.src) {
    throw new Error(`Invalid underbarrel choice ${asset.id}`);
  }
}
if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await db.connect();
  const type = await db.query("SELECT id FROM public.attachment_types WHERE game_id='mw4' AND slug='underbarrel'");
  if (type.rowCount !== 1) throw new Error("Expected one MW4 underbarrel type");
  const existing = await db.query(`SELECT id, image, stats->>'assetId' AS asset_id
    FROM public.attachments WHERE game_id='mw4' AND attachment_type_id=$1 ORDER BY id`, [type.rows[0].id]);
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
  const canonicalIds = [];
  let inserted = 0;
  for (const asset of choices) {
    const old = byAsset.get(asset.id)?.[0];
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
      underbarrelOrder: asset.underbarrel_order,
      imagePath,
      composable: asset.composable === true,
      builderSelectable: true,
    };
    const name = rows[asset.underbarrel_order].split("\t")[0];
    const result = old
      ? await db.query(`UPDATE public.attachments SET name=$2, display_name=$3,
          subtype_label=$4, image=coalesce($5::uuid,image),
          stats=(coalesce(stats,'{}'::jsonb) - 'displayName' - 'subtypeLabel' - 'weaponDisplayNames') || $6::jsonb
          WHERE id=$1 RETURNING id`,
        [old.id, name, asset.display_name, asset.subtype_label, image, JSON.stringify(stats)])
      : await db.query(`INSERT INTO public.attachments
          (game_id,attachment_type_id,name,display_name,subtype_label,image,stats)
          VALUES ('mw4',$1,$2,$3,$4,$5::uuid,$6::jsonb) RETURNING id`,
        [type.rows[0].id, name, asset.display_name, asset.subtype_label, image, JSON.stringify(stats)]);
    if (!old) inserted++;
    canonicalIds.push(result.rows[0].id);
  }
  const obsoleteIds = existing.rows.filter((row) =>
    !canonicalIds.includes(row.id) && !factoryIds.has(row.asset_id)).map((row) => row.id);
  const referenced = await db.query(`SELECT count(*)::int AS count FROM public.loadout_weapon_attachments
    WHERE attachment_id=ANY($1::int[])`, [obsoleteIds]);
  if (referenced.rows[0].count) throw new Error(`${referenced.rows[0].count} obsolete underbarrel references need migration`);
  const removed = await db.query("DELETE FROM public.attachments WHERE id=ANY($1::int[])", [obsoleteIds]);
  if (removed.rowCount !== obsoleteIds.length) throw new Error("Could not remove obsolete underbarrels");
  const verified = await db.query(`SELECT id, stats->>'assetId' AS asset_id, stats->'weaponIds' AS weapon_ids
    FROM public.attachments WHERE game_id='mw4' AND attachment_type_id=$1`, [type.rows[0].id]);
  const byId = new Map(choices.map((asset) => [asset.id, asset]));
  if (verified.rows.length !== choices.length + factoryIds.size || verified.rows.some((row) =>
      !byId.has(row.asset_id) && !factoryIds.has(row.asset_id) ||
      byId.has(row.asset_id) && JSON.stringify(row.weapon_ids) !== JSON.stringify(byId.get(row.asset_id).weapon_ids))) {
    throw new Error("MW4 underbarrel choices failed verification");
  }
  await db.query("COMMIT");
  console.log(`Verified 21 MW4 underbarrel choices (${inserted} inserted, ${removed.rowCount} obsolete rows removed)`);
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await db.end().catch(() => {});
}
