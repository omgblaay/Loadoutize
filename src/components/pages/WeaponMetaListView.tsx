import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { AppLayout } from "@/components/templates/AppLayout";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { RatingRing } from "@/components/atoms/RatingRing";
import { Skeleton } from "@/components/atoms/Skeleton";
import { WeaponImage } from "@/components/molecules/WeaponImage";
import { useMetaData } from "@/hooks/useMetaData";
import { buildWeaponMetrics } from "@/lib/metaMetrics";
import { weaponGroupMetaPath, weaponMetaPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

function WeaponListSkeleton() {
  const block = "bg-white/[0.06]";
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className={cn("h-9 w-52", block)} />
        <Skeleton className={cn("h-4 w-80 max-w-full", block)} />
      </div>
      <Skeleton className={cn("h-[52px] w-full rounded-xl", block)} />
      <Skeleton className={cn("h-[520px] w-full rounded-2xl", block)} />
    </>
  );
}

export function WeaponMetaListView() {
  const { gameId = "mw4", weaponGroup } = useParams<{
    gameId: string;
    weaponGroup?: string;
  }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { loadouts, weapons, loading, error } = useMetaData(gameId);
  const groupWeapons = useMemo(
    () =>
      weaponGroup
        ? weapons.filter((weapon) => weapon.type === weaponGroup)
        : weapons,
    [weaponGroup, weapons],
  );
  const weaponMetrics = useMemo(
    () => buildWeaponMetrics(groupWeapons, loadouts, true),
    [groupWeapons, loadouts],
  );
  const filteredMetrics = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return weaponMetrics;
    return weaponMetrics.filter(({ weapon }) =>
      [weapon.name, weapon.type, weapon.typeShort].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    );
  }, [search, weaponMetrics]);

  if (loading) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) =>
          navigate(
            weaponGroup
              ? weaponGroupMetaPath(id, weaponGroup)
              : `/${id}/meta/weapons`,
          )
        }
      >
        <WeaponListSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedGame={gameId}
      onGameSelect={(id) =>
        navigate(
          weaponGroup
            ? weaponGroupMetaPath(id, weaponGroup)
            : `/${id}/meta/weapons`,
        )
      }
    >
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/${gameId}/meta`)}>
          <ArrowLeft className="size-4" />
          Meta dashboard
        </Button>
      </div>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl uppercase sm:text-4xl">
          {weaponGroup ? `${weaponGroup} weapons` : "Weapon breakdown"}
        </h1>
        <p className="text-sm text-teritary">
          {weaponGroup
            ? `Search and compare every weapon in the ${weaponGroup} group.`
            : "Search and compare every weapon by type, loadout usage, and qualified community rating."}
        </p>
      </header>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search weapons or weapon types..."
        aria-label="Search weapons"
        icon={<Search className="size-5 text-teritary" />}
      />

      {error ? (
        <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-12 text-center text-secondary">
          {error}
        </div>
      ) : filteredMetrics.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center text-secondary">
          No weapons match “{search}”.
        </div>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[3rem_minmax(240px,1.5fr)_minmax(140px,0.8fr)_7rem_7rem_2rem] items-center gap-4 border-b border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[11px] uppercase tracking-[0.08em] text-teritary">
              <span>Rank</span>
              <span>Weapon</span>
              <span>Type</span>
              <span>Usage</span>
              <span className="text-center">Avg. rating</span>
              <span />
            </div>
            <div className="divide-y divide-white/[0.06]">
              {filteredMetrics.map((metric) => {
                const rank = weaponMetrics.findIndex(
                  (candidate) => candidate.weapon.id === metric.weapon.id,
                ) + 1;
                return (
                  <button
                    key={metric.weapon.id}
                    type="button"
                    onClick={() => navigate(weaponMetaPath(gameId, String(metric.weapon.id)))}
                    className="group grid w-full grid-cols-[3rem_minmax(240px,1.5fr)_minmax(140px,0.8fr)_7rem_7rem_2rem] items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-white/[0.035]"
                  >
                    <span className="font-mono text-xs text-teritary">#{rank}</span>
                    <span className="flex min-w-0 items-center gap-4">
                      <span className="w-24 shrink-0">
                        <WeaponImage imageUrl={metric.weapon.imageUrl} alt={metric.weapon.name} />
                      </span>
                      <span className="truncate font-mono text-sm uppercase text-[#fafafa]">
                        {metric.weapon.name}
                      </span>
                    </span>
                    <span className="truncate text-sm text-secondary">
                      {metric.weapon.type ?? "Unclassified"}
                    </span>
                    <span>
                      <span className="block font-mono text-sm text-[#fafafa]">
                        {Math.round(metric.share)}%
                      </span>
                      <span className="text-xs text-teritary">
                        {metric.count} loadout{metric.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="flex justify-center">
                      <RatingRing percent={metric.avgRating} size={42} fallbackLabel="—" />
                    </span>
                    <ChevronRight className="size-4 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </AppLayout>
  );
}
