// Mirrors the backend's ROLE_TAGS in supabase/functions/server/index.tsx --
// keep both in sync. Distinct from the `tags` table (loadout playstyle tags
// like "Run'n'Gun"); this classifies the *user*.
export type RoleTag = "player" | "pro_player" | "streamer" | "content_creator" | "sweat";

export const ROLE_TAG_META: Record<RoleTag, { label: string }> = {
  player: { label: "Player" },
  pro_player: { label: "Pro Player" },
  streamer: { label: "Streamer" },
  content_creator: { label: "Content Creator" },
  sweat: { label: "Sweat" },
};

export const ROLE_TAG_ORDER: RoleTag[] = ["player", "pro_player", "streamer", "content_creator", "sweat"];
