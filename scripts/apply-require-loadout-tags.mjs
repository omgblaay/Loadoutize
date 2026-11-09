import { readFileSync } from "node:fs";
import pg from "pg";

const line = readFileSync(".env", "utf8").split(/\r?\n/)
  .find((entry) => entry.startsWith("SUPABASE_DB_CONNECTION_STRING="));
if (!line) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
const connectionString = line.slice(line.indexOf("=") + 1).replace(/^"|"$/g, "");
const migration = readFileSync(
  "supabase/migrations/20261108164400_require_loadout_tags.sql", "utf8",
);
const apply = process.argv.includes("--apply");
const db = new pg.Client({ connectionString, connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false } });

await db.connect();
try {
  await db.query("BEGIN");
  await db.query("SET LOCAL lock_timeout = '5s'");
  await db.query("SET LOCAL statement_timeout = '60s'");
  await db.query(migration);
  const rows = (await db.query(`
    SELECT loadout.id, loadout.name, tag.name AS tag
    FROM public.loadouts AS loadout
    JOIN public.tags AS tag ON tag.id = loadout.tag_id
    ORDER BY loadout.id
  `)).rows;
  if (apply) await db.query("COMMIT");
  else await db.query("ROLLBACK");
  console.log(JSON.stringify({ applied: apply, loadouts: rows }, null, 2));
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await db.end();
}
