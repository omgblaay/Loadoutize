import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
const apply = process.argv.includes("--apply");
const hiddenAliases = ["rex_laserir_lrg", "rex_laserhip_lrg03_dim_sp", "rex_laserhip_lrg03_sp", "rex_stock_ass_kilo2_sp", "rex_pgrip_kilo2_gl"];
const entries = catalog.assets.map((asset) => ({
  asset_id: asset.id,
  display_name: asset.slot === "laser" && asset.families.length === 0 && asset.subtype_label
    ? asset.subtype_label
    : asset.display_name || asset.title,
  subtype_label: asset.subtype_label ?? null,
}));
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query("SET LOCAL statement_timeout = '30s'");
  const payload = JSON.stringify(entries);
  const changes = await client.query(`
    SELECT a.stats->>'assetId' AS asset_id
    FROM public.attachments a
    JOIN jsonb_to_recordset($1::jsonb) AS n(
      asset_id text, display_name text, subtype_label text
    ) ON a.stats->>'assetId' = n.asset_id
    WHERE a.game_id = 'mw4' AND (
      a.display_name IS DISTINCT FROM n.display_name OR
      a.subtype_label IS DISTINCT FROM n.subtype_label OR
      a.stats ? 'displayName' OR a.stats ? 'subtypeLabel' OR
      a.stats ? 'weaponDisplayNames'
    )`, [payload]);
  console.log(`${changes.rowCount} attachment label records need updating`);
  if (apply) {
    const updated = await client.query(`
      UPDATE public.attachments a
      SET display_name = n.display_name, subtype_label = n.subtype_label,
        stats = coalesce(a.stats, '{}'::jsonb) - 'displayName' - 'subtypeLabel' - 'weaponDisplayNames'
      FROM jsonb_to_recordset($1::jsonb) AS n(
        asset_id text, display_name text, subtype_label text
      )
      WHERE a.game_id = 'mw4' AND a.stats->>'assetId' = n.asset_id AND (
        a.display_name IS DISTINCT FROM n.display_name OR
        a.subtype_label IS DISTINCT FROM n.subtype_label OR
        a.stats ? 'displayName' OR a.stats ? 'subtypeLabel' OR
        a.stats ? 'weaponDisplayNames'
      )`, [payload]);
    if (updated.rowCount !== changes.rowCount) throw new Error("Attachment label update count changed during sync");
    const aliases = await client.query(`
      UPDATE public.attachments SET stats = coalesce(stats, '{}'::jsonb) ||
        jsonb_build_object('builderSelectable', false, 'weaponIds', '[]'::jsonb)
      WHERE game_id='mw4' AND stats->>'assetId' = ANY($1::text[])
        AND stats->>'builderSelectable' IS DISTINCT FROM 'false'
    `, [hiddenAliases]);
    await client.query("COMMIT");
    console.log(`Updated ${updated.rowCount} MW4 attachment labels and hid ${aliases.rowCount} duplicate attachment aliases`);
  } else {
    await client.query("ROLLBACK");
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
