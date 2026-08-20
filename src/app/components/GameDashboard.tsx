import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { getGameColor } from "../utils/gameColors";
import { gameMeta } from "../utils/games";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { AppLayout } from "./AppLayout";
import { LoadoutCard, type CardLoadout, type CardWeapon } from "./LoadoutCard";
import { Search, SlidersHorizontal, ArrowUpDown, ChevronDown, X } from "lucide-react";
import { SideNav } from "./ui/sidenav";
import { SearchBar } from "./ui/searchbar";

interface Loadout extends CardLoadout {
  gameId: string;
  createdAt: string;
}

type SortMode = "likes" | "newest";

export function GameDashboard() {
  const { gameId = "blackops7" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [weapons, setWeapons] = useState<CardWeapon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("likes");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) setActiveCategory(categoryParam);
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setLoadouts(data.loadouts ?? []))
      .catch((error) => console.error("Error fetching loadouts:", error))
      .finally(() => setLoading(false));

    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/weapons`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setWeapons(data.weapons ?? []))
      .catch((error) => console.error("Error fetching weapons:", error));
  }, [gameId]);

  const accent = getGameColor(gameId).primary;
  const meta = gameMeta[gameId] ?? gameMeta.blackops7;
  const categories = Array.from(
    new Set(weapons.map((w) => w.type).filter((t): t is string => Boolean(t)))
  ).slice(0, 6);

  const weaponTypeByName = new Map(weapons.map((w) => [w.name, w.type]));

  const filtered = loadouts.filter((l) => {
    if (activeCategory) {
      const matchesCategory = (l.weapons ?? []).some(
        (w: any) => weaponTypeByName.get(w?.name) === activeCategory
      );
      if (!matchesCategory) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const haystack = [l.name, l.userName, l.description, ...(l.weapons ?? []).map((w: any) => w?.name)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    sortMode === "likes"
      ? b.likes - a.likes
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const hasActiveFilters = Boolean(activeCategory || searchQuery.trim());
  const clearFilters = () => {
    setActiveCategory(null);
    setSearchQuery("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0909]">
        <div className="text-[#efedf1]">Loading…</div>
      </div>
    );
  }

  return (
    <AppLayout selectedGame={gameId} onGameSelect={(id) => navigate(`/${id}/explore`)}>
      {/* Header: title + search */}
      <div className="flex items-center gap-5 w-full flex-wrap">
        <h1
          className="text-3xl font-semibold bg-clip-text shrink-0"
        >
          Explore
        </h1>
        <SearchBar isExplore={false} value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Filter / sort row */}
      <div className="flex items-center gap-3 w-full flex-wrap">
        <div className="flex-1 flex items-center gap-3 flex-wrap min-w-0">
          <button className="h-10 px-3.5 rounded-xl border border-white/[0.18] flex items-center gap-2 text-[#fafafa]">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-[14px] text-[#ef9696]">
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
                  { id: "likes", label: "Most liked" },
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
                    sortMode === opt.id ? "text-[#f8f7f9]" : "text-[#aea6a8]"
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
        <div className="flex items-center gap-1 flex-wrap">
          {categories.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(active ? null : cat)}
                className={`h-8 px-3 rounded-xl text-[14px] ${
                  active ? "bg-[#2a2829] text-[#fafafa]" : "text-[#8d898a] hover:text-[#fafafa]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Loadout grid */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
          <p className="text-[#8d898a]">
            {loadouts.length === 0
              ? `No loadouts published for ${meta.name} yet. Be the first to create one!`
              : "No loadouts match your filters."}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-[14px]" style={{ color: accent }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {sorted.map((l, i) => (
            <LoadoutCard
              key={l.id}
              loadout={l}
              weapons={weapons}
              accent={accent}
              gameShort={meta.short}
              index={i}
              onClick={() => navigate(`/${gameId}/loadout/${l.id}`)}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
