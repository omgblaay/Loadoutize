import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

// Seeds clearly-marked demo bots that react to MW4 loadouts. Reaction volume
// and like-ratio follow the build's codmunity tier (S/A/B/C/D).
// Dry-run by default; pass --apply to commit.

const ROOT = "/Users/krystianblaszczyk/Ldtize";
const BASE = "https://codmunity.gg";
const APPLY = process.argv.includes("--apply");
const BOT_COUNT = Number(process.argv.find((arg) => arg.startsWith("--bots="))?.split("=")[1] ?? 75);
const SEED = 20261111;

// --- deterministic RNG -------------------------------------------------------
let state = SEED >>> 0;
function rand() {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));

const strip = (html) => html
  .replace(/<[^>]*>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#0?39;/g, "'")
  .replace(/&nbsp;/g, " ")
  .replace(/<!--.*?-->/g, " ")
  .replace(/\s+/g, " ")
  .trim();

async function getHtml(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36" },
  });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.text();
}

// --- codmunity tier map ------------------------------------------------------
const TIER_LETTER = { 0: "S", 1: "A", 2: "B", 3: "C", 4: "D" };
function parseTierMap(html) {
  const map = new Map();
  for (const chunk of html.split(/<section data-tier="/).slice(1)) {
    const tier = TIER_LETTER[Number(chunk.slice(0, 1))] ?? "B";
    for (const article of chunk.matchAll(/<article class="wl3">([\s\S]*?)<\/article>/g)) {
      const weapon = strip(article[1].match(/<h3 class="wl3-title">([\s\S]*?)<\/h3>/)?.[1] ?? "");
      const playstyle = strip(article[1].match(/<span class="wl3-ps">([\s\S]*?)<\/span>/)?.[1] ?? "");
      if (weapon && playstyle) map.set(`${weapon}|${playstyle}`, tier);
    }
    for (const list of chunk.matchAll(/<ol class="mr-ranking-links"[^>]*>([\s\S]*?)<\/ol>/g)) {
      for (const item of list[1].matchAll(/<li>\s*<a href="\/weapon\/mw4\/[^"]*">([\s\S]*?)<\/a>([\s\S]*?)<\/li>/g)) {
        const weapon = strip(item[1]);
        const playstyle = strip(item[2]).split("·")[0].trim();
        if (weapon && playstyle) map.set(`${weapon}|${playstyle}`, tier);
      }
    }
  }
  return map;
}

// --- bot personas ------------------------------------------------------------
const ADJECTIVES = [
  "swift", "silent", "toxic", "frosty", "lucky", "angry", "cosmic", "gritty", "hyper", "iron",
  "jade", "lunar", "mega", "neon", "omega", "pixel", "quick", "rapid", "shady", "turbo",
  "ultra", "venom", "wild", "xeno", "zero", "alpha", "bravo", "crimson", "dark", "epic",
  "feral", "ghost", "hollow", "icy", "jinx", "kinetic", "lucid", "misty", "nova", "onyx",
];
const NOUNS = [
  "wolf", "sniper", "ghost", "raven", "blade", "fox", "viper", "tiger", "reaper", "ace",
  "storm", "shadow", "hunter", "pilot", "rogue", "saint", "titan", "vapor", "wraith", "yeti",
  "bandit", "comet", "drone", "echo", "falcon", "goblin", "hawk", "knight", "lynx", "nomad",
];

function makeNickname(used) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const adjective = pick(ADJECTIVES);
    const noun = pick(NOUNS);
    const roll = rand();
    const nickname = roll < 0.55
      ? `${adjective}${noun}${between(10, 99)}`
      : roll < 0.8
        ? `${adjective}_${noun}`
        : `${adjective}${noun}`;
    if (/^[a-z0-9_-]{3,20}$/.test(nickname) && !used.has(nickname)) {
      used.add(nickname);
      return nickname;
    }
  }
  throw new Error("Could not generate a unique nickname");
}

// Reaction volume per tier: [min, max].
const TIER_RATES = {
  S: { like: [18, 30], dislike: [0, 2], favorite: [3, 6] },
  A: { like: [12, 22], dislike: [1, 4], favorite: [1, 4] },
  B: { like: [6, 14], dislike: [3, 7], favorite: [0, 2] },
  C: { like: [3, 8], dislike: [5, 10], favorite: [0, 1] },
  D: { like: [1, 5], dislike: [8, 15], favorite: [0, 0] },
};

