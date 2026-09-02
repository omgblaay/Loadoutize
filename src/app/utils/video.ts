import { Instagram, Youtube, Video as VideoIcon } from "lucide-react";

export type VideoPlatform = "tiktok" | "instagram" | "youtube";

export interface LoadoutVideo {
  url: string;
  platform: VideoPlatform;
  title: string | null;
  authorName: string | null;
  thumbnailUrl: string | null;
}

// Mirrors the backend's supabase/functions/server/index.tsx detectVideoPlatform --
// used client-side only to show a live icon preview as the user types, not as
// validation (the server is the source of truth there).
export function detectVideoPlatform(url: string): VideoPlatform | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
    if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "youtube";
    return null;
  } catch {
    return null;
  }
}

// Lucide has no TikTok mark -- Video stands in for it, same as the Settings/UserPage social links.
export const VIDEO_PLATFORM_META: Record<VideoPlatform, { label: string; icon: typeof Instagram }> = {
  tiktok: { label: "TikTok", icon: VideoIcon },
  instagram: { label: "Instagram", icon: Instagram },
  youtube: { label: "YouTube", icon: Youtube },
};
