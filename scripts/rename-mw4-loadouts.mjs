import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

// Renames imported MW4 loadouts from the generic "Weapon · Playstyle" scheme to
// YouTube-style titles. Dry-run by default; pass --apply to commit.
//
// Idempotent: only rows still using the " · " naming convention are touched.

const ROOT = "/Users/krystianblaszczyk/Ldtize";
const APPLY = process.argv.includes("--apply");

const TITLE_POOLS = {
  "Close Range": [
    (w) => `The ${w} close-range build is RUINING my lobbies`,
    (w) => `This ${w} movement class is way too fast in MW4`,
    (w) => `I made the sweatiest ${w} build in MW4`,
    (w) => `The ${w} hipfire setup nobody is ready for in MW4`,
    (w) => `This ${w} class makes MW4 movement look broken`,
    (w) => `${w} up close is actually insane in MW4`,
    (w) => `The ${w} build that wins every 1v1 in MW4`,
    (w) => `I took the ${w} into ranked and it went CRAZY`,
    (w) => `This ${w} setup is pure chaos in MW4 lobbies`,
    (w) => `The ${w} rush class every sweat needs in MW4`,
    (w) => `Why does this ${w} build feel so unfair in MW4?`,
    (w) => `MW4: the ${w} close-range class that broke me`,
    (w) => `I built the fastest ${w} in MW4 (it's a problem)`,
    (w) => `The ${w} setup that makes MW4 1v1s feel free`,
    (w) => `This ${w} build is unfair at point-blank in MW4`,
    (w) => `The ${w} class I'd ban if I ran MW4 ranked`,
  ],
  Versatile: [
    (w) => `The ${w} all-rounder that works on EVERY MW4 map`,
    (w) => `This ${w} build is the safest pick in MW4 ranked`,
    (w) => `The do-it-all ${w} class nobody is talking about in MW4`,
    (w) => `I found the most BALANCED ${w} build in MW4`,
    (w) => `This ${w} setup does literally everything in MW4`,
    (w) => `The ${w} class that carried me through MW4 ranked`,
    (w) => `MW4: the ${w} build that works in any lobby`,
    (w) => `Why this ${w} loadout is quietly top tier in MW4`,
    (w) => `The ${w} build I keep coming back to in MW4`,
    (w) => `This ${w} class just feels RIGHT in MW4`,
    (w) => `The ${w} loadout that fixes every MW4 lobby`,
    (w) => `I can't stop using this ${w} build in MW4`,
    (w) => `The ${w} build that does it all in MW4 (and then some)`,
    (w) => `This ${w} class is the definition of MW4 meta`,
    (w) => `One ${w} loadout for every MW4 situation`,
    (w) => `The ${w} setup that makes ranked feel easy in MW4`,
  ],
  Sniper: [
    (w) => `This ${w} one-shot build is actually unfair in MW4`,
    (w) => `The ${w} quick-scope setup nobody expects in MW4`,
    (w) => `I hit the nastiest ${w} snipe in MW4`,
    (w) => `The ${w} sniper class that breaks cross-map fights in MW4`,
    (w) => `This ${w} build makes MW4 sniping look easy`,
    (w) => `MW4: the ${w} sniper setup that feels illegal`,
    (w) => `The ${w} one-tap class every MW4 sniper needs`,
    (w) => `I took the ${w} sniper into ranked and popped off`,
    (w) => `This ${w} quickscope build is pure disrespect in MW4`,
    (w) => `The ${w} sniper loadout that never misses in MW4`,
    (w) => `This ${w} build turned me into an MW4 sniper`,
    (w) => `The ${w} one-shot setup that got me reported in MW4`,
  ],
  "Apex Attachment": [
    (w) => `The ${w} Apex attachment is secretly BROKEN in MW4`,
    (w) => `I put the Apex kit on the ${w} and it's INSANE in MW4`,
    (w) => `The ${w} Apex conversion nobody is using in MW4`,
    (w) => `This ${w} Apex build changes the whole gun in MW4`,
    (w) => `MW4: the ${w} Apex setup that feels illegal`,
    (w) => `The ${w} Apex attachment turned it into a monster in MW4`,
    (w) => `I slept on the ${w} Apex build for too long in MW4`,
    (w) => `This ${w} Apex loadout is the real MW4 meta`,
    (w) => `The ${w} Apex class that broke my lobbies in MW4`,
    (w) => `Why is nobody talking about the ${w} Apex build in MW4?`,
    (w) => `The ${w} Apex kit makes it a completely different gun in MW4`,
    (w) => `This ${w} Apex setup is low-key the best in MW4`,
  ],
};

