import { watch } from "node:fs";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const MIRRORED_FILES = new Set(["catalog.json", "compositor.js"]);
const SNAPSHOT_FILE = "source-calibration.json";
export const SOURCE_ORIGINS = new Set(["http://localhost:8767", "http://127.0.0.1:8767"]);

type Json = unknown;

function canonical(value: Json): Json {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, Json>)
        .sort()
        .map((key) => [key, canonical((value as Record<string, Json>)[key])]),
    );
  }
  return value;
}

async function sameContent(content: Buffer, target: string, semanticJson = false) {
  try {
    const right = await readFile(target);
    if (content.equals(right)) return true;
    if (semanticJson) {
      return (
        JSON.stringify(canonical(JSON.parse(content.toString("utf8")))) ===
        JSON.stringify(canonical(JSON.parse(right.toString("utf8"))))
      );
    }
  } catch {
    /* A missing destination needs its first copy. */
  }
  return false;
}

function validateMirror(name: string, content: Buffer) {
  if (!content.length) throw new Error(`${name} is empty; keeping the existing app copy`);
  if (name === "catalog.json") {
    const catalog = JSON.parse(content.toString("utf8"));
    if (!Array.isArray(catalog.weapons) || !catalog.weapons.length || !Array.isArray(catalog.assets) || !catalog.assets.length) {
      throw new Error("catalog.json has no weapons or assets; keeping the existing app copy");
    }
  }
}

async function writeAtomic(destination: string, content: Buffer | string) {
  const temporary = `${destination}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    await writeFile(temporary, content);
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
}

export function validSnapshot(snapshot: any) {
  if (!snapshot || typeof snapshot !== "object") return false;
  for (const section of ["placementOverrides", "slotMounts", "barrelMuzzleOffsets"]) {
    const weapons = snapshot[section];
    if (!weapons || typeof weapons !== "object" || Array.isArray(weapons)) return false;
    for (const values of Object.values(weapons as Record<string, any>)) {
      if (!values || typeof values !== "object" || Array.isArray(values)) return false;
      for (const value of Object.values(values as Record<string, any>)) {
        if (!value || typeof value !== "object" || Array.isArray(value)) return false;
        if (Object.values(value as Record<string, any>).some((entry) => typeof entry !== "number" && typeof entry !== "string")) return false;
      }
    }
  }
  return true;
}

function validNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1000;
}

export function applyLegacyEdit(snapshot: any, edit: any, library: any) {
  const weapon = library.weapons.find((entry: any) => entry.id === edit.weaponId);
  if (!weapon) throw new Error("Unknown weapon");
  const section = ({ placement: "placementOverrides", slotMount: "slotMounts", barrelMuzzle: "barrelMuzzleOffsets" } as Record<string, string>)[edit.op];
  if (!section || typeof edit.key !== "string" || edit.key.length > 120) throw new Error("Invalid edit");
  const assetIds = new Set(library.assets.map((asset: any) => asset.id));
  if (edit.op === "placement") {
    const [assetId, apexId] = edit.key.split("@");
    if (!assetIds.has(assetId) || (apexId && !assetIds.has(apexId))) throw new Error("Unknown part");
  } else if (edit.op === "slotMount") {
    if (!library.slots.includes(edit.key)) throw new Error("Unknown slot");
  } else if (!assetIds.has(edit.key)) throw new Error("Unknown barrel");
  if (
    edit.value !== null &&
    (!edit.value ||
      typeof edit.value !== "object" ||
      Object.entries(edit.value).some(([key, value]) =>
        key === "source" ? !["receiver", "barrel", "guard"].includes(value as string) : !validNumber(value),
      ))
  ) {
    throw new Error("Invalid calibration value");
  }
  snapshot[section] ??= {};
  snapshot[section][weapon.id] ??= {};
  if (edit.value === null) {
    delete snapshot[section][weapon.id][edit.key];
    if (!Object.keys(snapshot[section][weapon.id]).length) delete snapshot[section][weapon.id];
  } else snapshot[section][weapon.id][edit.key] = edit.value;
}

export function bridgePaths(projectRoot = process.cwd()) {
  const sourceDir =
    process.env.WEAPON_BUILDER_SOURCE_DIR ??
    path.resolve(projectRoot, "../Documents/ChatGPT/Webflow-Naidfe/warzone-generated/mw4-all-image-review/weapon-builder");
  const targetDir = path.resolve(projectRoot, "public/weapon-preview/weapon-builder");
  return { sourceDir, targetDir, snapshotPath: path.join(targetDir, SNAPSHOT_FILE), catalogPath: path.join(targetDir, "catalog.json") };
}

let writeChain: Promise<void> = Promise.resolve();
export function queueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(() => undefined, () => undefined);
  return run;
}

async function mirrorOne(name: string, sourceDir: string, targetDir: string, projectRoot: string, initial = false) {
  if (!MIRRORED_FILES.has(name)) return false;
  const source = path.join(sourceDir, name);
  const target = path.join(targetDir, name);
  const content = await readFile(source);
  validateMirror(name, content);
  const targets =
    name === "compositor.js" ? [target, path.resolve(projectRoot, "src/lib/weaponSpriteCompositor.js")] : [target];
  let changed = false;
  for (const destination of targets) {
    if (await sameContent(content, destination, initial && name === "catalog.json")) continue;
    await writeAtomic(destination, content);
    changed = true;
  }
  return changed;
}

const startedFor = new Set<string>();

export async function startWeaponBuilderBridge(projectRoot = process.cwd()) {
  if (process.env.NODE_ENV === "production") return;
  if (startedFor.has(projectRoot)) return;
  startedFor.add(projectRoot);

  const { sourceDir, targetDir } = bridgePaths(projectRoot);
  for (const name of MIRRORED_FILES) {
    try {
      const changed = await queueWrite(() => mirrorOne(name, sourceDir, targetDir, projectRoot, true));
      if (changed) console.info(`[weapon-builder] synced ${name} into Loadoutize`);
    } catch (error: any) {
      console.warn(`[weapon-builder] ${name}: ${error.message}`);
    }
  }
  try {
    watch(sourceDir, (_event, name) => {
      if (!name || !MIRRORED_FILES.has(String(name))) return;
      queueWrite(() => mirrorOne(String(name), sourceDir, targetDir, projectRoot))
        .then((changed) => {
          if (changed) console.info(`[weapon-builder] synced ${String(name)} into Loadoutize`);
        })
        .catch((error: any) => console.error(`[weapon-builder] sync failed: ${error.message}`));
    });
    console.info(`[weapon-builder] watching ${sourceDir}`);
  } catch (error: any) {
    console.warn(`[weapon-builder] source watcher unavailable: ${error.message}`);
  }
}
