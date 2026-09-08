import { InstagramIcon, TiktokIcon, YoutubeIcon } from "@/assets/icons/socials/index";

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

// Same brand-mark icons used for the Settings/UserPage social links, not lucide's generic stand-ins.
export const VIDEO_PLATFORM_META: Record<VideoPlatform, { label: string; icon: typeof InstagramIcon }> = {
  tiktok: { label: "TikTok", icon: TiktokIcon },
  instagram: { label: "Instagram", icon: InstagramIcon },
  youtube: { label: "YouTube", icon: YoutubeIcon },
};
