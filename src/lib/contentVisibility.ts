// Keep the existing full-loadout data and implementation available for a later launch.
export const FULL_LOADOUTS_ENABLED = false;

export function isVisibleConfig(item: { contentType?: string | null }) {
  return FULL_LOADOUTS_ENABLED || item.contentType !== "full_loadout";
}
