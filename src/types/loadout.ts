import type { LoadoutVideo } from "@/lib/video";

export interface CardLoadout {
  id: string;
  gameId: string;
  name: string;
  description?: string;
  weapons: any[];
  userName: string;
  likes: number;
  score: number;
  ratingPercent: number | null;
  views: number;
  tagId?: number | null;
  video?: LoadoutVideo | null;
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
