import { Instagram, Youtube, Twitch, Video, Gamepad2 } from "lucide-react";

export type SocialPlatform = "tiktok" | "instagram" | "youtube" | "twitch" | "kick";

export interface SocialLinks {
  tiktok: string | null;
  instagram: string | null;
  youtube: string | null;
  twitch: string | null;
  kick: string | null;
}

export interface SocialStats {
  tiktok: number | null;
  instagram: number | null;
  youtube: number | null;
  twitch: number | null;
  kick: number | null;
  fetchedAt?: string | null;
}

// Lucide has no TikTok mark -- Video stands in for it.
export const SOCIAL_LINK_FIELDS: {
  key: SocialPlatform;
  label: string;
  icon: typeof Instagram;
  url: (handle: string) => string;
}[] = [
  { key: "tiktok", label: "TikTok", icon: Video, url: (h) => `https://tiktok.com/@${h}` },
  { key: "instagram", label: "Instagram", icon: Instagram, url: (h) => `https://instagram.com/${h}` },
  { key: "youtube", label: "YouTube", icon: Youtube, url: (h) => `https://youtube.com/@${h}` },
  { key: "twitch", label: "Twitch", icon: Twitch, url: (h) => `https://twitch.tv/${h}` },
  { key: "kick", label: "Kick", icon: Gamepad2, url: (h) => `https://kick.com/${h}` },
];

/** Compact follower/subscriber count, e.g. 1234567 -> "1.2M". */
export function formatCount(n: number | null | undefined): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}
