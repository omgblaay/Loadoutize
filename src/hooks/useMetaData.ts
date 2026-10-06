import { useEffect, useState } from "react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

export interface MetaWeapon {
  id: string;
  name: string;
  type: string | null;
  typeShort: string | null;
  imageUrl: string | null;
}

export interface MetaLoadout {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  weapons: {
    id: string;
    attachments?: Record<string, string>;
  }[];
  tagId: number | null;
  ratingPercent: number | null;
  likes: number;
  dislikes: number;
  score: number;
}

export interface MetaAttachment {
  id: string;
  name: string;
  type: string;
  typeSlug: string;
  typeImageUrl: string | null;
  imageUrl: string | null;
}

export interface MetaTag {
  id: number;
  name: string;
  color: string;
}

interface MetaData {
  loadouts: MetaLoadout[];
  weapons: MetaWeapon[];
  attachments: MetaAttachment[];
  tags: MetaTag[];
}

const EMPTY_META_DATA: MetaData = {
  loadouts: [],
  weapons: [],
  attachments: [],
  tags: [],
};

export function useMetaData(gameId: string) {
  const [data, setData] = useState<MetaData>(EMPTY_META_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}`;
    const headers = { Authorization: `Bearer ${publicAnonKey}` };

    const getJson = async (path: string) => {
      const response = await fetch(`${baseUrl}/${path}`, {
        headers,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Could not load ${path}`);
      return response.json();
    };

    setLoading(true);
    setError(null);
    Promise.all([
      getJson("loadouts"),
      getJson("weapons"),
      getJson("attachments"),
      getJson("tags"),
    ])
      .then(([loadoutsData, weaponsData, attachmentsData, tagsData]) => {
        setData({
          loadouts: loadoutsData.loadouts ?? [],
          weapons: weaponsData.weapons ?? [],
          attachments: attachmentsData.attachments ?? [],
          tags: tagsData.tags ?? [],
        });
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        console.error("Error fetching Meta dashboard data:", requestError);
        setError("Meta data could not be loaded. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [gameId]);

  return { ...data, loading, error };
}