const VARIANT_TITLE_POOLS = {
  "Close Range": [
    (w) => `No Apex, no problem: the ${w} close-range build still SLAPS in MW4`,
    (w) => `I took the Apex off the ${w}... and it got better in MW4`,
    (w) => `The NO-APEX ${w} rush class that still dominates MW4`,
    (w) => `This ${w} build without Apex is secretly the better one in MW4`,
    (w) => `The ${w} close-range setup that doesn't need Apex in MW4`,
    (w) => `MW4: this no-Apex ${w} build is still unfair`,
    (w) => `No Apex? This ${w} class still wins every 1v1 in MW4`,
    (w) => `The ${w} build that proves Apex isn't everything in MW4`,
  ],
  Versatile: [
    (w) => `No Apex needed: the ${w} all-rounder that still works in MW4`,
    (w) => `I removed the Apex from the ${w} and it's still top tier in MW4`,
    (w) => `The NO-APEX ${w} build that does it all in MW4`,
    (w) => `This ${w} loadout without Apex might be the better pick in MW4`,
    (w) => `The ${w} no-Apex class that carried me through MW4 ranked`,
    (w) => `MW4: the ${w} build that doesn't need the Apex kit`,
    (w) => `No Apex, still meta: the ${w} all-rounder in MW4`,
    (w) => `The ${w} setup that works even without the Apex kit in MW4`,
  ],
  Sniper: [
    (w) => `No Apex, still one-shot: the ${w} sniper build in MW4`,
    (w) => `I took the Apex off the ${w} sniper and it still SLAPS in MW4`,
    (w) => `The NO-APEX ${w} quickscope setup nobody expects in MW4`,
    (w) => `This ${w} sniper build works WITHOUT the Apex kit in MW4`,
    (w) => `The ${w} no-Apex sniper class that still breaks lobbies in MW4`,
    (w) => `MW4: the ${w} sniper setup that doesn't need Apex`,
  ],
  "Apex Attachment": [
    (w) => `The ${w} Apex build WITHOUT the Apex attachment in MW4`,
    (w) => `I took the Apex off the ${w}... and it still SLAPS in MW4`,
    (w) => `No Apex, no problem: the ${w} conversion build still works in MW4`,
    (w) => `The ${w} build that doesn't need the Apex attachment in MW4`,
    (w) => `This ${w} no-Apex setup is still secretly broken in MW4`,
    (w) => `MW4: the ${w} build without Apex that still dominates`,
  ],
};

const DESCRIPTION_BLURBS = {
  "Close Range": "Built for movement, aggressive pushes and winning close-range fights.",
  Versatile: "Built as a do-it-all class that holds up on every map.",
  Sniper: "Built for long-range picks, quick scopes and one-shot potential.",
  "Apex Attachment": "Built around the Apex attachment conversion.",
};

const env = readFileSync(resolve(ROOT, ".env"), "utf8");
const envLine = env.split(/\r?\n/).find((line) => line.startsWith("SUPABASE_DB_CONNECTION_STRING="));
const connectionString = envLine.slice(envLine.indexOf("=") + 1).replace(/^"|"$/g, "");
const db = new pg.Client({ connectionString, connectionTimeoutMillis: 15000, ssl: { rejectUnauthorized: false } });

