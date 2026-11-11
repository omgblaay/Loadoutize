import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

// Creates 10 seed creator accounts and distributes the imported MW4 loadouts
// across them. The top three imported builds stay on the real `blaay` account,
// as does the pre-existing hand-written loadout.
//
// Dry-run by default; pass --apply to commit.

const ROOT = "/Users/krystianblaszczyk/Ldtize";
const APPLY = process.argv.includes("--apply");
const OWNER_NICKNAME = "blaay";

const CREATORS = [
  { nickname: "vyrl", name: "Vyrl", role: "content_creator", ageDays: 412 },
  { nickname: "n0vak", name: "N0VAK", role: "streamer", ageDays: 387 },
  { nickname: "kyzo", name: "kyzo", role: "content_creator", ageDays: 355 },
  { nickname: "shxdow", name: "shxdow", role: "sweat", ageDays: 330 },
  { nickname: "aimbr", name: "AIMBR", role: "pro_player", ageDays: 298 },
  { nickname: "mavrik", name: "Mavrik", role: "streamer", ageDays: 271 },
  { nickname: "zephyr", name: "Zephyr", role: "content_creator", ageDays: 244 },
  { nickname: "lucid", name: "Lucid", role: "pro_player", ageDays: 213 },
  { nickname: "pyro", name: "Pyro", role: "sweat", ageDays: 181 },
  { nickname: "onyx", name: "Onyx", role: "streamer", ageDays: 152 },
];

const env = readFileSync(resolve(ROOT, ".env"), "utf8");
const envLine = env.split(/\r?\n/).find((line) => line.startsWith("SUPABASE_DB_CONNECTION_STRING="));
const connectionString = envLine.slice(envLine.indexOf("=") + 1).replace(/^"|"$/g, "");
const db = new pg.Client({ connectionString, connectionTimeoutMillis: 15000, ssl: { rejectUnauthorized: false } });

