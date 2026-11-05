import { GAME_SELECTOR_ENABLED, LOCKED_GAME_ID } from "@/lib/games";

type SearchValue = string | number | boolean | null | undefined;

/** Game pages use short URLs until the multi-game selector is enabled. */
export function gamePath(gameId: string, path: string) {
  const prefix = GAME_SELECTOR_ENABLED ? `/${encodeURIComponent(gameId)}` : "";
  return `${prefix}/${path.replace(/^\/+/, "")}`;
}

/** Builds the canonical Explore URL while keeping game selection out of the path. */
export function explorePath(gameId: string = LOCKED_GAME_ID, params: Record<string, SearchValue> = {}) {
  const searchParams = new URLSearchParams();

  if (GAME_SELECTOR_ENABLED && gameId) {
    searchParams.set("game", gameId);
  }

  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const search = searchParams.toString();
  return `/explore${search ? `?${search}` : ""}`;
}

export function weaponMetaPath(gameId: string, weaponId: string) {
  return gamePath(gameId, `meta/weapons/${encodeURIComponent(weaponId)}`);
}

export function weaponMetaListPath(gameId: string, category?: string) {
  const path = gamePath(gameId, "meta/weapons");
  return category ? `${path}?category=${encodeURIComponent(category)}` : path;
}

export function attachmentMetaPath(gameId: string, attachmentId: string) {
  return gamePath(gameId, `meta/attachments/${encodeURIComponent(attachmentId)}`);
}

export function attachmentMetaListPath(gameId: string) {
  return gamePath(gameId, "meta/attachments");
}

export function attachmentGroupMetaPath(
  gameId: string,
  attachmentGroup: string,
) {
  return gamePath(gameId, `meta/attachmentgroup/${encodeURIComponent(attachmentGroup)}`);
}

export function perkMetaListPath(gameId: string) {
  return gamePath(gameId, "meta/perks");
}

export function loadoutPath(
  gameId: string,
  loadoutId: string,
  contentType: "full_loadout" | "weapon_config" = "weapon_config",
) {
  return contentType === "full_loadout"
    ? gamePath(gameId, `l/${loadoutId}`)
    : gamePath(gameId, `cfg/${loadoutId}`);
}
