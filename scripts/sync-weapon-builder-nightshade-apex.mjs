import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
const weapon = catalog.weapons.find((item) => item.id === "rex_sm_spier9");
const asset = catalog.assets.find((item) => item.id === "rex_apex_spier9");
if (!weapon?.assets.includes(asset?.id) || asset.slot !== "apex" ||
    asset.receiver_variant !== "rex_rec_spier9_apex" || !asset.controller_only) {
  throw new Error("ISO Nightshade APEX recipe is missing or invalid");
}
if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing database connection");
const imagePath = `/weapon-preview/mw4-attachments/${asset.src.split("/mw4-attachments/")[1]}`;
if (!imagePath.startsWith("/weapon-preview/mw4-attachments/images/")) throw new Error("Unexpected APEX image path");

const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  const type = await client.query("SELECT id FROM public.attachment_types WHERE game_id = 'mw4' AND slug = 'apex'");
  if (type.rowCount !== 1) throw new Error("Expected one MW4 APEX attachment type");
  await client.query(`
    INSERT INTO public.attachments (game_id, attachment_type_id, name, stats)
    SELECT 'mw4', $1, $2, $3::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM public.attachments WHERE game_id = 'mw4' AND stats->>'assetId' = $4
    )`, [type.rows[0].id, asset.internal_title, JSON.stringify({
      assetId: asset.id,
      imagePath,
      displayName: asset.display_name || asset.title,
      subtypeLabel: asset.subtype_label ?? null,
      weaponDisplayNames: asset.weapon_display_names ?? {},
      weaponIds: [weapon.id],
      composable: false,
      builderSelectable: true,
      families: asset.families,
      evidence: asset.evidence ?? null,
    }), asset.id]);
  const result = await client.query(`
    SELECT a.stats->'weaponIds' AS weapon_ids
    FROM public.attachments a
    WHERE a.game_id = 'mw4' AND a.stats->>'assetId' = $1`, [asset.id]);
  if (result.rowCount !== 1 || !result.rows[0].weapon_ids?.includes(weapon.id)) {
    throw new Error("ISO Nightshade APEX was not linked to its weapon");
  }
  await client.query("COMMIT");
  console.log("ISO Nightshade APEX is available and linked to rex_sm_spier9");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
