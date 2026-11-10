import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import pg from "pg";
import { builderWeaponIds } from "./weapon-builder-compatibility.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = resolve(root, "public");
const catalogDir = resolve(publicRoot, "weapon-preview/weapon-builder");
const catalog = JSON.parse(readFileSync(resolve(catalogDir, "catalog.json"), "utf8"));
const targetIds = new Set(["rex_ar_cromeo", "rex_sm_fmgolf"]);
const weapons = catalog.weapons.filter((weapon) => targetIds.has(weapon.id));
if (weapons.length !== 2) throw new Error("The two new MW4 weapons are missing from the local catalog");
const assets = catalog.assets.filter((asset) =>
  [...targetIds].some((id) => builderWeaponIds(asset, catalog).includes(id)));
const newFamilyAssets = assets.filter((asset) =>
  asset.families?.some((family) => family === "cromeo" || family === "fmgolf") ||
  asset.id === "rex_apex_cromeo" || asset.id === "rex_apex_fmgolf");

function fileFor(source) {
  const path = resolve(catalogDir, source);
  const local = relative(publicRoot, path);
  if (local.startsWith("..") || local.startsWith(sep)) throw new Error(`Unsafe image source: ${source}`);
  const size = statSync(path).size;
  const hex = createHash("sha256").update(source).digest("hex");
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  return { source, path, size, id, key: `${id}.png`, url: `/${local.split(sep).join("/")}` };
}
const files = new Map([...weapons.map((weapon) => weapon.base_src),
  ...newFamilyAssets.map((asset) => asset.src)].map((source) => [source, fileFor(source)]));
console.log(`MW4 rescan: ${weapons.length} weapons, ${newFamilyAssets.length} family attachments, ${files.size} image files`);
if (process.argv.includes("--dry-run")) process.exit(0);

const required = ["SUPABASE_DB_CONNECTION_STRING", "SUPABASE_PROJECT_ID", "SUPABASE_STORAGE_REGION",
  "SUPABASE_S3_ACCESS_KEY_ID", "SUPABASE_S3_SECRET_ACCESS_KEY"];
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`);
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "cms-assets";
const s3 = new S3Client({ forcePathStyle: true, region: process.env.SUPABASE_STORAGE_REGION,
  endpoint: `https://${process.env.SUPABASE_PROJECT_ID}.storage.supabase.co/storage/v1/s3`,
  credentials: { accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY } });
try {
  await db.connect();
  const existingFiles = await db.query("SELECT id::text FROM public.directus_files WHERE id = ANY($1::uuid[])",
    [[...files.values()].map((file) => file.id)]);
  const present = new Set(existingFiles.rows.map((row) => row.id));
  const uploads = [...files.values()].filter((file) => !present.has(file.id));
  for (const file of uploads) {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: file.key,
      Body: readFileSync(file.path), ContentType: "image/png" }));
  }
  await db.query("BEGIN");
  await db.query("SET LOCAL lock_timeout = '5s'");
  await db.query("SET LOCAL statement_timeout = '60s'");
  await db.query(`INSERT INTO public.directus_files
      (id, storage, filename_disk, filename_download, title, type, filesize)
    SELECT f.id::uuid, $2, f.disk, f.download, f.title, 'image/png', f.size
    FROM jsonb_to_recordset($1::jsonb) AS f(id text, disk text, download text, title text, size bigint)
    ON CONFLICT (id) DO NOTHING`, [JSON.stringify([...files.values()].map((file) => ({
      id: file.id, disk: file.key, download: file.path.split("/").at(-1),
      title: file.path.split("/").at(-1).replace(/\.png$/, ""), size: file.size,
    }))), bucket]);
  const insertedWeapons = await db.query(`INSERT INTO public.weapons
      (id, game_id, name, weapon_category_id, image)
    SELECT w.id, 'mw4', w.name, c.id,
      w.image_id::uuid
    FROM jsonb_to_recordset($1::jsonb) AS w(id text, name text, category text, image_id text)
    JOIN public.weapon_categories c ON c.name = w.category AND c.game_id = 'mw4'
    ON CONFLICT (id) DO UPDATE SET image = EXCLUDED.image,
      weapon_category_id = EXCLUDED.weapon_category_id
    RETURNING id`, [JSON.stringify(weapons.map((weapon) => ({ id: weapon.id,
      name: weapon.display_name || weapon.title, category: weapon.group,
      image_id: files.get(weapon.base_src).id })))]);
  const entries = newFamilyAssets.map((asset) => ({
    asset_id: asset.id,
    name: asset.internal_title || asset.title,
    slot: asset.slot,
    image_id: files.get(asset.src).id,
    display_name: asset.display_name || asset.title,
    subtype_label: asset.subtype_label ?? null,
    image_path: files.get(asset.src).url,
    weapon_ids: builderWeaponIds(asset, catalog),
    families: asset.families ?? [],
    composable: asset.composable === true,
    evidence: asset.evidence ?? null,
  }));
  const insertedAssets = await db.query(`INSERT INTO public.attachments
      (game_id, attachment_type_id, name, display_name, subtype_label, image, stats)
    SELECT 'mw4', t.id, a.name, a.display_name, a.subtype_label, a.image_id::uuid,
      jsonb_build_object('assetId', a.asset_id,
        'weaponIds', a.weapon_ids, 'families', a.families,
        'composable', a.composable, 'evidence', a.evidence,
        'builderSelectable', true)
    FROM jsonb_to_recordset($1::jsonb) AS a(asset_id text, name text, slot text,
      image_id text, display_name text, subtype_label text, image_path text,
      weapon_ids jsonb, families jsonb, composable boolean, evidence text)
    JOIN public.attachment_types t ON t.game_id = 'mw4' AND t.slug = a.slot
    WHERE NOT EXISTS (SELECT 1 FROM public.attachments old WHERE old.game_id = 'mw4'
      AND old.stats->>'assetId' = a.asset_id)
    RETURNING id`, [JSON.stringify(entries)]);
  const shared = assets.filter((asset) => !newFamilyAssets.includes(asset));
  const updatedShared = await db.query(`UPDATE public.attachments a SET stats = a.stats ||
      jsonb_build_object('weaponIds', s.weapon_ids)
    FROM jsonb_to_recordset($1::jsonb) AS s(asset_id text, weapon_ids jsonb)
    WHERE a.game_id = 'mw4' AND a.stats->>'assetId' = s.asset_id
      AND a.stats->'weaponIds' IS DISTINCT FROM s.weapon_ids`,
    [JSON.stringify(shared.map((asset) => ({ asset_id: asset.id,
      weapon_ids: builderWeaponIds(asset, catalog) })))]);
  await db.query("COMMIT");
  console.log(`Synchronized ${insertedWeapons.rowCount} weapons, ${insertedAssets.rowCount} attachments, ${updatedShared.rowCount} shared links, ${uploads.length} uploaded images`);
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  s3.destroy();
  await db.end().catch(() => {});
}
