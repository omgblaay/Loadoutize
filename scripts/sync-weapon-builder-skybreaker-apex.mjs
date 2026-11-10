import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
const asset = catalog.assets.find((item) => item.id === "rex_apex_kilo2_skybreaker");
if (!asset || asset.slot !== "apex" || !asset.controller_only) throw new Error("Missing HAN 86 Skybreaker APEX recipe");
if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
const imagePath = `/weapon-preview/mw4-attachments/${asset.src.split("/mw4-attachments/")[1]}`;
if (!imagePath.startsWith("/weapon-preview/mw4-attachments/images/")) throw new Error("Unexpected Skybreaker image path");

const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  const type = await client.query("SELECT id FROM public.attachment_types WHERE game_id='mw4' AND slug='apex'");
  if (type.rowCount !== 1) throw new Error("Expected one MW4 APEX attachment type");
  const result = await client.query(`
    INSERT INTO public.attachments (game_id, attachment_type_id, name, display_name, subtype_label, image, stats)
    SELECT 'mw4', $1, $2, $6, $7,
      (SELECT id FROM public.directus_files WHERE filename_download = $5 LIMIT 1),
      $3::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM public.attachments WHERE game_id='mw4' AND stats->>'assetId'=$4
    )`, [type.rows[0].id, asset.internal_title, JSON.stringify({
    assetId: asset.id,
    weaponIds: ["rex_ar_kilo2"],
    composable: false,
    builderSelectable: true,
    families: asset.families,
    evidence: asset.evidence ?? null,
  }), asset.id, imagePath.split('/').at(-1), asset.display_name, asset.subtype_label ?? null]);
  await client.query("COMMIT");
  console.log(`Added ${result.rowCount} HAN 86 Skybreaker APEX attachment`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
