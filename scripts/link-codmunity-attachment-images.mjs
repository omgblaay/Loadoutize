import { readFileSync } from "node:fs";
import { basename } from "node:path";
import pg from "pg";

const catalog = JSON.parse(readFileSync("public/weapon-preview/weapon-builder/catalog.json", "utf8"));
const assets = new Map(catalog.assets.map((asset) => [asset.id, asset]));
// The first six match builder labels. The last five are icon matches checked
// against the public reference thumbnails; they are not compositor mappings.
const matches = [
  ["FSS Crackdown [CODMunity VEL 46]", "rex_sil_hvy_f", true],
  ["FSS IS40 [CODMunity Hyeon Burst]", "rex_sil_lgt_i", true],
  ["5.56 NATO Overpressured [CODMunity Cronen Osprey]", "rex_ammo_556n_op", true],
  ["Schlager 7x [CODMunity KG-7 Vulcan]", "rex_arscope01", true],
  ["XRK Herder 40 [CODMunity ISO Nightshade]", "rex_sil_tac_f", true],
  ["40 Round Mag [CODMunity ISO Nightshade]", "rex_xmag_spier9", true],
  ["Sakin Rubber Grip [CODMunity VEL 46]", "rex_pgrip_mpapa7", false],
  ["Cronen 56 [CODMunity Cronen Osprey]", "rex_pgrip_aim_cromeo", false],
  ["XRK Mil-Tac Suppressor [CODMunity Cronen Osprey]", "rex_sil_tac_a", false],
  ["60 Round Mag [CODMunity Cronen Osprey]", "rex_xmag_cromeo", false],
  ["Ivanov QR600 [CODMunity KG-7 Vulcan]", "rex_sil_svictor98", false],
];
const envLine = readFileSync(".env", "utf8").split(/\r?\n/)
  .find((line) => line.startsWith("SUPABASE_DB_CONNECTION_STRING="));
if (!envLine) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
const db = new pg.Client({ connectionString: envLine.slice(envLine.indexOf("=") + 1).replace(/^['"]|['"]$/g, ""),
  connectionTimeoutMillis: 10000, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  await db.query("BEGIN");
  await db.query("SET LOCAL lock_timeout = '5s'");
  for (const [name, assetId, compositorMatch] of matches) {
    const asset = assets.get(assetId);
    if (!asset?.src) throw new Error(`Missing builder asset ${assetId}`);
    const result = await db.query(`
      SELECT target.id, target.image AS current_image, file.id AS source_image
      FROM public.attachments target
      JOIN public.attachment_types type ON type.id = target.attachment_type_id
      JOIN public.directus_files file ON file.filename_download = $2
      WHERE target.game_id = 'mw4' AND target.name = $1
        AND type.slug = $3
    `, [name, basename(asset.src), asset.slot]);
    if (result.rowCount !== 1 || !result.rows[0].source_image) {
      throw new Error(`Missing unique image match for ${name}`);
    }
    if (result.rows[0].current_image && result.rows[0].current_image !== result.rows[0].source_image) {
      throw new Error(`Existing image differs for ${name}`);
    }
    if (process.argv.includes("--apply")) {
      await db.query(`UPDATE public.attachments
        SET image = $2::uuid,
          stats = CASE WHEN $3::boolean THEN stats || jsonb_build_object('assetId', $4::text)
            ELSE stats END
        WHERE id = $1 AND image IS NOT DISTINCT FROM $5::uuid`,
      [result.rows[0].id, result.rows[0].source_image, compositorMatch,
        assetId, result.rows[0].current_image]);
    }
    console.log(`${name}: ${assetId}`);
  }
  if (process.argv.includes("--apply")) await db.query("COMMIT");
  else await db.query("ROLLBACK");
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await db.end();
}
