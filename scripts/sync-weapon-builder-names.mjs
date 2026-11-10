import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { builderWeaponIds } from "./weapon-builder-compatibility.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(projectRoot, "public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  await client.query("BEGIN");
  const weapons = await client.query(`UPDATE public.weapons w SET name = n.display_name
    FROM jsonb_to_recordset($1::jsonb) AS n(id text, display_name text)
    WHERE w.game_id = 'mw4' AND w.id = n.id`, [JSON.stringify(catalog.weapons.map((weapon) => ({
    id: weapon.id,
    display_name: weapon.display_name || `${weapon.title} · ${weapon.id}`,
  })))]);
  const attachments = await client.query(`UPDATE public.attachments a
    SET name = n.internal_name, display_name = n.display_name,
        subtype_label = n.subtype_label,
        stats = (coalesce(a.stats, '{}'::jsonb) - 'displayName' - 'subtypeLabel' - 'weaponDisplayNames') || jsonb_build_object(
          'composable', n.composable,
          'builderSelectable', n.builder_selectable,
          'weaponIds', n.weapon_ids)
    FROM jsonb_to_recordset($1::jsonb) AS n(asset_id text, internal_name text,
    display_name text, subtype_label text, composable boolean, builder_selectable boolean, weapon_ids jsonb)
    WHERE a.game_id = 'mw4' AND a.stats->>'assetId' = n.asset_id`,
    [JSON.stringify(catalog.assets.map((asset) => {
      const weaponIds = builderWeaponIds(asset, catalog);
      return {
      asset_id: asset.id,
      internal_name: asset.internal_title,
      display_name: asset.slot === "laser" && asset.families.length === 0 && asset.subtype_label
        ? asset.subtype_label
        : asset.display_name || asset.title,
      subtype_label: asset.subtype_label ?? null,
      composable: asset.composable === true,
      builder_selectable: weaponIds.length > 0,
      weapon_ids: weaponIds,
    }; }))]);
  if (weapons.rowCount !== catalog.weapons.length || attachments.rowCount !== catalog.assets.length) {
    throw new Error(`Unexpected update counts: ${weapons.rowCount} weapons, ${attachments.rowCount} attachments`);
  }
  await client.query("COMMIT");
  console.log(`Updated ${weapons.rowCount} weapon names and ${attachments.rowCount} asset labels; non-selectable source assets retained`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