await db.connect();
try {
  await db.query("BEGIN");
  await db.query("SET LOCAL lock_timeout = '5s'");

  const hasSeedColumn = (await db.query(
    "select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='is_seed'",
  )).rowCount > 0;

  if (APPLY) {
    await db.query("alter table public.profiles add column if not exists is_seed boolean not null default false");
    await db.query("create index if not exists idx_profiles_is_seed on public.profiles(is_seed) where is_seed");
  }

  const existingCreators = hasSeedColumn || APPLY
    ? (await db.query("select id, nickname, name from public.profiles where is_seed = true order by nickname")).rows
    : [];
  const existingByNickname = new Map(existingCreators.map((row) => [row.nickname, row]));
  const usedNicknames = new Set((await db.query("select nickname from public.profiles")).rows.map((row) => row.nickname));
  const owner = (await db.query("select id, nickname, name from public.profiles where nickname=$1", [OWNER_NICKNAME])).rows[0];
  if (!owner) throw new Error(`Owner profile @${OWNER_NICKNAME} not found`);

  const plannedCreators = CREATORS.map((creator) => {
    const existing = existingByNickname.get(creator.nickname);
    if (existing) {
      if (existing.name !== creator.name) {
        return { ...creator, id: existing.id, updateName: true };
      }
      return { ...creator, id: existing.id };
    }
    if (usedNicknames.has(creator.nickname)) {
      throw new Error(`Nickname @${creator.nickname} is already used by a non-seed profile`);
    }
    return { ...creator, id: randomUUID() };
  });

  const loadouts = (await db.query(
    `select l.id, l.name, l.description, l.user_id, l.user_name, l.game_loadout_code,
       (select count(*)::int from public.loadout_reactions r where r.loadout_id=l.id and r.type='like') likes,
       (select count(*)::int from public.loadout_reactions r where r.loadout_id=l.id and r.type='dislike') dislikes,
       (select count(*)::int from public.loadout_reactions r where r.loadout_id=l.id and r.type='favorite') favorites
     from public.loadouts l
     where l.game_id='mw4'
     order by l.created_at, l.name`,
  )).rows;

  // Imported builds are either coded base builds or the derived no-Apex variants.
  const imported = loadouts.filter(
    (loadout) => loadout.game_loadout_code !== null || /no Apex attachment required/i.test(loadout.description ?? ""),
  );
  const bases = imported.filter((loadout) => loadout.game_loadout_code !== null);
  const score = (loadout) => loadout.likes * 2 + loadout.favorites * 3 - loadout.dislikes;
  const keepers = bases
    .slice()
    .sort((a, b) => b.likes - a.likes || a.dislikes - b.dislikes || a.name.localeCompare(b.name))
    .slice(0, 3);
  const keeperIds = new Set(keepers.map((loadout) => loadout.id));
  const remaining = imported
    .filter((loadout) => !keeperIds.has(loadout.id))
    .sort((a, b) => score(b) - score(a) || b.likes - a.likes || a.name.localeCompare(b.name));

  const assignment = new Map(plannedCreators.map((creator) => [creator.id, []]));
  remaining.forEach((loadout, index) => {
    const creator = plannedCreators[index % plannedCreators.length];
    assignment.get(creator.id).push(loadout);
  });

  console.log(`Creators: ${plannedCreators.length} (${existingCreators.length} existing)`);
  for (const creator of plannedCreators) {
    const owned = assignment.get(creator.id);
    const likes = owned.reduce((sum, loadout) => sum + loadout.likes, 0);
    console.log(`  @${creator.nickname.padEnd(7)} ${creator.role.padEnd(16)} ${String(owned.length).padStart(2)} loadouts, ${String(likes).padStart(4)} likes`);
  }
  console.log(`\nStaying on @${owner.nickname}:`);
  for (const keeper of keepers) console.log(`  ${keeper.name} (${keeper.likes} likes)`);
  const untouched = loadouts.filter((loadout) => !imported.includes(loadout));
  for (const loadout of untouched) console.log(`  ${loadout.name} (pre-existing, untouched)`);
  console.log(`\nImported: ${imported.length}, keepers: ${keepers.length}, reassigned: ${remaining.length}`);

  if (!APPLY) {
    await db.query("ROLLBACK");
    console.log("\nDRY RUN — no database writes. Re-run with --apply to commit.");
  } else {
    const now = new Date().toISOString();
    for (const creator of plannedCreators) {
      if (!existingByNickname.has(creator.nickname)) {
        const created = new Date(Date.now() - creator.ageDays * 86400000).toISOString();
        await db.query(
          `insert into auth.users
            (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,
             confirmation_token,email_change,email_change_token_new,recovery_token,phone_change,phone_change_token,reauthentication_token)
           values ($1,'authenticated','authenticated',$2,null,now(),$3,$3,$4::jsonb,$5::jsonb,'','','','','','','')`,
          [creator.id, `creator+${creator.nickname}@loadoutize.local`, created,
            JSON.stringify({ provider: "email", providers: ["email"], is_seed: true }),
            JSON.stringify({ name: creator.name, nickname: creator.nickname, role_tag: creator.role, is_seed: true })],
        );
        await db.query(
          `insert into public.profiles (id,nickname,name,role_tag,is_bot,is_seed,created_at,updated_at)
           values ($1,$2,$3,$4,false,true,$5,$5)`,
          [creator.id, creator.nickname, creator.name, creator.role, created],
        );
      } else if (creator.updateName) {
        await db.query("update public.profiles set name=$1, updated_at=now() where id=$2", [creator.name, creator.id]);
      }
    }

    for (const [creatorId, owned] of assignment) {
      const creator = plannedCreators.find((entry) => entry.id === creatorId);
      for (const loadout of owned) {
        await db.query(
          "update public.loadouts set user_id=$1, user_name=$2, updated_at=$3 where id=$4",
          [creatorId, creator.name, now, loadout.id],
        );
      }
    }

    // Keepers always belong to the real owner account.
    for (const keeper of keepers) {
      if (keeper.user_id !== owner.id || keeper.user_name !== owner.name) {
        await db.query(
          "update public.loadouts set user_id=$1, user_name=$2, updated_at=$3 where id=$4",
          [owner.id, owner.name, now, keeper.id],
        );
      }
    }

    await db.query("COMMIT");
    console.log("\nCreator accounts and loadout assignments written.");
  }
} catch (error) {
  try {
    await db.query("ROLLBACK");
  } catch {
    // Transaction may already be closed.
  }
  throw error;
} finally {
  await db.end();
}
