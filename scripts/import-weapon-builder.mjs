import { readFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = join(projectRoot, "public");
const catalogDir = join(publicRoot, "weapon-preview", "weapon-builder");
const catalog = JSON.parse(readFileSync(join(catalogDir, "catalog.json"), "utf8"));
const dryRun = process.argv.includes("--dry-run");

function imagePath(source) {
  const absolute = resolve(catalogDir, source);
  const local = relative(publicRoot, absolute);
  if (local.startsWith("..") || local.startsWith(sep) || !existsSync(absolute)) {
    throw new Error(`Missing or unsafe image path: ${source}`);
  }
  return `/${local.split(sep).join("/")}`;
}

const assetIds = new Set(catalog.assets.map((asset) => asset.id));
if (assetIds.size !== catalog.assets.length) throw new Error("Duplicate asset IDs");
const weaponIds = new Set(catalog.weapons.map((weapon) => weapon.id));
if (weaponIds.size !== catalog.weapons.length) throw new Error("Duplicate weapon IDs");

const owners = new Map(catalog.assets.map((asset) => [asset.id, []]));
for (const weapon of catalog.weapons) {
  imagePath(weapon.base_src);
  for (const id of new Set([...weapon.assets, ...weapon.shared_assets])) {
    if (!assetIds.has(id)) throw new Error(`Unknown asset ${id} on ${weapon.id}`);
    owners.get(id).push(weapon.id);
  }
}

const categoryGroups = [...new Set(catalog.weapons.map((weapon) => weapon.group))];
const slots = [...new Set(catalog.assets.map((asset) => asset.slot))];
const categories = categoryGroups.map((name, index) => ({
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_$/, ""),
  short: ({ "Assault rifles": "AR", "Marksman rifles": "DMR", "Melee / equipment": "MEL", Launchers: "LCH", LMGs: "LMG", Pistols: "PST", Shotguns: "SG", SMGs: "SMG", "Sniper rifles": "SNP" })[name] ?? name.slice(0, 3).toUpperCase(),
  order: index + 1,
}));
const types = slots.map((slug, index) => ({
  slug,
  name: slug === "apex" ? "APEX" : slug.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
  order: index + 1,
}));
const weapons = catalog.weapons.map((weapon) => ({
  id: weapon.id,
  name: weapon.title,
  category: weapon.group,
  imagePath: imagePath(weapon.base_src),
}));
const attachments = catalog.assets.filter((asset) =>
  (asset.slot !== "muzzle" || asset.muzzle_table) &&
  (asset.slot !== "underbarrel" || asset.underbarrel_table ||
    catalog.weapons.some((weapon) => weapon.factory_parts?.underbarrel === asset.id))).map((asset) => ({
  assetId: asset.id,
  name: asset.title,
  displayName: asset.display_name || asset.title,
  subtypeLabel: asset.subtype_label ?? null,
  slot: asset.slot,
  imagePath: asset.src ? imagePath(asset.src) : null,
  composable: asset.composable === true,
  weaponIds: ["muzzle", "underbarrel"].includes(asset.slot) && asset.weapon_ids
    ? asset.weapon_ids : owners.get(asset.id),
  families: asset.families ?? [],
  evidence: asset.evidence ?? null,
}));

console.log(`Source: ${weapons.length} weapons, ${categories.length} categories, ${types.length} attachment types, ${attachments.length} assets (${attachments.filter((item) => item.composable).length} selectable)`);
if (dryRun) process.exit(0);

if (!process.env.SUPABASE_DB_CONNECTION_STRING) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_CONNECTION_STRING, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query("SET LOCAL statement_timeout = '60s'");
  const existing = await client.query("SELECT (SELECT count(*) FROM public.weapons WHERE game_id = 'mw4') AS weapons, (SELECT count(*) FROM public.attachments WHERE game_id = 'mw4') AS attachments");
  if (Number(existing.rows[0].weapons) || Number(existing.rows[0].attachments)) {
    throw new Error("MW4 catalog is not empty; refusing a duplicate import");
  }

  await client.query("INSERT INTO public.games (id, name, slug, has_weapon_categories, has_attachments, has_perks, has_classes) VALUES ('mw4', 'Modern Warfare 4', 'mw4', true, true, false, false)");
  await client.query(`INSERT INTO public.weapon_categories (name, slug, short_version, display_order, game_id)
    SELECT c.name, c.slug, c.short, c.ord, 'mw4'
    FROM jsonb_to_recordset($1::jsonb) AS c(name text, slug text, short text, ord int)`,
    [JSON.stringify(categories.map(({ name, slug, short, order }) => ({ name, slug, short, ord: order })))]);
  await client.query(`INSERT INTO public.attachment_types (game_id, name, slug, display_order)
    SELECT 'mw4', t.name, t.slug, t.ord
    FROM jsonb_to_recordset($1::jsonb) AS t(name text, slug text, ord int)`,
    [JSON.stringify(types.map(({ name, slug, order }) => ({ name, slug, ord: order })))]);
  await client.query(`INSERT INTO public.weapons (id, game_id, name, weapon_category_id)
    SELECT w.id, 'mw4', w.name, c.id
    FROM jsonb_to_recordset($1::jsonb) AS w(id text, name text, category text)
    JOIN public.weapon_categories c ON c.name = w.category AND c.game_id = 'mw4'`,
    [JSON.stringify(weapons)]);
  await client.query(`INSERT INTO public.attachments (game_id, attachment_type_id, name, display_name, subtype_label, stats)
    SELECT 'mw4', t.id, a.name, a.display_name, a.subtype_label,
      jsonb_build_object('assetId', a.asset_id,
        'weaponIds', a.weapon_ids, 'composable', a.composable,
        'families', a.families, 'evidence', a.evidence)
    FROM jsonb_to_recordset($1::jsonb) AS a(asset_id text, name text, display_name text,
      subtype_label text, slot text, image_path text, weapon_ids jsonb,
      composable boolean, families jsonb, evidence text)
    JOIN public.attachment_types t ON t.game_id = 'mw4' AND t.slug = a.slot`,
    [JSON.stringify(attachments.map((asset) => ({
      asset_id: asset.assetId, name: asset.name, display_name: asset.displayName,
      subtype_label: asset.subtypeLabel, slot: asset.slot,
      image_path: asset.imagePath, weapon_ids: asset.weaponIds,
      composable: asset.composable, families: asset.families, evidence: asset.evidence,
    })))]);
  await client.query("COMMIT");
  console.log("MW4 catalog imported");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
