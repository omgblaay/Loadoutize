import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

// Imports every MW4 multiplayer build published on each weapon page.
// Dry-run by default; pass --apply to commit.
//
// This script NEVER creates weapons or attachments. A build may resolve fewer
// attachments than the site lists when the catalog has no matching row; those
// are reported and the loadout is created with the attachments that exist.

const ROOT = "/Users/krystianblaszczyk/Ldtize";
const BASE = "https://codmunity.gg";
const OWNER_ID = "6cf6e4fb-45df-4e40-b7ed-a25b8953fe82";
const APPLY = process.argv.includes("--apply");

const catalog = JSON.parse(readFileSync(resolve(ROOT, "public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
const assetById = new Map(catalog.assets.map((asset) => [asset.id, asset]));

const strip = (html) => html
  .replace(/<[^>]*>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#0?39;/g, "'")
  .replace(/&nbsp;/g, " ")
  .replace(/<!--.*?-->/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const norm = (value) => String(value ?? "")
  .toUpperCase()
  .replace(/[“”"”’'`.,]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const TYPE_ALIAS = new Map([
  ["TRIGGER ACTION", "TRIGGER"],
  ["TRIGGER", "TRIGGER"],
]);
const canonicalType = (type) => {
  const upper = String(type ?? "").toUpperCase().trim();
  return TYPE_ALIAS.get(upper) ?? upper;
};

const lev = (a, b) => {
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
};

const labelFields = (attachment) => [
  attachment.effName,
  attachment.display_name,
  attachment.name,
  attachment.stats?.displayName,
].filter(Boolean);

async function getHtml(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36" },
  });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.text();
}

function parseWeaponNames(html) {
  const names = new Map();
  for (const chunk of html.split(/<section data-tier="/).slice(1)) {
    for (const article of chunk.matchAll(/<article class="wl3">([\s\S]*?)<\/article>/g)) {
      const slug = article[1].match(/href="\/weapon\/mw4\/([^#"?]+)/)?.[1];
      const name = strip(article[1].match(/<h3 class="wl3-title">([\s\S]*?)<\/h3>/)?.[1] ?? "");
      if (slug && name) names.set(slug, name);
    }
    for (const list of chunk.matchAll(/<ol class="mr-ranking-links"[^>]*>([\s\S]*?)<\/ol>/g)) {
      for (const item of list[1].matchAll(/<li>\s*<a href="\/weapon\/mw4\/([^#"?]+)[^"]*">([\s\S]*?)<\/a>/g)) {
        const name = strip(item[2]);
        if (name && !names.has(item[1])) names.set(item[1], name);
      }
    }
  }
  return names;
}

function parseMpBuilds(html) {
  const builds = [];
  for (const article of html.matchAll(/<article class="wx-card wx-mp">([\s\S]*?)<\/article>/g)) {
    const block = article[1];
    const title = strip(block.match(/<h3 class="wx-title">([\s\S]*?)<\/h3>/)?.[1] ?? "");
    if (!title.includes("(MW4 Multiplayer)")) continue;
    const playstyle = strip(block.match(/<span class="wd-title-playstyle">([\s\S]*?)<\/span>/)?.[1] ?? "");
    const rank = strip(block.match(/<span class="wx-badge-rank">([\s\S]*?)<\/span>/)?.[1] ?? "").replace("#", "").trim();
    const code = block.match(/Build code[\s\S]*?<code[^>]*>([^<]+)<\/code>/)?.[1]?.trim() ?? null;
    const attachments = [];
    const section = block.match(/<section class="wx-attachments">([\s\S]*?)<\/section>/)?.[1] ?? "";
    for (const li of section.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)) {
      const openTag = li[0].slice(0, li[0].indexOf(">") + 1);
      const nameBlock = li[1].match(/<span class="wx-att-name">([\s\S]*?)<\/span>/)?.[1] ?? "";
      const typeRaw = strip(nameBlock.match(/<small>([\s\S]*?)<\/small>/)?.[1] ?? "");
      const name = strip(nameBlock.match(/<strong>([\s\S]*?)<\/strong>/)?.[1] ?? "");
      const type = /class="[^"]*\bwx-apex\b/.test(openTag)
        ? "APEX"
        : typeRaw.split("·")[0].trim().replace(/^\d+\s*/, "").trim();
      if (type && name) attachments.push({ type, name });
    }
    builds.push({ title, playstyle, rank, code, attachments });
  }
  return builds;
}

