import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(readFileSync(".env", "utf8")
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith("#") && line.includes("="))
  .map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, "")];
  }));
const apply = process.argv.includes("--apply");
const db = new pg.Client({ connectionString: env.SUPABASE_DB_CONNECTION_STRING,
  connectionTimeoutMillis: 10000, ssl: { rejectUnauthorized: false } });
await db.connect();

const targets = await db.query(`
  SELECT p.conrelid::regclass::text AS collection, a.attname AS field,
    p.confrelid::regclass::text AS target, f.interface AS current_interface,
    r.one_collection AS current_relation
  FROM pg_constraint p
  JOIN pg_attribute a ON a.attrelid = p.conrelid AND a.attnum = ANY(p.conkey)
  JOIN public.directus_collections c ON c.collection = p.conrelid::regclass::text
  LEFT JOIN public.directus_fields f
    ON f.collection = c.collection AND f.field = a.attname
  LEFT JOIN public.directus_relations r
    ON r.many_collection = c.collection AND r.many_field = a.attname
  WHERE p.contype = 'f' AND p.connamespace = 'public'::regnamespace
    AND c.collection NOT LIKE 'directus\_%' ESCAPE '\'
  ORDER BY collection, field
`);

if (apply) {
  try {
    await db.query("BEGIN");
    await db.query("SET LOCAL lock_timeout = '5s'");
    for (const { collection, field, target } of targets.rows) {
      const isFile = target === "directus_files";
      const template = target === "directus_files" ? "{{title}}" :
        target === "loadout_weapons" ? "{{weapon_id.name}}" : "{{name}}";
      const options = isFile ? null : JSON.stringify({ template });
      const displayOptions = isFile ? null : JSON.stringify({ template });
      await db.query(`
        INSERT INTO public.directus_relations (many_collection, many_field, one_collection)
        SELECT $1::text, $2::text, $3::text WHERE NOT EXISTS (
          SELECT 1 FROM public.directus_relations
          WHERE many_collection = $1::text AND many_field = $2::text
        )
      `, [collection, field, target]);
      await db.query(`
        UPDATE public.directus_relations SET one_collection = $3::text
        WHERE many_collection = $1::text AND many_field = $2::text AND one_collection IS DISTINCT FROM $3::text
      `, [collection, field, target]);
      await db.query(`
        INSERT INTO public.directus_fields
          (collection, field, special, interface, options, display, display_options)
        SELECT $1::text, $2::text, $3::text, $4::text, $5::json, $6::text, $7::json
        WHERE NOT EXISTS (SELECT 1 FROM public.directus_fields WHERE collection = $1::text AND field = $2::text)
      `, [collection, field, isFile ? "file" : "m2o",
        isFile ? "file-image" : "select-dropdown-m2o", options,
        isFile ? "image" : "related-values", displayOptions]);
      // Keep existing field settings such as required, sort, width, and filters.
      // Existing relation templates may carry game-specific filters.
      await db.query(`
        UPDATE public.directus_fields SET
          special = $3, interface = $4,
          options = COALESCE(options, $5::json),
          display = $6,
          display_options = COALESCE(display_options, $7::json)
        WHERE collection = $1 AND field = $2
      `, [collection, field, isFile ? "file" : "m2o",
        isFile ? "file-image" : "select-dropdown-m2o", options,
        isFile ? "image" : "related-values", displayOptions]);
    }
    for (const [collection, field] of [["weapons", "weapon_category"], ["weapon_categories", "game"]]) {
      await db.query(`
        INSERT INTO public.directus_fields (collection, field, hidden)
        SELECT $1::text, $2::text, true WHERE NOT EXISTS (
          SELECT 1 FROM public.directus_fields WHERE collection = $1::text AND field = $2::text
        )
      `, [collection, field]);
      await db.query(`UPDATE public.directus_fields SET hidden = true
        WHERE collection = $1 AND field = $2`, [collection, field]);
    }
    await db.query(`
      UPDATE public.directus_relations
      SET one_field = 'allowed_weapon_categories', junction_field = 'weapon_category_id'
      WHERE many_collection = 'tag_weapon_categories' AND many_field = 'tag_id'
    `);
    await db.query(`
      UPDATE public.directus_relations SET junction_field = 'tag_id'
      WHERE many_collection = 'tag_weapon_categories' AND many_field = 'weapon_category_id'
    `);
    await db.query(`
      INSERT INTO public.directus_fields (collection, field, special, interface, options)
      SELECT 'tags', 'allowed_weapon_categories', 'm2m', 'list-m2m',
        '{"template":"{{weapon_category_id.name}}"}'::json
      WHERE NOT EXISTS (SELECT 1 FROM public.directus_fields
        WHERE collection = 'tags' AND field = 'allowed_weapon_categories')
    `);
    await db.query(`
      UPDATE public.directus_fields SET special = 'm2m', interface = 'list-m2m',
        options = '{"template":"{{weapon_category_id.name}}"}'::json
      WHERE collection = 'tags' AND field = 'allowed_weapon_categories'
    `);
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

console.log(JSON.stringify({ applied: apply, fields: targets.rows.map(({ collection, field, target, current_interface, current_relation }) => ({
  collection, field, target, current_interface, current_relation,
  interface: target === "directus_files" ? "file-image" : "select-dropdown-m2o",
})) }, null, 2));
await db.end();
