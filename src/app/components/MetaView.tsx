import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { getGameColor } from "../utils/gameColors";
import { gameMeta } from "../utils/games";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { AppLayout, useGameName } from "./AppLayout";
import { Tag } from "./ui/tag";
import { WeaponCard } from "./ui/WeaponCard";
import { Star, TrendingUp, Crown } from "lucide-react";
import { NavIcon } from "./ui/nav-icon-3d";
import { FilterPill } from "./ui/filter-pill";
import { Loading } from "./ui/loading";

interface Weapon {
  id: string;
  name: string;
  type: string | null;
  typeShort: string | null;
  imageUrl: string | null;
}

interface LoadoutSummary {
  id: string;
  weapons: { id: string }[];
  tagId: number | null;
  ratingPercent: number | null;
}

interface CatalogTag {
  id: number;
  name: string;
  color: string;
}

type Scope = "all" | "tag" | "category";
type RankMode = "community" | "popularity";
type TierLabel = "S" | "A" | "B" | "C" | "D";

const TIER_ORDER: TierLabel[] = ["S", "A", "B", "C", "D"];

// A weapon needs at least one loadout that itself cleared the vote minimum
// (mapLoadout's MIN_VOTES_FOR_RATING) to be tiered under Community Rated --
// otherwise it sits in the "not enough data" bucket instead of a fabricated tier.
const MIN_RATED_LOADOUTS = 1;

const COMMUNITY_BANDS: { tier: TierLabel; min: number }[] = [
  { tier: "S", min: 90 },
  { tier: "A", min: 75 },
  { tier: "B", min: 60 },
  { tier: "C", min: 40 },
  { tier: "D", min: 0 },
];

// Most Loadouts ranks relative to the current scope's max count rather than
// fixed numbers, since raw volume varies wildly by game maturity.
const POPULARITY_BANDS: { tier: TierLabel; frac: number }[] = [
  { tier: "S", frac: 0.1 },
  { tier: "A", frac: 0.3 },
  { tier: "B", frac: 0.6 },
  { tier: "C", frac: 0.85 },
  { tier: "D", frac: 1 },
];

