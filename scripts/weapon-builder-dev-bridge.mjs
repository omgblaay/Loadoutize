import { watch } from "node:fs";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const MIRRORED_FILES = new Set(["catalog.json", "compositor.js"]);
const SNAPSHOT_FILE = "source-calibration.json";
const SOURCE_ORIGINS = new Set(["http://localhost:8767", "http://127.0.0.1:8767"]);

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

async function sameContent(content, target, semanticJson = false) {
  try {
    const right = await readFile(target);
    if (content.equals(right)) return true;
    if (semanticJson) {
      return JSON.stringify(canonical(JSON.parse(content))) ===
        JSON.stringify(canonical(JSON.parse(right)));
    }
  } catch { /* A missing destination needs its first copy. */ }
  return false;
}

function validateMirror(name, content) {
  if (!content.length) throw new Error(`${name} is empty; keeping the existing app copy`);
  if (name === "catalog.json") {
    const catalog = JSON.parse(content.toString("utf8"));
    if (!Array.isArray(catalog.weapons) || !catalog.weapons.length ||
      !Array.isArray(catalog.assets) || !catalog.assets.length) {
      throw new Error("catalog.json has no weapons or assets; keeping the existing app copy");
    }
  }
}

async function writeAtomic(destination, content) {
  const temporary = `${destination}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    await writeFile(temporary, content);
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
}

function validSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return false;
  for (const section of ["placementOverrides", "slotMounts", "barrelMuzzleOffsets"]) {
    const weapons = snapshot[section];
    if (!weapons || typeof weapons !== "object" || Array.isArray(weapons)) return false;
    for (const values of Object.values(weapons)) {
      if (!values || typeof values !== "object" || Array.isArray(values)) return false;
      for (const value of Object.values(values)) {
        if (!value || typeof value !== "object" || Array.isArray(value)) return false;
        if (Object.values(value).some((entry) => typeof entry !== "number" && typeof entry !== "string")) return false;
      }
    }
  }
  return true;
}

function validNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1000;
}

function applyLegacyEdit(snapshot, edit, library) {
  const weapon = library.weapons.find((entry) => entry.id === edit.weaponId);
  if (!weapon) throw new Error("Unknown weapon");
  const section = { placement: "placementOverrides", slotMount: "slotMounts", barrelMuzzle: "barrelMuzzleOffsets" }[edit.op];
  if (!section || typeof edit.key !== "string" || edit.key.length > 120) throw new Error("Invalid edit");
  const assetIds = new Set(library.assets.map((asset) => asset.id));
  if (edit.op === "placement") {
    const [assetId, apexId] = edit.key.split("@");
    if (!assetIds.has(assetId) || (apexId && !assetIds.has(apexId))) throw new Error("Unknown part");
  } else if (edit.op === "slotMount") {
    if (!library.slots.includes(edit.key)) throw new Error("Unknown slot");
  } else if (!assetIds.has(edit.key)) throw new Error("Unknown barrel");
  if (edit.value !== null && (!edit.value || typeof edit.value !== "object" ||
    Object.entries(edit.value).some(([key, value]) =>
      key === "source" ? !["receiver", "barrel", "guard"].includes(value) : !validNumber(value)))) {
    throw new Error("Invalid calibration value");
  }
  snapshot[section] ??= {};
  snapshot[section][weapon.id] ??= {};
  if (edit.value === null) {
    delete snapshot[section][weapon.id][edit.key];
    if (!Object.keys(snapshot[section][weapon.id]).length) delete snapshot[section][weapon.id];
  } else snapshot[section][weapon.id][edit.key] = edit.value;
}

export function weaponBuilderDevBridge(projectRoot) {
  const sourceDir = process.env.WEAPON_BUILDER_SOURCE_DIR ?? path.resolve(
    projectRoot, "../Documents/ChatGPT/Webflow-Naidfe/warzone-generated/mw4-all-image-review/weapon-builder",
  );
  const targetDir = path.resolve(projectRoot, "public/weapon-preview/weapon-builder");
  let watcher;
  let writeQueue = Promise.resolve();

  async function mirror(name, server, initial = false) {
    if (!MIRRORED_FILES.has(name)) return;
    const source = path.join(sourceDir, name);
    const target = path.join(targetDir, name);
    const content = await readFile(source);
    validateMirror(name, content);
    const targets = name === "compositor.js"
      ? [target, path.resolve(projectRoot, "src/lib/weaponSpriteCompositor.js")]
      : [target];
    let changed = false;
    for (const destination of targets) {
      if (await sameContent(content, destination, initial && name === "catalog.json")) continue;
      await writeAtomic(destination, content);
      changed = true;
    }
    if (!changed) return;
    if (!initial) server.ws.send({ type: "full-reload" });
    server.config.logger.info(`[weapon-builder] synced ${name} into Loadoutize`);
  }

  return {
    name: "weapon-builder-dev-bridge",
    apply: "serve",
    async configureServer(server) {
      for (const name of MIRRORED_FILES) {
        try { await mirror(name, server, true); }
        catch (error) { server.config.logger.warn(`[weapon-builder] ${name}: ${error.message}`); }
      }
      try {
        watcher = watch(sourceDir, (_event, name) => {
          if (!name || !MIRRORED_FILES.has(String(name))) return;
          writeQueue = writeQueue.then(() => mirror(String(name), server)).catch((error) => {
            server.config.logger.error(`[weapon-builder] sync failed: ${error.message}`);
          });
        });
        server.httpServer?.once("close", () => watcher?.close());
      } catch (error) {
        server.config.logger.warn(`[weapon-builder] source watcher unavailable: ${error.message}`);
      }

      // Keep already-open 8767 tabs working until their next normal refresh.
      server.middlewares.use("/__weapon-builder/calibration", (req, res) => {
        const origin = req.headers.origin;
        const remote = req.socket.remoteAddress;
        if (SOURCE_ORIGINS.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Content-Type", "application/json");
        if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
        if (req.method !== "POST" || !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote) ||
          !SOURCE_ORIGINS.has(origin)) {
          res.statusCode = 403; res.end('{"error":"Original local builder only"}'); return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 16_384) req.destroy();
        });
        req.on("end", () => {
          writeQueue = writeQueue.then(async () => {
            const target = path.join(targetDir, SNAPSHOT_FILE);
            const snapshot = JSON.parse(await readFile(target, "utf8"));
            const library = JSON.parse(await readFile(path.join(targetDir, "catalog.json"), "utf8"));
            applyLegacyEdit(snapshot, JSON.parse(body), library);
            const temporary = `${target}.${process.pid}.tmp`;
            await writeFile(temporary, JSON.stringify(snapshot, null, 2) + "\n");
            await rename(temporary, target);
            server.ws.send({ type: "full-reload" });
            res.end('{"ok":true}');
          }).catch((error) => {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: error.message }));
          });
        });
      });

      server.middlewares.use("/__weapon-builder/source-calibration", (req, res) => {
        const origin = req.headers.origin;
        const remote = req.socket.remoteAddress;
        if (SOURCE_ORIGINS.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Content-Type", "application/json");
        if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
        if (req.method !== "POST" || !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote) ||
          !SOURCE_ORIGINS.has(origin)) {
          res.statusCode = 403; res.end('{"error":"Original local builder only"}'); return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 500_000) req.destroy();
        });
        req.on("end", () => {
          writeQueue = writeQueue.then(async () => {
            const snapshot = JSON.parse(body);
            if (!validSnapshot(snapshot)) throw new Error("Invalid source calibration");
            const target = path.join(targetDir, SNAPSHOT_FILE);
            const temporary = `${target}.${process.pid}.tmp`;
            await writeFile(temporary, JSON.stringify(snapshot, null, 2) + "\n");
            await rename(temporary, target);
            server.ws.send({ type: "full-reload" });
            res.end('{"ok":true}');
          }).catch((error) => {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: error.message }));
          });
        });
      });
    },
  };
}
