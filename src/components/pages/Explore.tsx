import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { getGameColor } from "@/lib/gameColors";
import { gameMeta, GAME_SELECTOR_ENABLED, LAST_SELECTED_GAME_KEY, LOCKED_GAME_ID } from "@/lib/games";
import { explorePath } from "@/lib/routes";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { AppLayout } from "@/components/templates/AppLayout";
import { useGameName } from "@/hooks/useGameName";
import { LoadoutCard } from "@/components/organisms/LoadoutCard";
import type { CardLoadout, CardWeapon, CardAttachment, CardTag } from "@/types/loadout";
import { SlidersHorizontal, ArrowUpDown, ChevronDown, X, Globe } from "lucide-react";
import { SearchBar } from "@/components/molecules/SearchBar";
import { NavIcon } from "@/components/atoms/NavIcon";
import { FilterPill, FilterPillGroup } from "@/components/molecules/FilterPill";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils";
import { CompactPageHeader } from "@/components/molecules/CompactPageHeader";
import { Button } from "@/components/atoms/Button";

interface Loadout extends CardLoadout {
  gameId: string;
  createdAt: string;
}

type SortMode = "likes" | "newest";

function ExploreSkeleton() {
  const block = "bg-white/[0.06]";

  return (
    <>
      {/* Header: title + search */}
      <div className="flex items-center gap-5 w-full flex-wrap">
        <Skeleton className={cn("h-9 w-32 shrink-0", block)} />
        <Skeleton className={cn("h-10 flex-1 min-w-[200px] rounded-xl", block)} />
      </div>

      {/* Filter / sort row */}
      <div className="flex items-center gap-3 w-full flex-wrap">
        <Skeleton className={cn("h-10 w-24 rounded-xl", block)} />
        <Skeleton className={cn("h-10 w-28 rounded-xl ml-auto", block)} />
      </div>

      {/* Category filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={cn("h-8 w-20 rounded-full", block)} />
        ))}
      </div>

      {/* Loadout grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={cn("rounded-2xl h-[220px]", block)} />
        ))}
      </div>
    </>
  );
}

export function Explore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedGame = (() => {
    if (!GAME_SELECTOR_ENABLED) return LOCKED_GAME_ID;
    const requestedGame = searchParams.get("game");
    if (requestedGame) return requestedGame;
    try {
      return localStorage.getItem(LAST_SELECTED_GAME_KEY) || LOCKED_GAME_ID;
    } catch {
      return LOCKED_GAME_ID;
    }
  })();

  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [weapons, setWeapons] = useState<CardWeapon[]>([]);
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [tags, setTags] = useState<CardTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("likes");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    setActiveCategory(categoryParam);
  }, [searchParams]);

  useEffect(() => {
    if (!GAME_SELECTOR_ENABLED) return;
    try {
      localStorage.setItem(LAST_SELECTED_GAME_KEY, selectedGame);
    } catch {
      // localStorage may be unavailable (e.g. private browsing).
    }
  }, [selectedGame]);

  useEffect(() => {
    setLoading(true);
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/loadouts`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setLoadouts(data.loadouts ?? []))
      .catch((error) => console.error("Error fetching loadouts:", error))
      .finally(() => setLoading(false));

    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/weapons`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setWeapons(data.weapons ?? []))
      .catch((error) => console.error("Error fetching weapons:", error));

    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/attachments`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setAttachments(data.attachments ?? []))
      .catch((error) => console.error("Error fetching attachments:", error));

    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/tags`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setTags(data.tags ?? []))
      .catch((error) => console.error("Error fetching tags:", error));
  }, [selectedGame]);

  const accent = getGameColor(selectedGame).primary;
  const meta = gameMeta[selectedGame] ?? gameMeta.blackops7;
  const { name: gameName } = useGameName(selectedGame);
  usePageTitle(`Explore • Loadoutize • ${gameName}`);
  const categories = Array.from(
    new Set(weapons.map((w) => w.type).filter((t): t is string => Boolean(t)))
  ).slice(0, 6);

  const weaponById = new Map(weapons.map((w) => [w.id, w]));

  const filtered = loadouts.filter((l) => {
    if (activeCategory) {
      const matchesCategory = (l.weapons ?? []).some(
        (w: any) => weaponById.get(w?.id)?.type === activeCategory
      );
      if (!matchesCategory) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const haystack = [
        l.name,
        l.userName,
        l.description,
        ...(l.weapons ?? []).map((w: any) => weaponById.get(w?.id)?.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    sortMode === "likes"
      ? b.score - a.score
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const hasActiveFilters = Boolean(activeCategory || searchQuery.trim());
  const clearFilters = () => {
    setActiveCategory(null);
    setSearchQuery("");
  };

  if (loading) {
    return (
      <AppLayout selectedGame={selectedGame} onGameSelect={(id) => navigate(explorePath(id))}>
        <ExploreSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout selectedGame={selectedGame} onGameSelect={(id) => navigate(explorePath(id))}>
      {/* Header: title + search */}
      <div className="flex items-center gap-5 w-full flex-wrap">
        <h1
          className="text-3xl font-semibold bg-clip-text shrink-0 flex items-center gap-3"
        >
          <NavIcon icon="explore" flat={<Globe className="w-7 h-7" />} active hovered={false} size={32} />
          Explore
        </h1>
        <SearchBar isExplore={false} value={searchQuery} onChange={setSearchQuery} />
      </div>
      <CompactPageHeader
        title={
          <span className="flex items-center gap-2">
            <NavIcon icon="explore" flat={<Globe className="w-4 h-4" />} active hovered={false} size={18} />
            Explore
          </span>
        }
      />

      {/* Filter / sort row */}
      <div className="flex items-center gap-3 w-full flex-wrap">
        <div className="flex-1 flex items-center gap-3 flex-wrap min-w-0">
          <Button variant="outline">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </Button>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="text-destructive hover:text-red-500">
              Clear filters
            </button>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setSortMenuOpen((v) => !v)}
            className="h-10 px-3.5 rounded-xl border border-white/[0.18] flex items-center gap-2 text-[#fafafa]"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span>Sort by</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {sortMenuOpen && (
            <div className="absolute top-[calc(100%+8px)] right-0 w-44 rounded-xl border border-white/10 bg-[#161415] shadow-2xl overflow-hidden z-50">
              {(
                [
                  { id: "likes", label: "Top" },
                  { id: "newest", label: "Newest" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSortMode(opt.id);
                    setSortMenuOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 text-left hover:bg-white/5 ${
                    sortMode === opt.id ? "text-primary" : "text-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <FilterPillGroup
          type="single"
          value={activeCategory ?? ""}
          onValueChange={(v) => setActiveCategory(v || null)}
        >
          {categories.map((cat) => (
            <FilterPill key={cat} value={cat} size="sm">
              {cat}
            </FilterPill>
          ))}
        </FilterPillGroup>
      )}

      {/* Loadout grid */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
          <p className="text-[#8d898a]">
            {loadouts.length === 0
              ? `No loadouts published for ${gameName} yet. Be the first to create one!`
              : "No loadouts match your filters."}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-[14px] text-[#fafafa]">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
          {sorted.map((l, i) => (
            <LoadoutCard
              key={l.id}
              loadout={l}
              weapons={weapons}
              attachments={attachments}
              tags={tags}
              accent={accent}
              gameShort={meta.short}
              index={i}
              to={`/${selectedGame}/l/${l.id}`}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
