import { InstagramIcon, TiktokIcon, TwitchIcon, YoutubeIcon, KickIcon } from "@/assets/icons/socials";

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

export const SOCIAL_LINK_FIELDS: {
  key: SocialPlatform;
  label: string;
  icon: typeof InstagramIcon;
  url: (handle: string) => string;
}[] = [
  { key: "tiktok", label: "TikTok", icon: TiktokIcon, url: (h) => `https://tiktok.com/@${h}` },
  { key: "instagram", label: "Instagram", icon: InstagramIcon, url: (h) => `https://instagram.com/${h}` },
  { key: "youtube", label: "YouTube", icon: YoutubeIcon, url: (h) => `https://youtube.com/@${h}` },
  { key: "twitch", label: "Twitch", icon: TwitchIcon, url: (h) => `https://twitch.tv/${h}` },
  { key: "kick", label: "Kick", icon: KickIcon, url: (h) => `https://kick.com/${h}` },
];

/** Compact follower/subscriber count, e.g. 1234567 -> "1.2M". */
export function formatCount(n: number | null | undefined): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}
