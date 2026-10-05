import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { getGameColor } from "@/lib/gameColors";
import {
  gameMeta,
  GAME_SELECTOR_ENABLED,
  LAST_SELECTED_GAME_KEY,
  LOCKED_GAME_ID,
} from "@/lib/games";
import { explorePath } from "@/lib/routes";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { AppLayout } from "@/components/templates/AppLayout";
import { useGameName } from "@/hooks/useGameName";
import { LoadoutCard } from "@/components/organisms/LoadoutCard";
import type {
  CardLoadout,
  CardWeapon,
  CardAttachment,
  CardTag,
} from "@/types/loadout";
import {
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  X,
  Globe,
  Search,
} from "lucide-react";
import { SearchBar } from "@/components/molecules/SearchBar";
import { NavIcon } from "@/components/atoms/NavIcon";
import { FilterPill, FilterPillGroup } from "@/components/molecules/FilterPill";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils";
import { CompactPageHeader } from "@/components/molecules/CompactPageHeader";
import { Button } from "@/components/atoms/Button";
import { ResponsiveDialog } from "@/components/molecules/ResponsiveDialog";
import { Input } from "@/components/atoms/Input";

interface Loadout extends CardLoadout {
  gameId: string;
  createdAt: string;
}

type SortMode = "rating" | "published";

