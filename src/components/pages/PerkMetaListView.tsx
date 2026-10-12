import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Search, Shield } from "lucide-react";
import { AppLayout } from "@/components/templates/AppLayout";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { RatingRing } from "@/components/atoms/RatingRing";
import { Skeleton } from "@/components/atoms/Skeleton";
import { useMetaData, type MetaPerk } from "@/hooks/useMetaData";
import { MIN_RATING_VOTES } from "@/lib/metaMetrics";
import { perkMetaListPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface PerkMetric {
  perk: MetaPerk;
  count: number;
  share: number;
  avgRating: number | null;
}

const SLOT_LABELS: Record<string, string> = {
  perk_1: "Perk 1",
  perk_2: "Perk 2",
  perk_3: "Perk 3",
};

const SLOT_ORDER: Record<string, number> = {
  perk_1: 1,
  perk_2: 2,
  perk_3: 3,
};

function PerkListSkeleton() {
  const block = "bg-white/[0.06]";
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className={cn("h-9 w-52", block)} />
        <Skeleton className={cn("h-4 w-96 max-w-full", block)} />
      </div>
      <Skeleton className={cn("h-[52px] w-full rounded-xl", block)} />
      <Skeleton className={cn("h-[520px] w-full rounded-2xl", block)} />
    </>
  );
}

export function PerkMetaListView() {
  const { gameId = "mw4" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { loadouts, perks, loading, error } = useMetaData(gameId);

  const perkMetrics = useMemo<PerkMetric[]>(() => {
    const fullLoadouts = loadouts.filter(
      (loadout) => loadout.contentType === "full_loadout",
    );

    return perks
      .map((perk) => {
        const matchingLoadouts = fullLoadouts.filter((loadout) =>
          (loadout.perks ?? []).includes(perk.name),
        );
        const ratedLoadouts = matchingLoadouts.filter(
          (loadout) =>
            loadout.ratingPercent != null &&
            loadout.likes + loadout.dislikes >= MIN_RATING_VOTES,
        );
        const avgRating =
          ratedLoadouts.length > 0
            ? Math.round(
                ratedLoadouts.reduce(
                  (sum, loadout) => sum + (loadout.ratingPercent as number),
                  0,
                ) / ratedLoadouts.length,
              )
            : null;

        return {
          perk,
          count: matchingLoadouts.length,
          share:
            fullLoadouts.length > 0
              ? (matchingLoadouts.length / fullLoadouts.length) * 100
              : 0,
          avgRating,
        };
      })
      .sort(
        (a, b) =>
          (b.avgRating ?? -1) - (a.avgRating ?? -1) ||
          b.count - a.count ||
          (SLOT_ORDER[a.perk.slot ?? ""] ?? 99) -
            (SLOT_ORDER[b.perk.slot ?? ""] ?? 99) ||
          a.perk.displayOrder - b.perk.displayOrder ||
          a.perk.name.localeCompare(b.perk.name),
      );
  }, [loadouts, perks]);

  const filteredMetrics = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return perkMetrics;
    return perkMetrics.filter(({ perk }) =>
      [perk.name, perk.description, SLOT_LABELS[perk.slot ?? ""]].some(
        (value) => value?.toLowerCase().includes(query),
      ),
    );
  }, [perkMetrics, search]);

  if (loading) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(perkMetaListPath(id))}
      >
        <PerkListSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedGame={gameId}
      onGameSelect={(id) => navigate(perkMetaListPath(id))}
    >
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/${gameId}/meta`)}
        >
          <ArrowLeft className="size-4" />
          Meta dashboard
        </Button>
      </div>

      <header className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
          <Shield className="size-5 text-teritary" />
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl uppercase sm:text-4xl">Perk breakdown</h1>
          <p className="mt-2 text-sm text-teritary">
            Compare every perk by group, full-loadout usage, and qualified
            community rating.
          </p>
        </div>
      </header>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search perks or perk groups..."
        aria-label="Search perks"
        icon={<Search className="size-5 text-teritary" />}
      />

      {error ? (
        <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-12 text-center text-secondary">
          {error}
        </div>
      ) : filteredMetrics.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center text-secondary">
          {search ? `No perks match “${search}”.` : "No perks are available."}
        </div>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[3rem_minmax(240px,1.5fr)_minmax(120px,0.7fr)_7rem_7rem] items-center gap-4 border-b border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[11px] uppercase tracking-[0.08em] text-teritary">
              <span>Rank</span>
              <span>Perk</span>
              <span>Group</span>
              <span>Usage</span>
              <span className="text-center">Avg. rating</span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {filteredMetrics.map((metric) => {
                const rank =
                  perkMetrics.findIndex(
                    (candidate) => candidate.perk.id === metric.perk.id,
                  ) + 1;
                return (
                  <div
                    key={metric.perk.id}
                    className="grid grid-cols-[3rem_minmax(240px,1.5fr)_minmax(120px,0.7fr)_7rem_7rem] items-center gap-4 px-5 py-4"
                  >
                    <span className="font-mono text-xs text-teritary">
                      #{rank}
                    </span>
                    <span className="flex min-w-0 items-center gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-black/20 p-2">
                        {metric.perk.imageUrl ? (
                          <img
                            src={metric.perk.imageUrl}
                            alt=""
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <Shield className="size-4 text-white/20" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-sm uppercase">
                          {metric.perk.name}
                        </span>
                        {metric.perk.description && (
                          <span className="mt-0.5 block truncate text-xs text-teritary">
                            {metric.perk.description}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="text-sm text-secondary">
                      {SLOT_LABELS[metric.perk.slot ?? ""] ?? "Unassigned"}
                    </span>
                    <span>
                      <span className="block font-mono text-sm">
                        {Math.round(metric.share)}%
                      </span>
                      <span className="text-xs text-teritary">
                        {metric.count} loadout{metric.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="flex justify-center">
                      <RatingRing
                        percent={metric.avgRating}
                        size={42}
                        fallbackLabel="—"
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </AppLayout>
  );
}
