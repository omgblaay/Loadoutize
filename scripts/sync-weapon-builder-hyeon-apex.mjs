import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
const ids = ["rex_apex_xar1_hyperburst", "rex_apex_xar1_auto"];
const assets = ids.map((id) => {
  const asset = catalog.assets.find((item) => item.id === id);
  if (!asset || asset.slot !== "apex") throw new Error(`Missing Hyeon APEX asset: ${id}`);
  return asset;
});
if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  const type = await client.query("SELECT id FROM public.attachment_types WHERE game_id='mw4' AND slug='apex'");
  if (type.rowCount !== 1) throw new Error("Expected one MW4 APEX attachment type");
  let added = 0;
  for (const asset of assets) {
    // Resolve the catalog-relative path inside the public weapon-preview tree.
    const path = `/weapon-preview/mw4-attachments/${asset.src.split("/mw4-attachments/")[1]}`;
    if (!path.startsWith("/weapon-preview/mw4-attachments/images/")) throw new Error(`Unexpected image path for ${asset.id}`);
    const result = await client.query(`
      INSERT INTO public.attachments (game_id, attachment_type_id, name, stats)
      SELECT 'mw4', $1, $2, $3::jsonb
      WHERE NOT EXISTS (
        SELECT 1 FROM public.attachments WHERE game_id='mw4' AND stats->>'assetId'=$4
      )`, [type.rows[0].id, asset.internal_title, JSON.stringify({
      assetId: asset.id,
      imagePath: path,
      displayName: asset.display_name,
      subtypeLabel: asset.subtype_label ?? null,
      weaponDisplayNames: asset.weapon_display_names ?? {},
      weaponIds: ["rex_ar_xar1"],
      composable: false,
      builderSelectable: true,
      families: asset.families,
      evidence: asset.evidence ?? null,
    }), asset.id]);
    added += result.rowCount;
  }
  await client.query("COMMIT");
  console.log(`Added ${added} Hyeon APEX attachments`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
