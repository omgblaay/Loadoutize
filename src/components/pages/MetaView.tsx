import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { getGameColor } from "@/lib/gameColors";
import { gameMeta } from "@/lib/games";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { AppLayout } from "@/components/templates/AppLayout";
import { useGameName } from "@/hooks/useGameName";
import { Tag } from "@/components/atoms/Tag";
import { WeaponCard } from "@/components/organisms/WeaponCard";
import { Star, TrendingUp, Crown, Paperclip } from "lucide-react";
import { NavIcon } from "@/components/atoms/NavIcon";
import { FilterPill, FilterPillGroup } from "@/components/molecules/FilterPill";
import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils";
import { explorePath } from "@/lib/routes";

interface Weapon {
  id: string;
  name: string;
  type: string | null;
  typeShort: string | null;
  imageUrl: string | null;
}

interface LoadoutSummary {
  id: string;
  weapons: { id: string; attachments?: Record<string, string> }[];
  tagId: number | null;
  ratingPercent: number | null;
  likes: number;
  dislikes: number;
}

interface CatalogTag {
  id: number;
  name: string;
  color: string;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  typeSlug: string;
  typeImageUrl: string | null;
  imageUrl: string | null;
}

type Scope = "all" | "tag" | "category";
type RankMode = "community" | "popularity";
type MetaSection = "weapons" | "attachments";
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

interface AttachmentUsage {
  attachment: Attachment;
  count: number;
  percent: number;
}

interface AttachmentUsageGroup {
  type: string;
  typeImageUrl: string | null;
  items: AttachmentUsage[];
}

function formatUsagePercent(percent: number) {
  if (percent > 0 && percent < 1) return "<1%";
  return `${Math.round(percent)}%`;
}

function AttachmentUsageCard({
  group,
  accent,
}: {
  group: AttachmentUsageGroup;
  accent: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? group.items : group.items.slice(0, 5);
  const hasMore = group.items.length > 5;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
          {group.typeImageUrl ? (
            <img
              src={group.typeImageUrl}
              alt=""
              className="size-5 object-contain opacity-80"
            />
          ) : (
            <Paperclip className="size-4 text-teritary" />
          )}
        </div>
        <h3 className="min-w-0 flex-1 truncate text-sm text-[#fafafa]">
          {group.type}
        </h3>
      </div>

      <ol className="divide-y divide-white/[0.06]">
        {visibleItems.map(({ attachment, percent }, index) => (
          <li
            key={attachment.id}
            className="relative flex items-center gap-3 px-4 py-3"
          >
            <div
              className="absolute inset-y-0 left-0 opacity-[0.07]"
              style={{ width: `${percent}%`, backgroundColor: accent }}
              aria-hidden="true"
            />
            <span className="relative w-7 shrink-0 font-mono text-xs text-teritary">
              #{index + 1}
            </span>
            {attachment.imageUrl ? (
              <img
                src={attachment.imageUrl}
                alt=""
                className="relative size-7 shrink-0 object-contain"
              />
            ) : (
              <div className="relative size-7 shrink-0" />
            )}
            <span className="relative min-w-0 flex-1 truncate text-sm text-secondary">
              {attachment.name}
            </span>
            <span className="relative shrink-0 font-mono text-sm text-[#fafafa]">
              {formatUsagePercent(percent)}
            </span>
          </li>
        ))}
      </ol>

      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="w-full border-t border-white/[0.07] px-4 py-3 text-sm font-medium text-teritary transition-colors hover:bg-white/[0.03] hover:text-[#fafafa]"
        >
          {showAll ? "Show top 5" : `Show all ${group.items.length}`}
        </button>
      )}
    </section>
  );
}