await db.connect();
try {
  const rows = (await db.query(
    "select id, name, description, game_loadout_code from public.loadouts where game_id='mw4' order by name",
  )).rows;

  const imported = rows.filter((row) => row.name.includes(" · "));
  const groups = new Map();
  for (const row of imported) {
    const variant = row.name.endsWith(" (No Apex)");
    const baseName = row.name.replace(/ \(No Apex\)$/, "");
    const [weapon, playstyle] = baseName.split(" · ");
    if (!weapon || !playstyle) throw new Error(`Could not parse ${row.name}`);
    const pool = (variant ? VARIANT_TITLE_POOLS : TITLE_POOLS)[playstyle];
    if (!pool) throw new Error(`No title pool for playstyle "${playstyle}" (${row.name})`);
    const key = `${variant ? "variant" : "base"}|${playstyle}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ row, weapon, playstyle, variant, pool });
  }

  const used = new Set(rows.map((row) => row.name));
  for (const row of imported) used.delete(row.name);

  const plan = [];
  for (const group of [...groups.values()]) {
    group.sort((a, b) => a.weapon.localeCompare(b.weapon));
    group.forEach((entry, index) => {
      let title = "";
      for (let attempt = 0; attempt < entry.pool.length; attempt += 1) {
        const candidate = entry.pool[(index + attempt) % entry.pool.length](entry.weapon);
        if (!used.has(candidate)) {
          title = candidate;
          break;
        }
      }
      if (!title) throw new Error(`Could not build a unique title for ${entry.row.name}`);
      if (title.length > 100) throw new Error(`Title too long (${title.length}): ${title}`);
      used.add(title);

      const description = entry.variant
        ? `Full ${entry.weapon} setup for MW4 multiplayer, no Apex attachment required. ${DESCRIPTION_BLURBS[entry.playstyle]} Attachments and tune listed below.`
        : `Full ${entry.weapon} setup for MW4 multiplayer. ${DESCRIPTION_BLURBS[entry.playstyle]} Attachments and tune listed below.`;

      plan.push({ id: entry.row.id, oldName: entry.row.name, name: title, description });
    });
  }

  console.log(`Imported MW4 loadouts: ${imported.length}`);
  console.log(`Title pools: ${Object.keys(TITLE_POOLS).join(", ")}`);
  console.log(`\nSamples by group:`);
  for (const key of groups.keys()) {
    const samples = plan.filter((entry) => {
      const variant = entry.oldName.endsWith(" (No Apex)");
      const playstyle = entry.oldName.replace(/ \(No Apex\)$/, "").split(" · ")[1];
      return `${variant ? "variant" : "base"}|${playstyle}` === key;
    }).slice(0, 2);
    console.log(`  [${key}]`);
    for (const entry of samples) console.log(`    ${entry.oldName}\n      -> ${entry.name}`);
  }
  const tooLong = plan.filter((entry) => entry.name.length > 100);
  console.log(`\nLongest title: ${plan.length ? Math.max(...plan.map((entry) => entry.name.length)) : 0} chars`);
  console.log(`Duplicates: ${plan.length - new Set(plan.map((entry) => entry.name)).size}`);
  console.log(`Over 100 chars: ${tooLong.length}`);

  if (plan.length === 0) {
    console.log("\nNothing to rename — every imported loadout already has a custom title.");
  }

  if (!APPLY) {
    console.log("\nDRY RUN — no database writes. Re-run with --apply to commit.");
  } else {
    await db.query("BEGIN");
    try {
      for (const entry of plan) {
        await db.query(
          "update public.loadouts set name=$1, description=$2, updated_at=now() where id=$3",
          [entry.name, entry.description, entry.id],
        );
      }
      await db.query("COMMIT");
      console.log(`\nRenamed ${plan.length} MW4 loadouts.`);
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await db.end();
}
