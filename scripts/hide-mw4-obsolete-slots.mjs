import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
const ids = catalog.assets
  .filter((asset) => ["iron_sights", "other"].includes(asset.slot))
  .map((asset) => asset.id);
if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");

const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query("SET LOCAL statement_timeout = '30s'");
  const updated = await client.query(`
    UPDATE public.attachments AS a
    SET stats = coalesce(a.stats, '{}'::jsonb) ||
      jsonb_build_object('builderSelectable', false, 'weaponIds', '[]'::jsonb)
    WHERE a.game_id = 'mw4' AND a.stats->>'assetId' = ANY($1::text[])
      AND (a.stats->>'builderSelectable' IS DISTINCT FROM 'false'
        OR coalesce(a.stats->'weaponIds', '[]'::jsonb) <> '[]'::jsonb)
    RETURNING a.stats->>'assetId' AS asset_id
  `, [ids]);
  const remaining = await client.query(`
    SELECT count(*)::integer AS count
    FROM public.attachments AS a
    WHERE a.game_id = 'mw4' AND a.stats->>'assetId' = ANY($1::text[])
      AND (a.stats->>'builderSelectable' IS DISTINCT FROM 'false'
        OR coalesce(a.stats->'weaponIds', '[]'::jsonb) <> '[]'::jsonb)
  `, [ids]);
  if (remaining.rows[0].count !== 0) throw new Error("Some obsolete slots remain selectable");
  await client.query("COMMIT");
  const afterCommit = await client.query(`
    SELECT count(*)::integer AS count FROM public.attachments AS a
    WHERE a.game_id = 'mw4' AND a.stats->>'assetId' = ANY($1::text[])
      AND (a.stats->>'builderSelectable' IS DISTINCT FROM 'false'
        OR coalesce(a.stats->'weaponIds', '[]'::jsonb) <> '[]'::jsonb)
  `, [ids]);
  if (afterCommit.rows[0].count !== 0) throw new Error("Obsolete slots reappeared after commit");
  console.log(`Hid ${updated.rowCount} MW4 Iron sights/Other entries; ${ids.length} source assets retained`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