const env = readFileSync(resolve(ROOT, ".env"), "utf8");
const envLine = env.split(/\r?\n/).find((line) => line.startsWith("SUPABASE_DB_CONNECTION_STRING="));
const connectionString = envLine.slice(envLine.indexOf("=") + 1).replace(/^"|"$/g, "");
const db = new pg.Client({ connectionString, connectionTimeoutMillis: 15000, ssl: { rejectUnauthorized: false } });

function attachmentPenalty(attachment) {
  const id = attachment.stats?.assetId ?? "";
  // Prefer the base asset over generated variants such as *_off / *_sp / *_545.
  const suffixPenalty = /_(off|sp|ir|thermal|dim|545|556|762|300)$/.test(id) ? 1000 : 0;
  return suffixPenalty + id.length;
}

function matchAttachment(all, type, label, weaponId) {
  const target = norm(label);
  const family = weaponId.split("_").pop();
  const pool = all.filter((attachment) => {
    if (canonicalType(attachment.type_name) !== canonicalType(type)) return false;
    const ids = attachment.stats?.weaponIds ?? [];
    const asset = assetById.get(attachment.stats?.assetId);
    const families = asset?.families ?? attachment.stats?.families ?? [];
    return ids.includes(weaponId) || families.length === 0 || families.includes(family);
  });
  const ranked = pool.slice().sort((a, b) => {
    const linkDiff = Number((b.stats?.weaponIds ?? []).includes(weaponId)) - Number((a.stats?.weaponIds ?? []).includes(weaponId));
    return linkDiff || attachmentPenalty(a) - attachmentPenalty(b);
  });
  const exact = ranked.filter((attachment) => labelFields(attachment).some((value) => norm(value) === target));
  if (exact.length) return exact[0];

  if (canonicalType(type) === "APEX") {
    const suffix = ranked
      .filter((attachment) => labelFields(attachment).some((value) => target.endsWith(norm(value)) || norm(value).endsWith(target)))
      .sort((a, b) => norm(b.display_name ?? "").length - norm(a.display_name ?? "").length);
    if (suffix.length) return suffix[0];
  }

  const close = ranked
    .map((attachment) => ({ attachment, distance: Math.min(...labelFields(attachment).map((value) => lev(norm(value), target))) }))
    .filter((entry) => entry.distance <= (target.length >= 14 ? 2 : 1))
    .sort((a, b) => a.distance - b.distance);
  return close[0]?.attachment ?? null;
}

function tagFor(playstyle, category, tagIds) {
  const style = playstyle.toLowerCase();
  let name = "Balanced";
  if (category === "Sniper rifles") name = "Quick Scope";
  else if (style.includes("close") || style.includes("mobility")) name = "Run 'n' Gun";
  else if (style.includes("sniper") || style.includes("long")) name = "Long-range";
  return tagIds.get(name) ?? tagIds.get("Balanced");
}

function newId(taken) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const id = randomBytes(4).toString("hex").slice(0, 5);
    if (!taken.has(id)) {
      taken.add(id);
      return id;
    }
  }
  throw new Error("Could not allocate a loadout id");
}

const home = await getHtml(`${BASE}/mw4`);
const weaponNames = parseWeaponNames(home);

