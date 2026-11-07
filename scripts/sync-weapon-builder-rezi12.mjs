import pg from "pg";

if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");

const names = {
  rex_stockno_bmike3: "No Stock",
  rex_stockr_lgt_bmike3: "TV XR-14 Kilo",
  rex_bolt_quad_bmike3: "XRK Quad-80",
  rex_comb_amo_bmike3: "Bryson Sidewinder",
};
const hidden = [
  "rex_stockr_bmike3",
  "rex_semiguard_bmike3",
  "rex_hotload_he_bmike3",
  "rex_ammo_12g_sl_bmike3_semi",
  "rex_irons_bar_lng_bmike3",
  "rex_irons_bar_sht_bmike3",
  "rex_bolt_bmike3",
  "rex_guard_bmike3",
];
const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_CONNECTION_STRING,
  connectionTimeoutMillis: 10000,
});

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query("SET LOCAL statement_timeout = '30s'");
  const named = await client.query(`
    UPDATE public.attachments AS a
    SET stats = coalesce(a.stats, '{}'::jsonb) || jsonb_build_object('displayName', n.display_name)
    FROM jsonb_to_recordset($1::jsonb) AS n(asset_id text, display_name text)
    WHERE a.game_id = 'mw4' AND a.stats->>'assetId' = n.asset_id
      AND a.stats->>'displayName' IS DISTINCT FROM n.display_name
    RETURNING a.stats->>'assetId' AS asset_id
  `, [JSON.stringify(Object.entries(names).map(([asset_id, display_name]) => ({asset_id, display_name})))]);
  const hiddenRows = await client.query(`
    UPDATE public.attachments AS a
    SET stats = coalesce(a.stats, '{}'::jsonb) ||
      jsonb_build_object('builderSelectable', false, 'weaponIds', '[]'::jsonb)
    WHERE a.game_id = 'mw4' AND a.stats->>'assetId' = ANY($1::text[])
      AND (a.stats->>'builderSelectable' IS DISTINCT FROM 'false'
        OR coalesce(a.stats->'weaponIds', '[]'::jsonb) <> '[]'::jsonb)
    RETURNING a.stats->>'assetId' AS asset_id
  `, [hidden]);
  const verified = await client.query(`
    SELECT stats->>'assetId' AS asset_id, stats->>'displayName' AS display_name,
      stats->>'builderSelectable' AS builder_selectable, stats->'weaponIds' AS weapon_ids
    FROM public.attachments
    WHERE game_id = 'mw4' AND stats->>'assetId' = ANY($1::text[])
  `, [[...Object.keys(names), ...hidden]]);
  const rows = new Map(verified.rows.map((row) => [row.asset_id, row]));
  for (const [id, displayName] of Object.entries(names)) {
    if (!rows.has(id) || rows.get(id).display_name !== displayName) throw new Error(`Name not saved: ${id}`);
  }
  for (const id of hidden) {
    const row = rows.get(id);
    if (row && (row.builder_selectable !== 'false' || JSON.stringify(row.weapon_ids) !== '[]')) {
      throw new Error(`Alias still selectable: ${id}`);
    }
  }
  await client.query("COMMIT");
  console.log(`Rezi 12: updated ${named.rowCount} names, hid ${hiddenRows.rowCount} structural/factory items`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