function ExploreSkeleton() {
  const block = "bg-white/[0.06]";

  return (
    <>
      {/* Header: title + search */}
      <div className="flex items-center gap-5 w-full flex-wrap">
        <Skeleton className={cn("h-9 w-32 shrink-0", block)} />
        <Skeleton
          className={cn("h-10 flex-1 min-w-[200px] rounded-xl", block)}
        />
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
  const [activeWeaponId, setActiveWeaponId] = useState<string | null>(null);
  const [activeTagId, setActiveTagId] = useState<number | null>(null);
  const [draftCategory, setDraftCategory] = useState<string | null>(null);
  const [draftWeaponId, setDraftWeaponId] = useState<string | null>(null);
  const [draftTagId, setDraftTagId] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false);
  const [weaponQuery, setWeaponQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("rating");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    setActiveCategory(categoryParam);
    if (categoryParam) setActiveWeaponId(null);
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
    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/loadouts`,
      {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      },
    )
      .then((r) => r.json())
      .then((data) => setLoadouts(data.loadouts ?? []))
      .catch((error) => console.error("Error fetching loadouts:", error))
      .finally(() => setLoading(false));

    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/weapons`,
      {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      },
    )
      .then((r) => r.json())
      .then((data) => setWeapons(data.weapons ?? []))
      .catch((error) => console.error("Error fetching weapons:", error));

    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/attachments`,
      {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      },
    )
      .then((r) => r.json())
      .then((data) => setAttachments(data.attachments ?? []))
      .catch((error) => console.error("Error fetching attachments:", error));

    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/tags`,
      {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      },
    )
      .then((r) => r.json())
      .then((data) => setTags(data.tags ?? []))
      .catch((error) => console.error("Error fetching tags:", error));
  }, [selectedGame]);

  const accent = getGameColor(selectedGame).primary;
  const meta = gameMeta[selectedGame] ?? gameMeta.blackops7;
  const { name: gameName } = useGameName(selectedGame);
  usePageTitle(`Explore • Loadoutize • ${gameName}`);
  const categories = Array.from(
    new Set(weapons.map((w) => w.type).filter((t): t is string => Boolean(t))),
  ).slice(0, 6);

  const weaponById = new Map(weapons.map((w) => [w.id, w]));
  const activeWeapon = activeWeaponId
    ? weaponById.get(activeWeaponId)
    : undefined;
  const draftWeapon = draftWeaponId ? weaponById.get(draftWeaponId) : undefined;
  const weaponOptions = weapons
    .filter((weapon) =>
      weapon.name.toLowerCase().includes(weaponQuery.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        (a.type ?? "").localeCompare(b.type ?? "") ||
        a.name.localeCompare(b.name),
    );

  const filtered = loadouts.filter((l) => {
    if (activeWeaponId) {
      const matchesWeapon = (l.weapons ?? []).some(
        (weapon: any) => weapon?.id === activeWeaponId,
      );
      if (!matchesWeapon) return false;
    } else if (activeCategory) {
      const matchesCategory = (l.weapons ?? []).some(
        (w: any) => weaponById.get(w?.id)?.type === activeCategory,
      );
      if (!matchesCategory) return false;
    }
    if (activeTagId != null && l.tagId !== activeTagId) return false;
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

  const sorted = [...filtered].sort((a, b) => {
    const publishedDifference =
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortMode === "published") return publishedDifference;
    return (
      (b.ratingPercent ?? -1) - (a.ratingPercent ?? -1) || publishedDifference
    );
  });

  const activeFilterCount =
    Number(Boolean(activeWeaponId || activeCategory)) +
    Number(activeTagId != null);
  const hasActiveFilters = Boolean(activeFilterCount || searchQuery.trim());
  const clearFilters = () => {
    setActiveCategory(null);
    setActiveWeaponId(null);
    setActiveTagId(null);
    setSearchQuery("");
  };
  const openFilters = () => {
    setDraftCategory(activeCategory);
    setDraftWeaponId(activeWeaponId);
    setDraftTagId(activeTagId);
    setFiltersOpen(true);
  };
  const applyFilters = () => {
    setActiveWeaponId(draftWeaponId);
    setActiveCategory(draftWeaponId ? null : draftCategory);
    setActiveTagId(draftTagId);
    setFiltersOpen(false);
  };
  const openWeaponPicker = () => {
    setWeaponQuery("");
    setFiltersOpen(false);
    setWeaponPickerOpen(true);
  };
  const selectWeapon = (weaponId: string) => {
    setDraftWeaponId(weaponId);
    setDraftCategory(null);
    setWeaponPickerOpen(false);
    setFiltersOpen(true);
  };

  if (loading) {
    return (
      <AppLayout
        selectedGame={selectedGame}
        onGameSelect={(id) => navigate(explorePath(id))}
      >
        <ExploreSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedGame={selectedGame}
      onGameSelect={(id) => navigate(explorePath(id))}
    >
      {/* Header: title + search */}
      <div className="flex items-center gap-5 w-full flex-wrap">
        <h1 className="text-3xl font-semibold bg-clip-text shrink-0 flex items-center gap-3">
          <NavIcon
            icon="explore"
            flat={<Globe className="w-7 h-7" />}
            active
            hovered={false}
            size={32}
          />
          Explore
        </h1>
        <SearchBar
          isExplore={false}
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>
      <CompactPageHeader
        title={
          <span className="flex items-center gap-2">
            <NavIcon
              icon="explore"
              flat={<Globe className="w-4 h-4" />}
              active
              hovered={false}
              size={18}
            />
            Explore
          </span>
        }
      />

      {/* Filter / sort row */}
      <div className="flex items-center gap-3 w-full flex-wrap">
        <div className="flex-1 flex items-center gap-3 flex-wrap min-w-0">
          <Button
            variant="outline"
            className="h-10 px-3.5"
            onClick={openFilters}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-white text-black text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-destructive hover:text-red-500"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setSortMenuOpen((v) => !v)}
            aria-expanded={sortMenuOpen}
            aria-haspopup="menu"
            className="h-10 px-3.5 rounded-xl border border-white/[0.18] flex items-center gap-2 text-[#fafafa]"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span>{sortMode === "rating" ? "Rating" : "Published date"}</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                sortMenuOpen && "rotate-180",
              )}
            />
          </button>
          {sortMenuOpen && (
            <div
              role="menu"
              className="absolute top-[calc(100%+8px)] right-0 w-48 rounded-xl border border-white/10 bg-[#161415] shadow-2xl overflow-hidden z-50"
            >
              {(
                [
                  { id: "rating", label: "Rating" },
                  { id: "published", label: "Published date" },
                ] as const
              ).map((opt) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={sortMode === opt.id}
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

      {/* Applied filter chips */}
      {(activeWeaponId || activeCategory || activeTagId != null) && (
        <div
          className="flex items-center gap-2 flex-wrap"
          aria-label="Applied filters"
        >
          {activeWeaponId && (
            <button
              type="button"
              onClick={() => setActiveWeaponId(null)}
              className="h-8 px-3 rounded-full bg-white/[0.08] text-sm text-secondary flex items-center gap-2 hover:bg-white/[0.12]"
            >
              {activeWeapon?.name ?? "Weapon"}
              <X className="size-3.5" />
            </button>
          )}
          {activeCategory && (
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="h-8 px-3 rounded-full bg-white/[0.08] text-sm text-secondary flex items-center gap-2 hover:bg-white/[0.12]"
            >
              {activeCategory}
              <X className="size-3.5" />
            </button>
          )}
          {activeTagId != null && (
            <button
              type="button"
              onClick={() => setActiveTagId(null)}
              className="h-8 px-3 rounded-full bg-white/[0.08] text-sm text-secondary flex items-center gap-2 hover:bg-white/[0.12]"
            >
              {tags.find((tag) => tag.id === activeTagId)?.name ?? "Tag"}
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      <ResponsiveDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filter loadouts"
      >
        <div className="flex flex-col gap-6 pt-2">
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="font-medium font-sans text-[#fafafa]">Weapon</h3>
              <p className="text-sm text-teritary">
                Show loadouts using one specific weapon.
              </p>
            </div>
            <button
              type="button"
              onClick={openWeaponPicker}
              className="w-full min-h-16 rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-3 flex items-center gap-3 text-left hover:border-white/25 hover:bg-white/[0.05] transition-colors"
            >
              {draftWeapon?.imageUrl && (
                <img
                  src={draftWeapon.imageUrl}
                  alt=""
                  className="w-20 h-10 shrink-0 object-contain"
                />
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-[#fafafa] truncate">
                  {draftWeapon?.name ?? "Pick a weapon"}
                </span>
                <span className="block text-xs text-teritary truncate">
                  {draftWeapon?.type ?? "Browse all weapons"}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-teritary" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h3 className="font-medium font-sans text-[#fafafa]">
                Or pick a weapon category
              </h3>
              <p className="text-sm text-teritary">
                Used only when no specific weapon is selected.
              </p>
            </div>
            <FilterPillGroup
              type="single"
              value={draftCategory ?? ""}
              onValueChange={(value) => {
                setDraftCategory(value || null);
                if (value) setDraftWeaponId(null);
              }}
              className="w-full"
            >
              {categories.map((category) => (
                <FilterPill key={category} value={category} size="sm">
                  {category}
                </FilterPill>
              ))}
            </FilterPillGroup>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="font-medium font-sans text-[#fafafa]">
                  Loadout style
                </h3>
                {/* <p className="text-sm text-teritary">
                  Narrow results to a community tag.
                </p> */}
              </div>
              <FilterPillGroup
                type="single"
                value={draftTagId?.toString() ?? ""}
                onValueChange={(value) =>
                  setDraftTagId(value ? Number(value) : null)
                }
                className="w-full"
              >
                {tags.map((tag) => (
                  <FilterPill key={tag.id} value={tag.id.toString()} size="sm">
                    {tag.name}
                  </FilterPill>
                ))}
              </FilterPillGroup>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraftCategory(null);
                setDraftWeaponId(null);
                setDraftTagId(null);
              }}
            >
              Reset
            </Button>
            <Button type="button" onClick={applyFilters}>
              Show results
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={weaponPickerOpen}
        onOpenChange={(open) => {
          setWeaponPickerOpen(open);
          if (!open) setFiltersOpen(true);
        }}
        title="Pick a weapon"
      >
        <div className="flex flex-col gap-4 pt-2">
          <Input
            value={weaponQuery}
            onChange={(event) => setWeaponQuery(event.target.value)}
            placeholder="Search weapons..."
            icon={<Search className="size-4 text-teritary" />}
          />

          {draftWeaponId && (
            <button
              type="button"
              onClick={() => {
                setDraftWeaponId(null);
                setWeaponPickerOpen(false);
                setFiltersOpen(true);
              }}
              className="self-start text-sm text-destructive hover:text-red-500"
            >
              Clear selected weapon
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1">
            {weaponOptions.map((weapon) => (
              <button
                key={weapon.id}
                type="button"
                onClick={() => selectWeapon(weapon.id)}
                aria-pressed={draftWeaponId === weapon.id}
                className={cn(
                  "min-h-16 rounded-xl border px-3 py-2 flex items-center gap-3 text-left transition-colors",
                  draftWeaponId === weapon.id
                    ? "border-white/50 bg-white/[0.09]"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]",
                )}
              >
                <span className="w-20 h-10 shrink-0 flex items-center justify-center">
                  {weapon.imageUrl ? (
                    <img
                      src={weapon.imageUrl}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-teritary">No image</span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-[#fafafa] truncate">
                    {weapon.name}
                  </span>
                  <span className="block text-xs text-teritary truncate">
                    {weapon.type}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {weaponOptions.length === 0 && (
            <p className="py-8 text-center text-sm text-teritary">
              No weapons match your search.
            </p>
          )}
        </div>
      </ResponsiveDialog>

      {/* Loadout grid */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
          <p className="text-[#8d898a]">
            {loadouts.length === 0
              ? `No loadouts published for ${gameName} yet. Be the first to create one!`
              : "No loadouts match your filters."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-[14px] text-[#fafafa]"
            >
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