function MetaViewSkeleton() {
  const block = "bg-white/[0.06]";

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-5 w-full flex-wrap">
        <div className="flex flex-col gap-2">
          <Skeleton className={cn("h-9 w-40", block)} />
          <Skeleton className={cn("h-4 w-64 max-w-full", block)} />
        </div>
        <Skeleton className={cn("h-10 w-64 rounded-xl", block)} />
      </div>

      {/* Scope tabs */}
      <Skeleton className={cn("h-9 w-72 rounded-xl", block)} />

      {/* Tier rows */}
      <div className="flex flex-col gap-4 w-full">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-stretch rounded-2xl border border-white/[0.07] overflow-hidden h-[164px]"
          >
            <Skeleton className={cn("w-16 shrink-0 rounded-none", block)} />
            <div className="flex-1 flex flex-wrap gap-3 p-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton
                  key={j}
                  className={cn("w-[132px] h-[132px] rounded-xl", block)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function MetaView() {
  const { gameId: selectedGame = "mw4" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const [loadouts, setLoadouts] = useState<LoadoutSummary[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [tags, setTags] = useState<CatalogTag[]>([]);
  const [loading, setLoading] = useState(true);

  const [section, setSection] = useState<MetaSection>("weapons");
  const [scope, setScope] = useState<Scope>("all");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [rankMode, setRankMode] = useState<RankMode>("community");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/loadouts`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      ).then((r) => r.json()),
      fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/weapons`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      ).then((r) => r.json()),
      fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/attachments`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      ).then((r) => r.json()),
      fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/tags`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      ).then((r) => r.json()),
    ])
      .then(([loadoutsData, weaponsData, attachmentsData, tagsData]) => {
        setLoadouts(loadoutsData.loadouts ?? []);
        setWeapons(weaponsData.weapons ?? []);
        setAttachments(attachmentsData.attachments ?? []);
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

  const categories = Array.from(
    new Set(weapons.map((w) => w.type).filter((t): t is string => Boolean(t))),
  );

  const selectScope = (next: Scope) => {
    setScope(next);
    if (next === "tag" && selectedTagId == null && tags.length > 0)
      setSelectedTagId(tags[0].id);
    if (
      next === "category" &&
      selectedCategory == null &&
      categories.length > 0
    )
      setSelectedCategory(categories[0]);
  };

  const weaponById = new Map(weapons.map((w) => [w.id, w]));

  const scopedLoadouts = loadouts.filter((l) => {
    if (scope === "tag")
      return selectedTagId != null && l.tagId === selectedTagId;
    if (scope === "category") {
      const primary = weaponById.get(l.weapons?.[0]?.id ?? "");
      return selectedCategory != null && primary?.type === selectedCategory;
    }
    return true;
  });

  const attachmentUsageCounts = new Map<string, number>();
  for (const loadout of scopedLoadouts) {
    const usedInLoadout = new Set<string>();
    for (const weapon of loadout.weapons ?? []) {
      for (const [type, name] of Object.entries(weapon.attachments ?? {})) {
        usedInLoadout.add(`${type}\u0000${name}`);
      }
    }
    for (const key of usedInLoadout) {
      attachmentUsageCounts.set(key, (attachmentUsageCounts.get(key) ?? 0) + 1);
    }
  }

  const attachmentGroupsByType = new Map<string, AttachmentUsageGroup>();
  for (const attachment of attachments) {
    const count =
      attachmentUsageCounts.get(`${attachment.type}\u0000${attachment.name}`) ??
      0;
    if (count === 0) continue;

    const current = attachmentGroupsByType.get(attachment.type) ?? {
      type: attachment.type,
      typeImageUrl: attachment.typeImageUrl,
      items: [],
    };
    current.items.push({
      attachment,
      count,
      percent:
        scopedLoadouts.length > 0 ? (count / scopedLoadouts.length) * 100 : 0,
    });
    attachmentGroupsByType.set(attachment.type, current);
  }

  const attachmentGroups = Array.from(attachmentGroupsByType.values())
    .map((group) => ({
      ...group,
      items: group.items.sort(
        (a, b) =>
          b.count - a.count ||
          a.attachment.name.localeCompare(b.attachment.name),
      ),
    }))
    .sort((a, b) => a.type.localeCompare(b.type));

  const candidateWeapons =
    scope === "category" && selectedCategory
      ? weapons.filter((w) => w.type === selectedCategory)
      : weapons;

  const aggs: WeaponAgg[] = candidateWeapons.map((weapon) => {
    const forWeapon = scopedLoadouts.filter(
      (l) => l.weapons?.[0]?.id === weapon.id,
    );
    const rated = forWeapon.filter(
      (l) => l.ratingPercent != null && l.likes + l.dislikes >= 5,
    );
    return {
      weapon,
      count: forWeapon.length,
      avgRating:
        rated.length >= MIN_RATED_LOADOUTS
          ? Math.round(average(rated.map((l) => l.ratingPercent as number)))
          : null,
    };
  });

  const eligible =
    rankMode === "community"
      ? aggs.filter((a) => a.avgRating != null)
      : aggs.filter((a) => a.count > 0);
  const noData =
    rankMode === "community"
      ? aggs.filter((a) => a.avgRating == null)
      : aggs.filter((a) => a.count === 0);

  const tiers = new Map<TierLabel, WeaponAgg[]>(TIER_ORDER.map((t) => [t, []]));

  if (rankMode === "community") {
    for (const agg of eligible) {
      const band = COMMUNITY_BANDS.find(
        (b) => (agg.avgRating as number) >= b.min,
      )!;
      tiers.get(band.tier)!.push(agg);
    }
    for (const list of tiers.values())
      list.sort((a, b) => (b.avgRating as number) - (a.avgRating as number));
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
    (scope === "tag" && selectedTagId == null) ||
    (scope === "category" && selectedCategory == null);

  const weaponHref = (weapon: Weapon) =>
    explorePath(selectedGame, weapon.type ? { category: weapon.type } : {});

  if (loading) {
    return (
      <AppLayout
        selectedGame={selectedGame}
        onGameSelect={(id) => navigate(`/${id}/meta`)}
      >
        <MetaViewSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedGame={selectedGame}
      onGameSelect={(id) => navigate(`/${id}/meta`)}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-5 w-full flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <NavIcon
              icon="meta"
              flat={<Crown className="w-7 h-7" />}
              active
              hovered={false}
              size={32}
            />
            Meta
          </h1>
          <p className="text-[#8d898a] text-sm">
            Community weapon tiers and attachment usage for {gameName}
          </p>
        </div>

        {section === "weapons" && (
          <FilterPillGroup
            type="single"
            value={rankMode}
            onValueChange={(v) => v && setRankMode(v as RankMode)}
            className="inline-flex rounded-xl border border-white/[0.12] p-1 shrink-0"
          >
            <FilterPill value="community">
              <Star className="w-4 h-4" />
              Community Rated
            </FilterPill>
            <FilterPill value="popularity">
              <TrendingUp className="w-4 h-4" />
              Most Loadouts
            </FilterPill>
          </FilterPillGroup>
        )}
      </div>

      {/* Meta content */}
      <FilterPillGroup
        type="single"
        value={section}
        onValueChange={(value) => value && setSection(value as MetaSection)}
      >
        <FilterPill value="weapons">Weapons</FilterPill>
        <FilterPill value="attachments">Attachments</FilterPill>
      </FilterPillGroup>

      {/* Scope tabs */}
      <FilterPillGroup
        type="single"
        value={scope}
        onValueChange={(v) => v && selectScope(v as Scope)}
      >
        {(
          [
            { id: "all", label: "All" },
            { id: "tag", label: "By Tag" },
            { id: "category", label: "By Category" },
          ] as const
        ).map((opt) => (
          <FilterPill key={opt.id} value={opt.id}>
            {opt.label}
          </FilterPill>
        ))}
      </FilterPillGroup>

      {/* Secondary pill row for the active scope */}
      {scope === "tag" && tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {tags.map((tag) => (
            <Tag
              key={tag.id}
              color={tag.color}
              onClick={() => setSelectedTagId(tag.id)}
              className={
                selectedTagId === tag.id ? "" : "opacity-50 hover:opacity-80"
              }
            >
              {tag.name}
            </Tag>
          ))}
        </div>
      )}
      {scope === "category" && categories.length > 0 && (
        <FilterPillGroup
          type="single"
          value={selectedCategory ?? ""}
          onValueChange={(v) => v && setSelectedCategory(v)}
        >
          {categories.map((cat) => (
            <FilterPill key={cat} value={cat} size="sm">
              {cat}
            </FilterPill>
          ))}
        </FilterPillGroup>
      )}

      {loadouts.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
          <p className="text-[#8d898a]">
            No loadouts published for {gameName} yet -- come back once the
            community has ranked some builds.
          </p>
        </div>
      ) : scopeNeedsSelection ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
          <p className="text-secondary">
            Pick a {scope === "tag" ? "tag" : "category"} above to see its{" "}
            {section === "weapons" ? "tier list" : "attachment usage"}.
          </p>
        </div>
      ) : section === "attachments" ? (
        attachmentGroups.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {attachmentGroups.map((group) => (
              <AttachmentUsageCard
                key={group.type}
                group={group}
                accent={accent}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
            <p className="text-secondary">
              No attachment usage data is available for these loadouts yet.
            </p>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4 w-full">
          {TIER_ORDER.map((tier) => {
            const list = tiers.get(tier) ?? [];
            if (list.length === 0) return null;
            return (
              <div
                key={tier}
                className="flex items-stretch rounded-2xl overflow-hidden"
                style={{
                  background: `linear-gradient(90deg, ${TIER_COLOR[tier]}24 0%, ${TIER_COLOR[tier]}0d 38%, transparent 100%)`,
                }}
              >
                <div
                  className="w-16 rounded-2xl shrink-0 flex items-center justify-center text-2xl font-heading"
                  style={{
                    borderLeft: `2px solid ${TIER_COLOR[tier]}26`,
                    color: TIER_COLOR[tier],
                  }}
                >
                  {tier}
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-5">
                  {list.map(({ weapon, count, avgRating }) => (
                    <WeaponCard
                      key={weapon.id}
                      weapon={weapon}
                      onSelect={() => navigate(weaponHref(weapon))}
                      stat={
                        rankMode === "community"
                          ? `${avgRating}%`
                          : `${count} loadout${count === 1 ? "" : "s"}`
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {noData.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-[10px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">
                Not enough data yet
              </p>
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
