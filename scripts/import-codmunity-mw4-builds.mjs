import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

// Public MW4 Multiplayer builds checked on 2026-11-07. This script is dry-run
// by default; pass --apply to commit. Missing catalog labels are added as
// source-specific text entries without claiming an unverified sprite asset.
const builds = [
  {
    weapon: "VEL 46", weaponId: "rex_sm_mpapa7", style: "Versatile",
    code: "S03-43QCD-D4EP7-KU11", source: "https://codmunity.gg/weapon/mw4/vel-46",
    parts: [
      ["Muzzle", "FSS Crackdown"], ["Barrel", "VB-46 Series 11"],
      ["Rear Grip", "Sakin Rubber Grip"], ["Ammunition", "4.6x30mm Overpressured"],
      ["Underbarrel", "FSS Tac90 Grip"], ["APEX", "Snap"],
    ],
  },
  {
    weapon: "Hyeon Burst", weaponId: "rex_ar_xar1", style: "Versatile",
    code: "A09-43QCD-D4HTW-VI11", source: "https://codmunity.gg/weapon/mw4/hyeon-burst",
    parts: [
      ["Muzzle", "FSS IS40"], ["Barrel", "Mugi Hwando-Z3 521mm"],
      ["Rear Grip", "HYN-Meipeul"], ["Ammunition", "6.8x43mm Overpressured"],
      ["Underbarrel", "FSS Tac90 Grip"], ["APEX", "Hyeon Hyperburst"],
    ],
  },
  {
    weapon: "Cronen Osprey", weaponId: "rex_ar_cromeo", style: "Versatile",
    code: "A02-43QCD-CXJDX-MS11", source: "https://codmunity.gg/weapon/mw4/cronen-osprey",
    parts: [
      ["Muzzle", "XRK Mil-Tac Suppressor"], ["Rear Grip", "Cronen 56"],
      ["Ammunition", "5.56 NATO Overpressured"], ["Magazine", "60 Round Mag"],
      ["Underbarrel", "FSS Tac90 Grip"],
    ],
  },
  {
    weapon: "KG-7 Vulcan", weaponId: "rex_sn_svictor98", style: "Sniper",
    code: "R04-2G9Q4-VHSZY-11", source: "https://codmunity.gg/weapon/mw4/kg-7-vulcan",
    parts: [
      ["Muzzle", "Ivanov QR600"], ["Barrel", "TT Baem 12"],
      ["Optic", "Schlager 7x"], ["Stock", "Bruen KG-7 Mk. IV"],
      ["Comb", "TT Type 40 Comb"], ["APEX", "KG-7 Drillcharge"],
    ],
  },
  {
    weapon: "ISO Nightshade", weaponId: "rex_sm_spier9", style: "Versatile",
    code: "S06-3YNQ7-YB11", source: "https://codmunity.gg/weapon/mw4/iso-nightshade",
    parts: [
      ["Muzzle", "XRK Herder 40"], ["Stock", "Demo Kilo90 Stock"],
      ["Rear Grip", "ZLR Veloci Gen.2"], ["Magazine", "40 Round Mag"],
      ["Underbarrel", "FSS Tac90 Grip"], ["APEX", "ISO Trace"],
    ],
  },
  {
    weapon: "Kastov 762", weaponId: "rex_ar_akilo", style: "Versatile",
    code: "A01-43QCD-CXBJ5-XS11", source: "https://codmunity.gg/weapon/mw4/kastov-762",
    parts: [
      ["Barrel", "FJX Ghostfire 16.3"], ["Rear Grip", "Hanbit TechGrip"],
      ["Ammunition", "7.62 Soviet Overpressured"], ["Magazine", "45 Round Mag 7.62"],
      ["Underbarrel", "FSS Tac90 Grip"],
    ],
  },
];

const catalog = JSON.parse(readFileSync(resolve("public/weapon-preview/weapon-builder/catalog.json"), "utf8"));
const assets = new Map(catalog.assets.map((asset) => [asset.id, asset]));
const envLine = readFileSync(resolve(".env"), "utf8").split(/\r?\n/)
  .find((line) => line.startsWith("SUPABASE_DB_CONNECTION_STRING="));
if (!envLine) throw new Error("Missing SUPABASE_DB_CONNECTION_STRING");
const connectionString = envLine.slice(envLine.indexOf("=") + 1).replace(/^"|"$/g, "");
const db = new pg.Client({ connectionString, connectionTimeoutMillis: 10000, ssl: { rejectUnauthorized: false } });
const apply = process.argv.includes("--apply");

function displayName(attachment, weaponId) {
  const asset = assets.get(attachment.stats?.assetId);
  return asset?.display_name ||
    attachment.display_name || attachment.stats?.displayName || attachment.name;
}

function newId() {
  return randomBytes(4).toString("hex").slice(0, 5);
}

