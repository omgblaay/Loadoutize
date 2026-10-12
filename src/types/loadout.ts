import type { LoadoutVideo } from "@/lib/video";
import type { SocialLinks } from "@/lib/social";

export interface CardLoadout {
  id: string;
  gameId: string;
  name: string;
  description?: string;
  contentType?: "full_loadout" | "weapon_config";
  weapons: LoadoutWeapon[];
  perks?: string[];
  equipment?: LoadoutEquipment[];
  userName: string;
  authorNickname?: string | null;
  authorLinks?: SocialLinks | null;
  likes: number;
  dislikes: number;
  score: number;
  ratingPercent: number | null;
  views: number;
  tagId?: number | null;
  video?: LoadoutVideo | null;
}

export type LoadoutWeaponSlot = "primary" | "secondary" | "melee";
export type LoadoutEquipmentSlot =
  | "throwable"
  | "tactical"
  | "field_upgrade";

export interface LoadoutWeapon {
  id: string;
  slot?: LoadoutWeaponSlot;
  attachments?: Record<string, string>;
}

export interface LoadoutEquipment {
  name: string;
  slot: LoadoutEquipmentSlot;
  isAny?: boolean;
}

export interface CardWeapon {
  id: string;
  name: string;
  type: string | null;
  typeShort?: string | null;
  imageUrl?: string | null;
}

export interface CardAttachment {
  id: string;
  name: string;
  type: string | null;
  typeSlug?: string | null;
  imageUrl?: string | null;
}

export interface CardTag {
  id: number;
  name: string;
  color: string;
}

export interface Loadout extends CardLoadout {
  createdAt: string;
}