await db.connect();
try {
  const weapons = new Map((await db.query("select id, name from public.weapons where game_id='mw4'")).rows.map((row) => [norm(row.name), row]));
  const categories = new Map((await db.query(
    "select w.id, wc.name from public.weapons w left join public.weapon_categories wc on wc.id=w.weapon_category_id where w.game_id='mw4'",
  )).rows.map((row) => [row.id, row.name]));
  const tagIds = new Map((await db.query("select id, name from public.tags where game_id='mw4'")).rows.map((row) => [row.name, row.id]));
  const attachments = (await db.query(
    "select id, type_name, name, display_name, stats from public.attachments_with_images where game_id='mw4' and coalesce((stats->>'builderSelectable')::boolean, true)",
  )).rows;
  for (const attachment of attachments) {
    attachment.effName = assetById.get(attachment.stats?.assetId)?.display_name ?? null;
  }
  const owner = (await db.query("select id::text, name from public.profiles where id=$1::uuid", [OWNER_ID])).rows[0];
  if (!owner) throw new Error("Author profile is missing");

  const existingIds = new Set((await db.query("select id from public.loadouts where game_id='mw4'")).rows.map((row) => row.id));
  const takenIds = new Set(existingIds);

  const plan = [];
  const skipped = [];
  const seenCodes = new Set();

  for (const [slug, weaponName] of weaponNames) {
    const weapon = weapons.get(norm(weaponName));
    if (!weapon) {
      skipped.push({ slug, weaponName, reason: "weapon-not-in-catalog" });
      continue;
    }
    const builds = parseMpBuilds(await getHtml(`${BASE}/weapon/mw4/${slug}`));
    const category = categories.get(weapon.id) ?? null;

    for (const build of builds) {
      if (!build.code) {
        skipped.push({ slug, weaponName, playstyle: build.playstyle, reason: "no-build-code" });
        continue;
      }
      if (seenCodes.has(build.code)) {
        skipped.push({ slug, weaponName, playstyle: build.playstyle, reason: "duplicate-build-code" });
        continue;
      }
      seenCodes.add(build.code);

      const resolved = [];
      const unresolved = [];
      for (const part of build.attachments) {
        const match = matchAttachment(attachments, part.type, part.name, weapon.id);
        if (match) resolved.push({ type: part.type, name: part.name, id: match.id, assetId: match.stats?.assetId ?? null });
        else unresolved.push(part);
      }
      // One attachment per canonical slot; APEX is separate from the limit.
      const bySlot = new Map();
      for (const part of resolved) {
        const slot = canonicalType(part.type);
        if (!bySlot.has(slot)) bySlot.set(slot, part);
      }
      const uniqueResolved = [...bySlot.values()];
      const standard = uniqueResolved.filter((part) => canonicalType(part.type) !== "APEX");
      const apex = uniqueResolved.filter((part) => canonicalType(part.type) === "APEX");
      if (standard.length < 1 || standard.length > 5 || apex.length > 1) {
        skipped.push({ slug, weaponName, playstyle: build.playstyle, reason: "invalid-attachment-count", standard: standard.length, apex: apex.length });
        continue;
      }

      const baseName = `${weaponName} · ${build.playstyle}`;
      plan.push({
        kind: "apex",
        weaponName,
        weaponId: weapon.id,
        category,
        playstyle: build.playstyle,
        rank: build.rank,
        code: build.code,
        name: baseName,
        description: `Modern Warfare 4 multiplayer ${build.playstyle.toLowerCase()} build for the ${weaponName}.`,
        tagId: tagFor(build.playstyle, category, tagIds),
        gameLoadoutCode: build.code,
        attachments: standard.concat(apex).map((part) => ({ type: canonicalType(part.type), name: part.name, id: part.id, assetId: part.assetId })),
        missing: unresolved,
        siteTotal: build.attachments.length,
      });

      if (apex.length === 1) {
        plan.push({
          kind: "no-apex",
          weaponName,
          weaponId: weapon.id,
          category,
          playstyle: build.playstyle,
          rank: build.rank,
          code: build.code,
          name: `${baseName} (No Apex)`,
          description: `Modern Warfare 4 multiplayer ${build.playstyle.toLowerCase()} build for the ${weaponName}, using standard attachments only.`,
          tagId: tagFor(build.playstyle, category, tagIds),
          gameLoadoutCode: null,
          attachments: standard.map((part) => ({ type: canonicalType(part.type), name: part.name, id: part.id, assetId: part.assetId })),
          missing: unresolved,
          siteTotal: build.attachments.length,
        });
      }
    }
  }

  // Guarantee unique display names before writing.
  const usedNames = new Set();
  for (const entry of plan) {
    let name = entry.name;
    let suffix = 2;
    while (usedNames.has(name)) name = `${entry.name} (${suffix++})`;
    usedNames.add(name);
    entry.name = name;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    weapons: weaponNames.size,
    plannedLoadouts: plan.length,
    base: plan.filter((entry) => entry.kind === "apex").length,
    withoutApex: plan.filter((entry) => entry.kind === "no-apex").length,
    partial: plan.filter((entry) => entry.missing.length).length,
    complete: plan.filter((entry) => !entry.missing.length).length,
    skipped,
    entries: plan,
  };
  writeFileSync("/tmp/mw4-loadout-plan.json", JSON.stringify(report, null, 2));

  console.log(`weapons: ${report.weapons}`);
  console.log(`planned loadouts: ${report.plannedLoadouts} (${report.base} with site attachments, ${report.withoutApex} without-apex variants)`);
  console.log(`complete: ${report.complete}, partial: ${report.partial}`);
  console.log(`skipped: ${skipped.length}`);
  for (const entry of skipped) console.log(`  - ${entry.weaponName ?? entry.slug}: ${entry.reason}`);

  const missingLabels = new Map();
  for (const entry of plan) for (const part of entry.missing) {
    const key = `${canonicalType(part.type)}: ${part.name}`;
    missingLabels.set(key, (missingLabels.get(key) ?? 0) + 1);
  }
  console.log(`\nunresolved attachment labels (${missingLabels.size} unique):`);
  for (const [key, count] of [...missingLabels.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${count}x ${key}`);

  if (!APPLY) {
    console.log("\nDRY RUN — no database writes. Re-run with --apply to commit.");
  } else {
    await db.query("BEGIN");
    await db.query("SET LOCAL lock_timeout = '5s'");
    await db.query("SET LOCAL statement_timeout = '120s'");
    try {
      let created = 0;
      let updated = 0;
      for (const entry of plan) {
        const existing = entry.gameLoadoutCode
          ? (await db.query("select id, user_id from public.loadouts where game_id='mw4' and game_loadout_code=$1", [entry.gameLoadoutCode])).rows[0]
          : (await db.query("select id, user_id from public.loadouts where game_id='mw4' and user_id=$1 and name=$2 and game_loadout_code is null", [owner.id, entry.name])).rows[0];
        if (existing && existing.user_id !== owner.id) throw new Error(`Loadout ${entry.name} belongs to another author`);

        const id = existing?.id ?? newId(takenIds);
        if (existing) {
          await db.query(
            "update public.loadouts set name=$1, description=$2, tag_id=$3, game_loadout_code=$4, content_type='weapon_config', is_public=true, updated_at=now() where id=$5",
            [entry.name, entry.description, entry.tagId, entry.gameLoadoutCode, id],
          );
          await db.query("delete from public.loadout_weapons where loadout_id=$1", [id]);
          updated++;
        } else {
          await db.query(
            "insert into public.loadouts (id,game_id,user_id,user_name,name,description,tag_id,game_loadout_code,content_type,is_public) values ($1,'mw4',$2,$3,$4,$5,$6,$7,'weapon_config',true)",
            [id, owner.id, owner.name, entry.name, entry.description, entry.tagId, entry.gameLoadoutCode],
          );
          created++;
        }

        const slot = (await db.query(
          "insert into public.loadout_weapons (loadout_id,weapon_id,slot_order,slot) values ($1,$2,0,'primary') returning id",
          [id, entry.weaponId],
        )).rows[0].id;
        for (const attachment of entry.attachments) {
          await db.query(
            "insert into public.loadout_weapon_attachments (loadout_weapon_id,attachment_id) values ($1,$2)",
            [slot, attachment.id],
          );
        }
      }
      await db.query("COMMIT");
      console.log(`\nAPPLIED: ${created} created, ${updated} updated.`);
    } catch (error) {
      await db.query("ROLLBACK").catch(() => {});
      throw error;
    }
  }
} finally {
  await db.end();
}