function scale(range, factor, minimum = 0) {
  return [Math.max(minimum, Math.round(range[0] * factor)), Math.max(minimum, Math.round(range[1] * factor))];
}

const env = readFileSync(resolve(ROOT, ".env"), "utf8");
const envLine = env.split(/\r?\n/).find((line) => line.startsWith("SUPABASE_DB_CONNECTION_STRING="));
const connectionString = envLine.slice(envLine.indexOf("=") + 1).replace(/^"|"$/g, "");
const db = new pg.Client({ connectionString, connectionTimeoutMillis: 15000, ssl: { rejectUnauthorized: false } });

const tierMap = parseTierMap(await getHtml(`${BASE}/mw4`));

await db.connect();
try {
  await db.query("BEGIN");
  await db.query("SET LOCAL lock_timeout = '5s'");

  const hasColumn = (await db.query(
    "select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='is_bot'",
  )).rowCount > 0;
  if (!APPLY) {
    console.log(`is_bot column: ${hasColumn ? "present" : "will be added"}`);
  } else {
    await db.query("alter table public.profiles add column if not exists is_bot boolean not null default false");
    await db.query("create index if not exists idx_profiles_is_bot on public.profiles(is_bot) where is_bot");
  }

  const existingBots = hasColumn || APPLY
    ? (await db.query("select id, nickname from public.profiles where is_bot = true order by created_at, nickname")).rows
    : [];
  const usedNicknames = new Set((await db.query("select nickname from public.profiles")).rows.map((row) => row.nickname));

  const bots = existingBots.slice();
  const botsToCreate = Math.max(0, BOT_COUNT - bots.length);
  for (let i = 0; i < botsToCreate; i++) {
    bots.push({ id: randomUUID(), nickname: makeNickname(usedNicknames) });
  }
  // Dry runs still need stable placeholders for reaction sampling.
  const planBots = bots.length >= BOT_COUNT ? bots.slice(0, BOT_COUNT) : bots;
  const botIds = planBots.map((bot) => bot.id);

  const loadouts = (await db.query(
    "select id, name, created_at from public.loadouts where game_id='mw4' order by created_at, name",
  )).rows;

  const plan = [];
  for (const loadout of loadouts) {
    const isVariant = / \(No Apex\)$/.test(loadout.name);
    const baseName = loadout.name.replace(/ \(No Apex\)$/, "");
    const [weapon, playstyle] = baseName.split(" · ");
    const tier = (weapon && playstyle && tierMap.get(`${weapon}|${playstyle}`)) || "B";
    const rates = TIER_RATES[tier];
    const factor = isVariant ? 0.6 : 1;
    const likeRange = scale(rates.like, factor, 1);
    const dislikeRange = scale(rates.dislike, factor);
    const favoriteRange = scale(rates.favorite, factor);

    const nLike = Math.min(botIds.length, between(likeRange[0], likeRange[1]));
    const nDislike = Math.min(botIds.length - nLike, between(dislikeRange[0], dislikeRange[1]));
    const nFavorite = Math.min(botIds.length - nLike - nDislike, between(favoriteRange[0], favoriteRange[1]));

    // One shuffled order guarantees a bot never likes and dislikes the same loadout.
    const order = botIds.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const assigned = [
      ...order.slice(0, nLike).map((id) => ({ id, type: "like" })),
      ...order.slice(nLike, nLike + nDislike).map((id) => ({ id, type: "dislike" })),
      ...order.slice(nLike + nDislike, nLike + nDislike + nFavorite).map((id) => ({ id, type: "favorite" })),
    ];

    const createdAt = new Date(loadout.created_at).getTime();
    const now = Date.now();
    for (const reaction of assigned) {
      reaction.createdAt = new Date(createdAt + Math.floor(rand() * Math.max(1, now - createdAt))).toISOString();
    }

    plan.push({
      loadoutId: loadout.id,
      loadoutName: loadout.name,
      tier,
      variant: isVariant,
      reactions: assigned,
    });
  }

  const totals = plan.reduce((acc, entry) => {
    for (const reaction of entry.reactions) acc[reaction.type] = (acc[reaction.type] ?? 0) + 1;
    return acc;
  }, {});
  const tierCounts = plan.reduce((acc, entry) => {
    acc[entry.tier] = (acc[entry.tier] ?? 0) + 1;
    return acc;
  }, {});
  const unmatched = plan.filter((entry) => {
    const baseName = entry.loadoutName.replace(/ \(No Apex\)$/, "");
    const [weapon, playstyle] = baseName.split(" · ");
    return !(weapon && playstyle && tierMap.get(`${weapon}|${playstyle}`));
  });

  const report = {
    generatedAt: new Date().toISOString(),
    bots: planBots.length,
    botsCreated: APPLY ? botsToCreate : botsToCreate,
    loadouts: plan.length,
    totals,
    tierCounts,
    unmatched: unmatched.map((entry) => entry.loadoutName),
    plan,
  };
  writeFileSync("/tmp/mw4-bot-plan.json", JSON.stringify(report, null, 2));

  console.log(`bots: ${planBots.length} (${botsToCreate} to create)`);
  console.log(`loadouts: ${plan.length}`);
  console.log(`reactions: ${JSON.stringify(totals)}`);
  console.log(`tiers: ${JSON.stringify(tierCounts)}`);
  if (unmatched.length) console.log(`unmatched tier lookups (default B): ${unmatched.length}`);

  for (const tier of ["S", "A", "B", "C", "D"]) {
    const entries = plan.filter((entry) => entry.tier === tier && !entry.variant);
    if (!entries.length) continue;
    const likes = entries.reduce((n, entry) => n + entry.reactions.filter((r) => r.type === "like").length, 0);
    const dislikes = entries.reduce((n, entry) => n + entry.reactions.filter((r) => r.type === "dislike").length, 0);
    console.log(`  ${tier}: ${entries.length} builds, ${likes} likes / ${dislikes} dislikes (${Math.round(100 * likes / Math.max(1, likes + dislikes))}% positive)`);
  }
  console.log("\nsample:");
  for (const entry of plan.slice(0, 5)) {
    console.log(`  ${entry.loadoutName} [${entry.tier}] -> ${entry.reactions.length} reactions`);
  }

  if (!APPLY) {
    await db.query("ROLLBACK");
    console.log("\nDRY RUN — no database writes. Re-run with --apply to commit.");
  } else {
    const now = new Date().toISOString();
    for (const bot of botsToCreate ? bots.slice(existingBots.length) : []) {
      const created = new Date(Date.now() - between(0, 25) * 86400000).toISOString();
      await db.query(
        `insert into auth.users
          (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,
           confirmation_token,email_change,email_change_token_new,recovery_token,phone_change,phone_change_token,reauthentication_token)
         values ($1,'authenticated','authenticated',$2,null,now(),$3,$3,$4::jsonb,$5::jsonb,'','','','','','','')`,
        [bot.id, `bot+${bot.nickname}@loadoutize.local`, created,
          JSON.stringify({ provider: "email", providers: ["email"] }),
          JSON.stringify({ name: bot.nickname, is_bot: true })],
      );
      await db.query(
        "insert into public.profiles (id,nickname,name,role_tag,is_bot,created_at,updated_at) values ($1,$2,$3,'player',true,$4,$4)",
        [bot.id, bot.nickname, bot.nickname, created],
      );
    }

    const actualBotIds = planBots.map((bot) => bot.id);
    await db.query("delete from public.loadout_reactions where user_id = any($1::text[])", [actualBotIds]);

    let inserted = 0;
    for (const entry of plan) {
      for (const reaction of entry.reactions) {
        await db.query(
          "insert into public.loadout_reactions (loadout_id,user_id,type,created_at) values ($1,$2,$3,$4) on conflict do nothing",
          [entry.loadoutId, reaction.id, reaction.type, reaction.createdAt],
        );
        inserted++;
      }
    }
    await db.query("COMMIT");
    console.log(`\nAPPLIED: ${botsToCreate} bots created, ${inserted} reactions inserted.`);
  }
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await db.end();
}
