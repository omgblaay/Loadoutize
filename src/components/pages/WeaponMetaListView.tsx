import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, ChevronRight, Search } from "lucide-react";
import { AppLayout } from "@/components/templates/AppLayout";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { RatingRing } from "@/components/atoms/RatingRing";
import { Skeleton } from "@/components/atoms/Skeleton";
import { WeaponImage } from "@/components/molecules/WeaponImage";
import { useMetaData } from "@/hooks/useMetaData";
import { buildWeaponMetrics } from "@/lib/metaMetrics";
import { sortWeaponCategories } from "@/lib/weaponCategories";
import { weaponMetaListPath, weaponMetaPath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { FilterPill, FilterPillGroup } from "@/components/molecules/FilterPill";

type SortKey = "rank" | "weapon" | "type" | "usage" | "rating";

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
  const { gameId = "mw4" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { loadouts, weapons, loading, error } = useMetaData(gameId);
  const categories = useMemo(
    () =>
      sortWeaponCategories(
        weapons
          .map((weapon) => weapon.type)
          .filter((type): type is string => Boolean(type)),
      ),
    [weapons],
  );
  const categoryShortNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const weapon of weapons) {
      if (!weapon.type || names.has(weapon.type)) continue;
      names.set(
        weapon.type,
        weapon.typeShort?.trim() || weapon.type.slice(0, 3).toUpperCase(),
      );
    }
    return names;
  }, [weapons]);
  const requestedCategory = searchParams.get("category");
  const selectedCategory = requestedCategory && categories.includes(requestedCategory)
    ? requestedCategory
    : "all";
  const weaponMetrics = useMemo(
    () => buildWeaponMetrics(weapons, loadouts, true),
    [weapons, loadouts],
  );
  const filteredMetrics = useMemo(() => {
    const query = search.trim().toLowerCase();
    return weaponMetrics.filter(
      ({ weapon }) =>
        (selectedCategory === "all" || weapon.type === selectedCategory) &&
        (!query ||
          [weapon.name, weapon.type, weapon.typeShort].some((value) =>
            value?.toLowerCase().includes(query),
          )),
    );
  }, [search, selectedCategory, weaponMetrics]);
  const rankedIds = useMemo(
    () => new Map(weaponMetrics.map((metric, index) => [metric.weapon.id, index + 1])),
    [weaponMetrics],
  );
  const displayedMetrics = useMemo(() => {
    const value = (metric: (typeof weaponMetrics)[number]): string | number => {
      switch (sortKey) {
        case "rank": return rankedIds.get(metric.weapon.id) ?? 0;
        case "weapon": return metric.weapon.name;
        case "type": return metric.weapon.type ?? "";
        case "usage": return metric.count;
        case "rating": return metric.avgRating ?? -1;
      }
    };
    return [...filteredMetrics].sort((a, b) => {
      const aValue = value(a);
      const bValue = value(b);
      const comparison = typeof aValue === "string" && typeof bValue === "string"
        ? aValue.localeCompare(bValue)
        : Number(aValue) - Number(bValue);
      return (sortDirection === "asc" ? 1 : -1) * comparison ||
        (rankedIds.get(a.weapon.id) ?? 0) - (rankedIds.get(b.weapon.id) ?? 0);
    });
  }, [filteredMetrics, rankedIds, sortDirection, sortKey, weaponMetrics]);
  const changeSort = (key: SortKey) => {
    if (key === sortKey) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDirection(key === "usage" || key === "rating" ? "desc" : "asc");
    }
  };
  const sortHeader = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => changeSort(key)}
      aria-label={`Sort by ${label}`}
      className="inline-flex items-center gap-1 text-left hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      {label}
      {sortKey === key
        ? sortDirection === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
        : <ArrowUpDown className="size-3 opacity-50" />}
    </button>
  );

  if (loading) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(weaponMetaListPath(id, requestedCategory ?? undefined))}
      >
        <WeaponListSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedGame={gameId}
      onGameSelect={(id) => navigate(weaponMetaListPath(id, requestedCategory ?? undefined))}
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

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl uppercase sm:text-4xl">
          Weapon breakdown
        </h1>
        <p className="text-sm text-teritary">
          Search and compare every weapon by type, loadout usage, and qualified community rating.
        </p>
      </header>

      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 lg:w-72 lg:shrink-0">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search weapons or weapon types..."
            aria-label="Search weapons"
            icon={<Search className="size-5 text-teritary" />}
          />
        </div>
        {categories.length > 0 && (
          <div className="min-w-0 overflow-x-auto">
            <FilterPillGroup
              type="single"
              value={selectedCategory}
              onValueChange={(value) => {
                const next = new URLSearchParams(searchParams);
                if (!value || value === "all") next.delete("category");
                else next.set("category", value);
                setSearchParams(next, { replace: true });
              }}
              aria-label="Weapon category"
              className="w-max flex-nowrap"
            >
              <FilterPill value="all" size="sm">All</FilterPill>
              {categories.map((category) => (
                <FilterPill
                  key={category}
                  value={category}
                  size="sm"
                  aria-label={category}
                  title={category}
                >
                  {categoryShortNames.get(category)}
                </FilterPill>
              ))}
            </FilterPillGroup>
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-12 text-center text-secondary">
          {error}
        </div>
      ) : filteredMetrics.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center text-secondary">
          No weapons match your search or category.
        </div>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[3rem_minmax(300px,1.5fr)_minmax(140px,0.8fr)_7rem_7rem_2rem] items-center gap-4 border-b border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[11px] uppercase tracking-[0.08em] text-teritary">
              {sortHeader("rank", "Rank")}
              {sortHeader("weapon", "Weapon")}
              {sortHeader("type", "Type")}
              {sortHeader("usage", "Usage")}
              <span className="flex justify-center">{sortHeader("rating", "Avg. rating")}</span>
              <span />
            </div>
            <div className="divide-y divide-white/[0.06]">
              {displayedMetrics.map((metric) => {
                const rank = rankedIds.get(metric.weapon.id);
                return (
                  <button
                    key={metric.weapon.id}
                    type="button"
                    onClick={() =>
                      navigate(weaponMetaPath(gameId, String(metric.weapon.id)))
                    }
                    className="group grid w-full grid-cols-[3rem_minmax(300px,1.5fr)_minmax(140px,0.8fr)_7rem_7rem_2rem] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.035]"
                  >
                    <span className="font-mono text-xs text-teritary">
                      #{rank}
                    </span>
                    <span className="flex min-w-0 items-center gap-4">
                      <span className="w-36 shrink-0">
                        <WeaponImage
                          imageUrl={metric.weapon.imageUrl}
                          alt={metric.weapon.name}
                        />
                      </span>
                      <span className="truncate font-mono text-sm uppercase ">
                        {metric.weapon.name}
                      </span>
                    </span>
                    <span className="truncate text-sm text-secondary">
                      {metric.weapon.type ?? "Unclassified"}
                    </span>
                    <span>
                      <span className="block font-mono text-sm ">
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
