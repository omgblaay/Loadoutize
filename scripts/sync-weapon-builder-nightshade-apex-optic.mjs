import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
const apex = catalog.assets.find((asset) => asset.id === "rex_apex_spier9");
const optic = catalog.assets.find((asset) => asset.id === "rex_holo_spier9");
if (apex?.dependencies?.optic !== optic?.id ||
    !apex.locked_slots?.includes("optic") ||
    !apex.locked_slots?.includes("ammunition") ||
    optic.display_name !== "Apex Optic" || !optic.dependency_only) {
  throw new Error("ISO Nightshade APEX dependency is incomplete");
}
if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing database connection");
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await db.connect();
  await db.query("BEGIN");
  await db.query("SET LOCAL lock_timeout = '5s'");
  const changed = await db.query(`
    UPDATE public.attachments
    SET display_name = 'Apex Optic',
      stats = (stats - 'displayName') || jsonb_build_object('builderSelectable', false)
    WHERE game_id = 'mw4' AND stats->>'assetId' = $1
    RETURNING display_name,
      stats->>'builderSelectable' AS builder_selectable`, [optic.id]);
  if (changed.rowCount !== 1 || changed.rows[0].display_name !== "Apex Optic" ||
      changed.rows[0].builder_selectable !== "false") {
    throw new Error("Apex Optic was not made APEX-only");
  }
  await db.query("COMMIT");
  console.log("ISO Nightshade Apex Optic is named and APEX-only");
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await db.end().catch(() => {});
}