function average(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

interface WeaponAgg {
  weapon: Weapon;
  count: number;
  avgRating: number | null;
}

export function MetaView() {
  const { gameId: selectedGame = "mw4" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const [loadouts, setLoadouts] = useState<LoadoutSummary[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [tags, setTags] = useState<CatalogTag[]>([]);
  const [loading, setLoading] = useState(true);

  const [scope, setScope] = useState<Scope>("all");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [rankMode, setRankMode] = useState<RankMode>("community");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/loadouts`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      }).then((r) => r.json()),
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/weapons`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      }).then((r) => r.json()),
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/tags`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      }).then((r) => r.json()),
    ])
      .then(([loadoutsData, weaponsData, tagsData]) => {
        setLoadouts(loadoutsData.loadouts ?? []);
        setWeapons(weaponsData.weapons ?? []);
        setTags(tagsData.tags ?? []);
      })
      .catch((error) => console.error("Error fetching meta data:", error))
      .finally(() => setLoading(false));
  }, [selectedGame]);

  const accent = getGameColor(selectedGame).primary;
  const meta = gameMeta[selectedGame] ?? gameMeta.mw4;
  const { name: gameName } = useGameName(selectedGame);

  const TIER_COLOR: Record<TierLabel, string> = {
    S: "#FFC400",
    A: "#36D27A",
    B: accent,
    C: "#8d898a",
    D: "#FF4D63",
  };

  const categories = Array.from(new Set(weapons.map((w) => w.type).filter((t): t is string => Boolean(t))));

  const selectScope = (next: Scope) => {
    setScope(next);
    if (next === "tag" && selectedTagId == null && tags.length > 0) setSelectedTagId(tags[0].id);
    if (next === "category" && selectedCategory == null && categories.length > 0) setSelectedCategory(categories[0]);
  };

  const weaponById = new Map(weapons.map((w) => [w.id, w]));

  const scopedLoadouts = loadouts.filter((l) => {
    if (scope === "tag") return selectedTagId != null && l.tagId === selectedTagId;
    if (scope === "category") {
      const primary = weaponById.get(l.weapons?.[0]?.id ?? "");
      return selectedCategory != null && primary?.type === selectedCategory;
    }
    return true;
  });

  const candidateWeapons = scope === "category" && selectedCategory
    ? weapons.filter((w) => w.type === selectedCategory)
    : weapons;

  const aggs: WeaponAgg[] = candidateWeapons.map((weapon) => {
    const forWeapon = scopedLoadouts.filter((l) => l.weapons?.[0]?.id === weapon.id);
    const rated = forWeapon.filter((l) => l.ratingPercent != null);
    return {
      weapon,
      count: forWeapon.length,
      avgRating:
        rated.length >= MIN_RATED_LOADOUTS ? Math.round(average(rated.map((l) => l.ratingPercent as number))) : null,
    };
  });

  const eligible = rankMode === "community" ? aggs.filter((a) => a.avgRating != null) : aggs.filter((a) => a.count > 0);
  const noData = rankMode === "community" ? aggs.filter((a) => a.avgRating == null) : aggs.filter((a) => a.count === 0);

  const tiers = new Map<TierLabel, WeaponAgg[]>(TIER_ORDER.map((t) => [t, []]));

  if (rankMode === "community") {
    for (const agg of eligible) {
      const band = COMMUNITY_BANDS.find((b) => (agg.avgRating as number) >= b.min)!;
      tiers.get(band.tier)!.push(agg);
    }
    for (const list of tiers.values()) list.sort((a, b) => (b.avgRating as number) - (a.avgRating as number));
  } else {
    const sorted = [...eligible].sort((a, b) => b.count - a.count);
    const total = sorted.length;
    sorted.forEach((agg, i) => {
      const frac = (i + 1) / total;
      const band = POPULARITY_BANDS.find((b) => frac <= b.frac)!;
      tiers.get(band.tier)!.push(agg);
    });
  }

  const scopeNeedsSelection =
    (scope === "tag" && selectedTagId == null) || (scope === "category" && selectedCategory == null);

  const weaponHref = (weapon: Weapon) =>
    `/${selectedGame}/explore${weapon.type ? `?category=${encodeURIComponent(weapon.type)}` : ""}`;

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <AppLayout selectedGame={selectedGame} onGameSelect={(id) => navigate(`/${id}/meta`)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-5 w-full flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <NavIcon icon="meta" flat={<Crown className="w-7 h-7" />} active hovered={false} size={32} />
            Meta
          </h1>
          <p className="text-[#8d898a] text-sm">Community-ranked weapon tiers for {gameName}</p>
        </div>

        <div className="inline-flex rounded-xl border border-white/[0.12] p-1 shrink-0">
          <FilterPill active={rankMode === "community"} onClick={() => setRankMode("community")}>
            <Star className="w-4 h-4" />
            Community Rated
          </FilterPill>
          <FilterPill active={rankMode === "popularity"} onClick={() => setRankMode("popularity")}>
            <TrendingUp className="w-4 h-4" />
            Most Loadouts
          </FilterPill>
        </div>
      </div>

      {/* Scope tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {(
          [
            { id: "all", label: "All" },
            { id: "tag", label: "By Tag" },
            { id: "category", label: "By Category" },
          ] as const
        ).map((opt) => (
          <FilterPill key={opt.id} active={scope === opt.id} onClick={() => selectScope(opt.id)}>
            {opt.label}
          </FilterPill>
        ))}
      </div>

      {/* Secondary pill row for the active scope */}
      {scope === "tag" && tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {tags.map((tag) => (
            <Tag
              key={tag.id}
              color={tag.color}
              onClick={() => setSelectedTagId(tag.id)}
              className={selectedTagId === tag.id ? "" : "opacity-50 hover:opacity-80"}
            >
              {tag.name}
            </Tag>
          ))}
        </div>
      )}
      {scope === "category" && categories.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {categories.map((cat) => (
            <FilterPill key={cat} active={selectedCategory === cat} onClick={() => setSelectedCategory(cat)} size="sm">
              {cat}
            </FilterPill>
          ))}
        </div>
      )}

      {loadouts.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
          <p className="text-[#8d898a]">No loadouts published for {gameName} yet -- come back once the community has ranked some builds.</p>
        </div>
      ) : scopeNeedsSelection ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
          <p className="text-[#8d898a]">Pick a {scope === "tag" ? "tag" : "category"} above to see its tier list.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 w-full">
          {TIER_ORDER.map((tier) => {
            const list = tiers.get(tier) ?? [];
            if (list.length === 0) return null;
            return (
              <div
                key={tier}
                className="flex items-stretch rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden"
              >
                <div
                  className="w-16 shrink-0 flex items-center justify-center text-2xl font-heading"
                  style={{ backgroundColor: `${TIER_COLOR[tier]}26`, color: TIER_COLOR[tier] }}
                >
                  {tier}
                </div>
                <div className="flex-1 flex flex-wrap gap-3 p-4">
                  {list.map(({ weapon, count, avgRating }) => (
                    <WeaponCard
                      key={weapon.id}
                      weapon={weapon}
                      onSelect={() => navigate(weaponHref(weapon))}
                      stat={rankMode === "community" ? `${avgRating}%` : `${count} loadout${count === 1 ? "" : "s"}`}
                      className="w-[132px] shrink-0"
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {noData.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-[10px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">Not enough data yet</p>
              <div className="flex flex-wrap gap-3">
                {noData.map(({ weapon }) => (
                  <WeaponCard
                    key={weapon.id}
                    weapon={weapon}
                    onSelect={() => navigate(weaponHref(weapon))}
                    className="w-[132px] shrink-0 opacity-60 hover:opacity-100"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
