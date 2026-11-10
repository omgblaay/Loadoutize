import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
const weaponIds = ["rex_ar_cromeo", "rex_sm_fmgolf"];
const apexIds = ["rex_apex_cromeo", "rex_apex_fmgolf", "rex_apex_menu_golf28_1116"];
const weapons = weaponIds.map((id) => catalog.weapons.find((weapon) => weapon.id === id));
const apex = apexIds.map((id) => catalog.assets.find((asset) => asset.id === id));
if ([...weapons, ...apex].some((item) => !item?.display_name)) {
  throw new Error("Missing MW4 weapon or Apex display name in catalog");
}

if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await db.connect();
  await db.query("BEGIN");
  await db.query("SET LOCAL lock_timeout = '5s'");
  await db.query("SET LOCAL statement_timeout = '30s'");

  const weaponUpdate = await db.query(`UPDATE public.weapons w SET name = v.name
    FROM jsonb_to_recordset($1::jsonb) AS v(id text, name text)
    WHERE w.game_id = 'mw4' AND w.id = v.id
    RETURNING w.id`, [JSON.stringify(weapons.map((weapon) => ({ id: weapon.id, name: weapon.display_name })))]);
  if (weaponUpdate.rowCount !== weapons.length) throw new Error("Expected MW4 weapons were not found");

  const apexUpdate = await db.query(`UPDATE public.attachments a
    SET display_name = v.display_name,
      name = CASE WHEN v.asset_id = 'rex_apex_menu_golf28_1116' THEN v.internal_name ELSE a.name END
    FROM public.attachment_types t,
      jsonb_to_recordset($1::jsonb) AS v(asset_id text, display_name text, internal_name text, weapon_id text)
    WHERE a.game_id = 'mw4' AND a.attachment_type_id = t.id AND t.slug = 'apex'
      AND a.stats->>'assetId' = v.asset_id AND a.stats->'weaponIds' ? v.weapon_id
    RETURNING a.id`, [JSON.stringify(apex.map((asset) => ({
    asset_id: asset.id,
    display_name: asset.display_name,
    internal_name: asset.title,
    weapon_id: catalog.weapons.find((weapon) => weapon.assets.includes(asset.id))?.id,
  })))]);
  if (apexUpdate.rowCount !== apex.length) throw new Error("Expected MW4 Apex choices were not found");

  const snap = catalog.assets.find((asset) => asset.id === "rex_apex_mpapa7_snap");
  if (!snap || snap.slot !== "apex" || !snap.src || snap.display_name !== "SNAP") {
    throw new Error("VEL 46 Snap recipe is missing");
  }
  const snapFilename = snap.src.split("/").at(-1);
  const snapUpdate = await db.query(`UPDATE public.attachments a
    SET name = $3, display_name = $4, subtype_label = NULL,
      stats = a.stats || jsonb_build_object('assetId', $1::text),
      image = f.id
    FROM public.attachment_types t, public.directus_files f
    WHERE a.game_id = 'mw4' AND a.attachment_type_id = t.id AND t.slug = 'apex'
      AND a.stats->>'assetId' IN ('rex_pgrip_aim_mpapa7', 'rex_apex_mpapa7_snap')
      AND a.stats->'weaponIds' ? 'rex_sm_mpapa7'
      AND f.filename_download = $2
    RETURNING a.id`, [snap.id, snapFilename, snap.title, snap.display_name]);
  if (snapUpdate.rowCount !== 1) throw new Error("VEL 46 Snap record or image was not found");

  await db.query("COMMIT");
  console.log("Updated two weapon names, three Apex attachment names, and the VEL 46 Snap asset link");
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await db.end().catch(() => {});
}
