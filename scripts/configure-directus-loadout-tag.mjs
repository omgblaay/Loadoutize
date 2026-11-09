import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(readFileSync(".env", "utf8")
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith("#") && line.includes("="))
  .map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1).replace(/^"|"$/g, "")];
  }));
const baseUrl = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const apply = process.argv.includes("--apply");

async function request(path, token, method = "GET", body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${JSON.stringify(payload.errors ?? payload)}`);
  return payload.data;
}

const login = await fetch(`${baseUrl}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: env.DIRECTUS_ADMIN_EMAIL, password: env.DIRECTUS_ADMIN_PASSWORD }),
});
if (!login.ok) throw new Error(`Directus login failed: ${login.status}`);
const token = (await login.json()).data.access_token;

const fieldPath = "/fields/loadouts/tag_id";
const relationPath = "/relations/loadouts/tag_id";
const fieldBefore = await request(fieldPath, token);
const relationBefore = await request(relationPath, token);
if (fieldBefore.schema?.foreign_key_table !== "tags" || relationBefore.related_collection !== "tags") {
  throw new Error("loadouts.tag_id must already reference tags.id");
}

if (apply) {
  const connectionString = env.SUPABASE_DB_CONNECTION_STRING;
  if (!connectionString) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
  const db = new pg.Client({ connectionString, connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    await db.query("BEGIN");
    await db.query("SET LOCAL lock_timeout = '5s'");
    await db.query(`
      INSERT INTO public.directus_relations (many_collection, many_field, one_collection)
      SELECT 'loadouts', 'tag_id', 'tags'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.directus_relations
        WHERE many_collection = 'loadouts' AND many_field = 'tag_id'
      )
    `);
    await db.query(`
      UPDATE public.directus_relations SET one_collection = 'tags'
      WHERE many_collection = 'loadouts' AND many_field = 'tag_id'
    `);
    await db.query(`
      INSERT INTO public.directus_fields
        (collection, field, special, interface, options, display, display_options, required)
      SELECT 'loadouts', 'tag_id', 'm2o', 'select-dropdown-m2o', $1::json,
        'related-values', $2::json, true
      WHERE NOT EXISTS (
        SELECT 1 FROM public.directus_fields
        WHERE collection = 'loadouts' AND field = 'tag_id'
      )
    `, [JSON.stringify({ template: "{{name}}", filter: { game_id: { _eq: "$CURRENT.game_id" } } }),
      JSON.stringify({ template: "{{name}}" })]);
    await db.query(`
      UPDATE public.directus_fields
      SET special = 'm2o', interface = 'select-dropdown-m2o', options = $1::json,
        display = 'related-values', display_options = $2::json, required = true
      WHERE collection = 'loadouts' AND field = 'tag_id'
    `, [JSON.stringify({ template: "{{name}}", filter: { game_id: { _eq: "$CURRENT.game_id" } } }),
      JSON.stringify({ template: "{{name}}" })]);
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await db.end();
  }
}

const fieldAfter = await request(fieldPath, token);
const relationAfter = await request(relationPath, token);
console.log(JSON.stringify({
  applied: apply,
  field: {
    interface: fieldAfter.meta?.interface ?? null,
    required: fieldAfter.meta?.required ?? false,
    options: fieldAfter.meta?.options ?? null,
  },
  relation: {
    related_collection: relationAfter.related_collection,
    meta: relationAfter.meta,
  },
}, null, 2));
