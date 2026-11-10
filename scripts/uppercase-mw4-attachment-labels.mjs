import pg from "pg";

if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await db.connect();
  await db.query("BEGIN");
  await db.query("SET LOCAL lock_timeout = '5s'");
  await db.query("SET LOCAL statement_timeout = '30s'");
  const updated = await db.query(`UPDATE public.attachments
    SET display_name = upper(coalesce(display_name, name)),
      subtype_label = upper(subtype_label)
    WHERE game_id = 'mw4'
      AND (display_name IS DISTINCT FROM upper(coalesce(display_name, name))
        OR subtype_label IS DISTINCT FROM upper(subtype_label))`);
  const remaining = await db.query(`SELECT count(*)::int AS count FROM public.attachments
    WHERE game_id = 'mw4'
      AND (display_name IS DISTINCT FROM upper(coalesce(display_name, name))
        OR subtype_label IS DISTINCT FROM upper(subtype_label))`);
  if (remaining.rows[0].count !== 0) throw new Error("Some MW4 attachment labels remain mixed case");
  await db.query("COMMIT");
  console.log(`Uppercased ${updated.rowCount} MW4 attachment records`);
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await db.end().catch(() => {});
}
