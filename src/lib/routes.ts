import { GAME_SELECTOR_ENABLED, LOCKED_GAME_ID } from "@/lib/games";

type SearchValue = string | number | boolean | null | undefined;

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
  return `/${gameId}/meta/weapons/${encodeURIComponent(weaponId)}`;
}

export function weaponMetaListPath(gameId: string) {
  return `/${gameId}/meta/weapons`;
}

export function weaponGroupMetaPath(gameId: string, weaponGroup: string) {
  return `/${gameId}/meta/weapongroup/${encodeURIComponent(weaponGroup)}`;
}

export function attachmentMetaPath(gameId: string, attachmentId: string) {
  return `/${gameId}/meta/attachments/${encodeURIComponent(attachmentId)}`;
}

export function attachmentMetaListPath(gameId: string) {
  return `/${gameId}/meta/attachments`;
}

export function attachmentGroupMetaPath(
  gameId: string,
  attachmentGroup: string,
) {
  return `/${gameId}/meta/attachmentgroup/${encodeURIComponent(attachmentGroup)}`;
}

export function perkMetaListPath(gameId: string) {
  return `/${gameId}/meta/perks`;
}

export function loadoutPath(
  gameId: string,
  loadoutId: string,
  contentType: "full_loadout" | "weapon_config" = "weapon_config",
) {
  return contentType === "full_loadout"
    ? `/${gameId}/l/${loadoutId}`
    : `/${gameId}/weapon/${loadoutId}`;
}
