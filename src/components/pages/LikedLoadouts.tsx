import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { useAuth } from "@/providers/AuthProvider";
import { AppLayout } from "@/components/templates/AppLayout";
import { getGameColor } from "@/lib/gameColors";
import { gameMeta, GAME_ORDER, GAME_SELECTOR_ENABLED, LOCKED_GAME_ID } from "@/lib/games";
import { LoadoutCard } from "@/components/organisms/LoadoutCard";
import type { CardLoadout, CardWeapon, CardAttachment, CardTag } from "@/types/loadout";
import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { explorePath } from "@/lib/routes";

interface Loadout extends CardLoadout {
  gameId: string;
  createdAt: string;
  liked: boolean;
  likedAt?: string | null;
}

interface GameCatalog {
  weapons: CardWeapon[];
  attachments: CardAttachment[];
  tags: CardTag[];
}

const GAMES_TO_LOAD = GAME_SELECTOR_ENABLED ? GAME_ORDER : [LOCKED_GAME_ID];
const SUPABASE_ORIGIN = `https://${projectId}.supabase.co`;

interface DayGroup {
  key: string;
  dayNumber: string;
  weekday: string;
  loadouts: Loadout[];
}

interface MonthGroup {
  key: string;
  label: string;
  days: DayGroup[];
}

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const dayFormatter = new Intl.DateTimeFormat(undefined, { day: "2-digit" });

function likedDate(loadout: Loadout) {
  const date = new Date(loadout.likedAt ?? loadout.createdAt);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function groupLoadoutsByDate(loadouts: Loadout[]): MonthGroup[] {
  const months = new Map<string, MonthGroup>();

  for (const loadout of loadouts) {
    const date = likedDate(loadout);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const dayKey = `${monthKey}-${String(date.getDate()).padStart(2, "0")}`;

    let month = months.get(monthKey);
    if (!month) {
      month = { key: monthKey, label: monthFormatter.format(date), days: [] };
      months.set(monthKey, month);
    }

    let day = month.days.find((group) => group.key === dayKey);
    if (!day) {
      day = {
        key: dayKey,
        dayNumber: dayFormatter.format(date),
        weekday: weekdayFormatter.format(date),
        loadouts: [],
      };
      month.days.push(day);
    }
    day.loadouts.push(loadout);
  }

  return [...months.values()];
}

async function hydrateLikedDates(loadouts: Loadout[], token: string, userId: string) {
  const missingDates = loadouts.filter((loadout) => !loadout.likedAt);
  if (missingDates.length === 0) return loadouts;

  const params = new URLSearchParams({
    select: "loadout_id,created_at",
    type: "eq.like",
    user_id: `eq.${userId}`,
    loadout_id: `in.(${missingDates.map((loadout) => loadout.id).join(",")})`,
  });
  const response = await fetch(`${SUPABASE_ORIGIN}/rest/v1/loadout_reactions?${params}`, {
    headers: {
      apikey: publicAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error(`Could not load liked dates (${response.status})`);

  const reactions = (await response.json()) as { loadout_id: string; created_at: string }[];
  const likedAtByLoadout = new Map(reactions.map((reaction) => [reaction.loadout_id, reaction.created_at]));
  return loadouts.map((loadout) => ({
    ...loadout,
    likedAt: loadout.likedAt ?? likedAtByLoadout.get(loadout.id) ?? null,
  }));
}

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
  const groupedLoadouts = useMemo(() => groupLoadoutsByDate(loadouts), [loadouts]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/home");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!accessToken || !user?.id) return;
    fetchLikedLoadouts(accessToken, user.id);
  }, [accessToken, user?.id]);

  const fetchLikedLoadouts = async (token: string, userId: string) => {
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

      const likedLoadouts = results.flatMap((result) => result.loadouts);
      let datedLoadouts = likedLoadouts;
      try {
        datedLoadouts = await hydrateLikedDates(likedLoadouts, token, userId);
      } catch (error) {
        console.error("Error fetching liked dates:", error);
      }

      setLoadouts(datedLoadouts.sort((a, b) => likedDate(b).getTime() - likedDate(a).getTime()));
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
          <div className="flex flex-col gap-10">
            {groupedLoadouts.map((month) => (
              <section key={month.key} className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-[#efedf1]">{month.label}</h2>
                  <div className="h-px flex-1 bg-white/[0.08]" />
                </div>

                <div className="flex flex-col gap-8">
                  {month.days.map((day) => (
                    <section key={day.key} className="flex flex-col gap-3">
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-2xl leading-none text-[#efedf1]">{day.dayNumber}</span>
                        <h3 className="text-sm font-medium capitalize text-[#8d898a]">{day.weekday}</h3>
                        <span className="text-xs font-mono text-teritary">
                          {day.loadouts.length} loadout{day.loadouts.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        {day.loadouts.map((loadout, index) => {
                          const catalog = catalogs[loadout.gameId];
                          const meta = gameMeta[loadout.gameId] ?? gameMeta.mw4;
                          const accent = getGameColor(loadout.gameId).primary;
                          return (
                            <LoadoutCard
                              key={loadout.id}
                              loadout={loadout}
                              weapons={catalog?.weapons ?? []}
                              attachments={catalog?.attachments ?? []}
                              tags={catalog?.tags ?? []}
                              accent={accent}
                              gameShort={meta.short}
                              index={index}
                              to={`/${loadout.gameId}/l/${loadout.id}`}
                            />
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
