import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import pg from "pg";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = resolve(projectRoot, "public/weapon-preview/weapon-builder");
const catalog = JSON.parse(readFileSync(resolve(catalogDir, "catalog.json"), "utf8"));
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "cms-assets";
const required = ["SUPABASE_DB_CONNECTION_STRING", "SUPABASE_PROJECT_ID", "SUPABASE_STORAGE_REGION", "SUPABASE_S3_ACCESS_KEY_ID", "SUPABASE_S3_SECRET_ACCESS_KEY"];
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`);

function imageId(source) {
  const hex = createHash("sha256").update(source).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const sources = [...new Set([
  ...catalog.weapons.map((weapon) => weapon.base_src),
  ...catalog.assets.map((asset) => asset.src),
])];
const files = sources.map((source) => {
  const path = resolve(catalogDir, source);
  if (!path.startsWith(resolve(projectRoot, "public") + "/")) throw new Error(`Unsafe source ${source}`);
  const id = imageId(source);
  return { source, path, id, key: `${id}.png`, size: statSync(path).size };
});
const bySource = new Map(files.map((file) => [file.source, file]));
const s3 = new S3Client({
  forcePathStyle: true,
  region: process.env.SUPABASE_STORAGE_REGION,
  endpoint: `https://${process.env.SUPABASE_PROJECT_ID}.storage.supabase.co/storage/v1/s3`,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY,
  },
});
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });

try {
  await db.connect();
  const counts = await db.query("SELECT (SELECT count(*) FROM public.weapons WHERE game_id = 'mw4')::int AS weapons, (SELECT count(*) FROM public.attachments WHERE game_id = 'mw4')::int AS attachments");
  if (counts.rows[0].weapons !== catalog.weapons.length || counts.rows[0].attachments !== catalog.assets.length) {
    throw new Error("Catalog row counts do not match the source; import data first");
  }
  let next = 0;
  let uploaded = 0;
  async function worker() {
    while (next < files.length) {
      const file = files[next++];
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: file.key,
        Body: readFileSync(file.path),
        ContentType: "image/png",
      }));
      uploaded++;
      if (uploaded % 100 === 0) console.log(`Uploaded ${uploaded}/${files.length} images`);
    }
  }
  await Promise.all(Array.from({ length: 8 }, () => worker()));

  await db.query("BEGIN");
  await db.query("SET LOCAL statement_timeout = '60s'");
  await db.query(`INSERT INTO public.directus_files (id, storage, filename_disk, filename_download, title, type, filesize)
    SELECT f.id::uuid, $2, f.disk, f.download, f.title, 'image/png', f.size
    FROM jsonb_to_recordset($1::jsonb) AS f(id text, disk text, download text, title text, size bigint)
    ON CONFLICT (id) DO NOTHING`, [JSON.stringify(files.map((file) => ({
      id: file.id, disk: file.key, download: basename(file.path),
      title: basename(file.path, ".png"), size: file.size,
    }))), bucket]);
  await db.query(`UPDATE public.weapons w SET image = f.image_id::uuid
    FROM jsonb_to_recordset($1::jsonb) AS f(id text, image_id text)
    WHERE w.game_id = 'mw4' AND w.id = f.id`, [JSON.stringify(catalog.weapons.map((weapon) => ({
      id: weapon.id, image_id: bySource.get(weapon.base_src).id,
    })))]);
  await db.query(`UPDATE public.attachments a SET image = f.image_id::uuid
    FROM jsonb_to_recordset($1::jsonb) AS f(asset_id text, image_id text)
    WHERE a.game_id = 'mw4' AND a.stats->>'assetId' = f.asset_id`, [JSON.stringify(catalog.assets.map((asset) => ({
      asset_id: asset.id, image_id: bySource.get(asset.src).id,
    })))]);
  await db.query("COMMIT");
  console.log(`Imported ${files.length} unique images and linked all catalog rows`);
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  s3.destroy();
  await db.end().catch(() => {});
}
