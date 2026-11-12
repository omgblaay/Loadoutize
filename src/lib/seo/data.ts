import { LOCKED_GAME_ID } from "@/lib/games";
import type { CardAttachment, CardLoadout, CardWeapon } from "@/types/loadout";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7`;

// Matches the ISR window for every SEO page. Data is fetched server-side and
// cached by the Next.js data cache, so crawlers get HTML without a client round trip.
export const SEO_REVALIDATE_SECONDS = 3600;

async function fetchGameJson<T>(path: string, key: string): Promise<T> {
  const response = await fetch(`${API_BASE}/games/${LOCKED_GAME_ID}/${path}`, {
    headers: { apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` },
    next: { revalidate: SEO_REVALIDATE_SECONDS },
  });
  if (!response.ok) {
    throw new Error(`Failed to load ${key} for SEO pages: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function getWeapons(): Promise<CardWeapon[]> {
  const body = await fetchGameJson<{ weapons: CardWeapon[] }>("weapons", "weapons");
  return body.weapons ?? [];
}

export async function getLoadouts(): Promise<CardLoadout[]> {
  const body = await fetchGameJson<{ loadouts: CardLoadout[] }>("loadouts", "loadouts");
  return body.loadouts ?? [];
}

export async function getAttachments(): Promise<CardAttachment[]> {
  const body = await fetchGameJson<{ attachments: CardAttachment[] }>("attachments", "attachments");
  return body.attachments ?? [];
}
