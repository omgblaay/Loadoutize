import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { projectId } from "../../../utils/supabase/info";
import { useAuth } from "./AuthContext";
import { AppLayout } from "./AppLayout";
import { getGameColor } from "../utils/gameColors";
import { gameMeta, GAME_ORDER, GAME_SELECTOR_ENABLED, LOCKED_GAME_ID } from "../utils/games";
import { LoadoutCard, type CardLoadout, type CardWeapon, type CardAttachment, type CardTag } from "./ui/LoadoutCard";
import { Skeleton } from "./ui/skeleton";
import { cn } from "./ui/utils";
import { usePageTitle } from "../hooks/usePageTitle";
import { explorePath } from "../utils/routes";

interface Loadout extends CardLoadout {
  gameId: string;
  createdAt: string;
  liked: boolean;
}

interface GameCatalog {
  weapons: CardWeapon[];
  attachments: CardAttachment[];
  tags: CardTag[];
}

const GAMES_TO_LOAD = GAME_SELECTOR_ENABLED ? GAME_ORDER : [LOCKED_GAME_ID];

function LikedLoadoutsSkeleton() {
  const block = "bg-white/[0.06]";

  return (
    <div className="flex flex-col gap-4">
      <Skeleton className={cn("h-8 w-48", block)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={cn("rounded-2xl h-[220px]", block)} />
        ))}
      </div>
    </div>
  );
}

export function LikedLoadouts() {
  usePageTitle("Liked Loadouts • Loadoutize");

  const navigate = useNavigate();
  const { user, accessToken, loading: authLoading } = useAuth();
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [catalogs, setCatalogs] = useState<Record<string, GameCatalog>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/home");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!accessToken) return;
    fetchLikedLoadouts(accessToken);
  }, [accessToken]);

  const fetchLikedLoadouts = async (token: string) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        GAMES_TO_LOAD.map(async (gameId) => {
          const [loadoutsRes, weaponsRes, attachmentsRes, tagsRes] = await Promise.all([
            fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json()),
            fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/weapons`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json()),
            fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/attachments`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json()),
            fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/tags`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json()),
          ]);
          return {
            gameId,
            loadouts: ((loadoutsRes.loadouts ?? []) as Loadout[]).filter((l) => l.liked),
            catalog: {
              weapons: weaponsRes.weapons ?? [],
              attachments: attachmentsRes.attachments ?? [],
              tags: tagsRes.tags ?? [],
            } as GameCatalog,
          };
        })
      );

      setLoadouts(
        results
          .flatMap((r) => r.loadouts)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
      setCatalogs(Object.fromEntries(results.map((r) => [r.gameId, r.catalog])));
    } catch (error) {
      console.error("Error fetching liked loadouts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout selectedGame={LOCKED_GAME_ID} onGameSelect={(id) => navigate(explorePath(id))}>
        <LikedLoadoutsSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout selectedGame={LOCKED_GAME_ID} onGameSelect={(id) => navigate(explorePath(id))}>
      <div className="flex flex-col gap-4">
        <h1 className="text-[24px] leading-[32px] text-[#efedf1] font-semibold">Liked Loadouts</h1>
        {loadouts.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
            <p className="text-[#8d898a]">You haven't liked any loadouts yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {loadouts.map((l, i) => {
              const catalog = catalogs[l.gameId];
              const meta = gameMeta[l.gameId] ?? gameMeta.mw4;
              const accent = getGameColor(l.gameId).primary;
              return (
                <LoadoutCard
                  key={l.id}
                  loadout={l}
                  weapons={catalog?.weapons ?? []}
                  attachments={catalog?.attachments ?? []}
                  tags={catalog?.tags ?? []}
                  accent={accent}
                  gameShort={meta.short}
                  index={i}
                  to={`/${l.gameId}/l/${l.id}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