await db.connect();
try {
  await db.query("BEGIN");
  await db.query("SET LOCAL lock_timeout = '5s'");
  await db.query("SET LOCAL statement_timeout = '60s'");
  const owner = (await db.query(
    "select id::text,name from public.profiles where id=$1::uuid",
    ["6cf6e4fb-45df-4e40-b7ed-a25b8953fe82"],
  )).rows[0];
  if (!owner) throw new Error("Loadoutize author profile is missing");

  const weapons = new Map((await db.query(
    "select id,name from public.weapons where game_id='mw4'",
  )).rows.map((row) => [row.id, row]));
  const types = new Map((await db.query(
    "select id,name from public.attachment_types where game_id='mw4'",
  )).rows.map((row) => [row.name, row.id]));
  const allAttachments = (await db.query(
    "select id,name,display_name,type_name,stats from public.attachments_with_images where game_id='mw4'",
  )).rows;
  const tagIds = new Map((await db.query(
    "select id,name from public.tags where game_id='mw4'",
  )).rows.map((row) => [row.name, row.id]));

  const results = [];
  for (const build of builds) {
    const tagName = build.style === "Versatile" ? "Balanced" :
      build.style === "Sniper" ? "Long-range" : null;
    const tagId = tagIds.get(tagName);
    if (!tagId) throw new Error(`Missing tag for ${build.style}`);
    const weapon = weapons.get(build.weaponId);
    if (!weapon) throw new Error(`Missing weapon ${build.weaponId}`);
    if (weapon.name !== build.weapon) {
      // CROMEO is the unresolved internal label of the new Cronen Osprey.
      if (build.weaponId !== "rex_ar_cromeo" || weapon.name !== "CROMEO") {
        throw new Error(`Unexpected name for ${build.weaponId}: ${weapon.name}`);
      }
      await db.query("update public.weapons set name=$1 where id=$2", [build.weapon, build.weaponId]);
    }

    const existing = (await db.query(
      "select id,user_id from public.loadouts where game_id='mw4' and game_loadout_code=$1",
      [build.code],
    )).rows[0];
    if (existing && existing.user_id !== owner.id) {
      throw new Error(`Build code ${build.code} belongs to another author`);
    }
    const loadoutId = existing?.id ?? newId();
    const description = `Recreated from CODMunity's MW4 Multiplayer ${build.style.toLowerCase()} build (checked 7 Nov 2026). Source: ${build.source}`;
    if (existing) {
      await db.query(
        "update public.loadouts set name=$1,description=$2,game_loadout_code=$3,tag_id=$4,content_type='weapon_config',is_public=true,updated_at=now() where id=$5",
        [`${build.weapon} · CODMunity ${build.style}`, description, build.code, tagId, loadoutId],
      );
      await db.query("delete from public.loadout_weapons where loadout_id=$1", [loadoutId]);
    } else {
      await db.query(
        "insert into public.loadouts (id,game_id,user_id,user_name,name,description,game_loadout_code,tag_id,content_type,is_public) values ($1,'mw4',$2,$3,$4,$5,$6,$7,'weapon_config',true)",
        [loadoutId, owner.id, owner.name, `${build.weapon} · CODMunity ${build.style}`, description, build.code, tagId],
      );
    }

    const loadoutWeaponId = (await db.query(
      "insert into public.loadout_weapons (loadout_id,weapon_id,slot_order,slot) values ($1,$2,0,'primary') returning id",
      [loadoutId, build.weaponId],
    )).rows[0].id;
    const resolved = [];
    for (const [slot, label] of build.parts) {
      const typeId = types.get(slot);
      if (!typeId) throw new Error(`Missing attachment type ${slot}`);
      const match = allAttachments.find((item) =>
        item.type_name === slot &&
        displayName(item, build.weaponId).toLowerCase() === label.toLowerCase() &&
        item.stats?.weaponIds?.includes(build.weaponId) &&
        item.stats?.builderSelectable !== false,
      );
      let attachmentId = match?.id;
      if (!attachmentId) {
        const sourceName = `${label} [CODMunity ${build.weapon}]`;
        const prior = allAttachments.find((item) => item.name === sourceName && item.type_name === slot);
        if (prior) attachmentId = prior.id;
        else {
          attachmentId = (await db.query(
            "insert into public.attachments (game_id,attachment_type_id,name,display_name,description,stats) values ('mw4',$1,$2,$3,$4,$5::jsonb) returning id",
            [typeId, sourceName, label, `Public MW4 build label from ${build.source}`,
              JSON.stringify({ weaponIds: [build.weaponId], builderSelectable: true,
                evidence: "codmunity_public_build_2026_11_07", sourceUrl: build.source })],
          )).rows[0].id;
          allAttachments.push({ id: attachmentId, name: sourceName, display_name: label, type_name: slot,
            stats: { weaponIds: [build.weaponId], builderSelectable: true } });
        }
      }
      await db.query(
        "insert into public.loadout_weapon_attachments (loadout_weapon_id,attachment_id) values ($1,$2)",
        [loadoutWeaponId, attachmentId],
      );
      resolved.push({ slot, label, attachmentId, sourceOnly: !match });
    }
    const standard = resolved.filter((part) => part.slot !== "APEX").length;
    if (standard !== 5 || resolved.filter((part) => part.slot === "APEX").length > 1) {
      throw new Error(`Invalid attachment count for ${build.weapon}`);
    }
    results.push({ weapon: build.weapon, loadoutId, code: build.code, parts: resolved });
  }

  if (apply) await db.query("COMMIT");
  else await db.query("ROLLBACK");
  console.log(JSON.stringify({ applied: apply, results }, null, 2));
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await db.end();
}
