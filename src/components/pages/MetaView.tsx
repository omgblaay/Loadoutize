import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Activity,
  BarChart3,
  ChevronRight,
  Crown,
  Layers3,
  Paperclip,
  Target,
  Trophy,
} from "lucide-react";
import { AppLayout } from "@/components/templates/AppLayout";
import { NavIcon } from "@/components/atoms/NavIcon";
import { RatingRing } from "@/components/atoms/RatingRing";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Tag } from "@/components/atoms/Tag";
import { FilterPill, FilterPillGroup } from "@/components/molecules/FilterPill";
import { WeaponImage } from "@/components/molecules/WeaponImage";
import { AttachmentSlotCard } from "@/components/organisms/AttachmentSlotCard";
import { cn } from "@/lib/utils";
import {
  attachmentMetaPath,
  weaponMetaListPath,
  weaponMetaPath,
} from "@/lib/routes";
import {
  buildWeaponMetrics,
  MIN_RATING_VOTES,
  type WeaponMetric,
} from "@/lib/metaMetrics";
import { useGameName } from "@/hooks/useGameName";
import { useMetaData, type MetaAttachment } from "@/hooks/useMetaData";
import { Button } from "@/components/atoms/Button";

type Scope = "all" | "tag" | "category";

interface AttachmentMetric {
  attachment: MetaAttachment;
  count: number;
  percent: number;
  avgRating: number | null;
}

interface AttachmentGroup {
  type: string;
  typeImageUrl: string | null;
  items: AttachmentMetric[];
}

const META_ACCENT = "#f4f1ea";

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isConcreteAttachment(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized !== "any" && normalized !== "__any__";
}

function DashboardSkeleton() {
  const block = "bg-white/[0.06]";
  return (
    <>
      <div className="flex items-center gap-4">
        <Skeleton className={cn("size-12 rounded-xl", block)} />
        <div className="flex flex-col gap-2">
          <Skeleton className={cn("h-8 w-52", block)} />
          <Skeleton className={cn("h-4 w-72 max-w-full", block)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className={cn("h-28 rounded-2xl", block)} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className={cn("h-52 rounded-2xl", block)} />
        ))}
      </div>
      <Skeleton className={cn("h-80 rounded-2xl", block)} />
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  detail?: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-10 blur-3xl"
        style={{ backgroundColor: accent }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-teritary">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#fafafa] sm:text-3xl">
            {value}
          </p>
          {/* <p className="mt-1 text-xs text-teritary">{detail}</p> */}
        </div>
        <span className="flex items-center justify-center">
          <Icon className="size-4" style={{ color: accent }} />
        </span>
      </div>
    </div>
  );
}

export function MetaView() {
  const { gameId: selectedGame = "mw4" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { name: gameName } = useGameName(selectedGame);
  const { loadouts, weapons, attachments, tags, loading, error } =
    useMetaData(selectedGame);
  const accent = META_ACCENT;

  const [scope, setScope] = useState<Scope>("all");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          weapons
            .map((weapon) => weapon.type)
            .filter((type): type is string => Boolean(type)),
        ),
      ),
    [weapons],
  );
  const weaponById = useMemo(
    () => new Map(weapons.map((weapon) => [weapon.id, weapon])),
    [weapons],
  );

  const selectScope = (nextScope: Scope) => {
    setScope(nextScope);
    if (nextScope === "tag" && selectedTagId == null && tags.length > 0)
      setSelectedTagId(tags[0].id);
    if (
      nextScope === "category" &&
      selectedCategory == null &&
      categories.length > 0
    )
      setSelectedCategory(categories[0]);
  };

  const scopedLoadouts = useMemo(
    () =>
      loadouts.filter((loadout) => {
        if (scope === "tag")
          return selectedTagId != null && loadout.tagId === selectedTagId;
        if (scope === "category") {
          const primaryWeapon = weaponById.get(loadout.weapons?.[0]?.id ?? "");
          return (
            selectedCategory != null && primaryWeapon?.type === selectedCategory
          );
        }
        return true;
      }),
    [loadouts, scope, selectedTagId, selectedCategory, weaponById],
  );

  const weaponMetrics = useMemo<WeaponMetric[]>(() => {
    const candidates =
      scope === "category" && selectedCategory
        ? weapons.filter((weapon) => weapon.type === selectedCategory)
        : weapons;
    return buildWeaponMetrics(candidates, scopedLoadouts);
  }, [weapons, scopedLoadouts, scope, selectedCategory]);

  const attachmentGroups = useMemo<AttachmentGroup[]>(() => {
    const usage = new Map<string, number>();
    const ratings = new Map<string, number[]>();
    for (const loadout of scopedLoadouts) {
      const usedInLoadout = new Set<string>();
      for (const weapon of loadout.weapons ?? []) {
        for (const [type, name] of Object.entries(weapon.attachments ?? {})) {
          if (isConcreteAttachment(name))
            usedInLoadout.add(`${type}\u0000${name}`);
        }
      }
      for (const key of usedInLoadout) {
        usage.set(key, (usage.get(key) ?? 0) + 1);
        if (
          loadout.ratingPercent != null &&
          loadout.likes + loadout.dislikes >= MIN_RATING_VOTES
        ) {
          const values = ratings.get(key) ?? [];
          values.push(loadout.ratingPercent);
          ratings.set(key, values);
        }
      }
    }

    const groups = new Map<string, AttachmentGroup>();
    for (const attachment of attachments) {
      if (!isConcreteAttachment(attachment.name)) continue;
      const count =
        usage.get(`${attachment.type}\u0000${attachment.name}`) ?? 0;
      if (count === 0) continue;
      const group = groups.get(attachment.type) ?? {
        type: attachment.type,
        typeImageUrl: attachment.typeImageUrl,
        items: [],
      };
      group.items.push({
        attachment,
        count,
        percent:
          scopedLoadouts.length > 0 ? (count / scopedLoadouts.length) * 100 : 0,
        avgRating: (() => {
          const values =
            ratings.get(`${attachment.type}\u0000${attachment.name}`) ?? [];
          return values.length > 0 ? Math.round(average(values)) : null;
        })(),
      });
      groups.set(attachment.type, group);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: group.items.sort(
          (a, b) =>
            b.count - a.count ||
            a.attachment.name.localeCompare(b.attachment.name),
        ),
      }))
      .sort((a, b) => b.items[0].count - a.items[0].count);
  }, [attachments, scopedLoadouts]);

  const ratedBuilds = scopedLoadouts.filter(
    (loadout) =>
      loadout.ratingPercent != null &&
      loadout.likes + loadout.dislikes >= MIN_RATING_VOTES,
  ).length;
  const attachmentSelections = scopedLoadouts.reduce(
    (total, loadout) =>
      total +
      (loadout.weapons ?? []).reduce(
        (weaponTotal, weapon) =>
          weaponTotal +
          Object.values(weapon.attachments ?? {}).filter(isConcreteAttachment)
            .length,
        0,
      ),
    0,
  );

  const scopeNeedsSelection =
    (scope === "tag" && selectedTagId == null) ||
    (scope === "category" && selectedCategory == null);

  if (loading) {
    return (
      <AppLayout
        selectedGame={selectedGame}
        onGameSelect={(id) => navigate(`/${id}/meta`)}
      >
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedGame={selectedGame}
      onGameSelect={(id) => navigate(`/${id}/meta`)}
    >
      <header>
        <div
          className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full opacity-15 blur-[100px]"
          style={{ backgroundColor: accent }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:justify-between">
          <NavIcon
            icon="meta"
            flat={<Crown className="size-5" />}
            active
            hovered={false}
            size={28}
          />
          <div className="flex flex-1 flex-col">
            <h1 className="text-2xl font-semibold text-[#fafafa] sm:text-4xl">
              {gameName} Meta
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-teritary">
              See which weapons rise to the top, how often they appear, and the
              attachments players trust most. Updated from published loadouts
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <FilterPillGroup
          type="single"
          value={scope}
          onValueChange={(value) => value && selectScope(value as Scope)}
        >
          <FilterPill value="all">Overview</FilterPill>
          <FilterPill value="tag">By playstyle</FilterPill>
          <FilterPill value="category">By category</FilterPill>
        </FilterPillGroup>
        {scope === "tag" && tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <Tag
                key={tag.id}
                color={tag.color}
                onClick={() => setSelectedTagId(tag.id)}
                className={
                  selectedTagId === tag.id
                    ? ""
                    : "cursor-pointer opacity-45 hover:opacity-80"
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
            onValueChange={(value) => value && setSelectedCategory(value)}
          >
            {categories.map((category) => (
              <FilterPill key={category} value={category} size="sm">
                {category}
              </FilterPill>
            ))}
          </FilterPillGroup>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-12 text-center text-secondary">
          {error}
        </div>
      ) : scopeNeedsSelection ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center text-secondary">
          Choose a {scope === "tag" ? "playstyle" : "weapon category"} to build
          the dashboard.
        </div>
      ) : scopedLoadouts.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center text-secondary">
          No published loadouts match this view yet.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              icon={Layers3}
              label="Published builds"
              value={scopedLoadouts.length}
              accent={accent}
            />
            <StatCard
              icon={Target}
              label="Active weapons"
              value={weaponMetrics.length}
              accent={accent}
            />
            <StatCard
              icon={Trophy}
              label="Rated builds"
              value={ratedBuilds}
              accent={accent}
            />
            <StatCard
              icon={Paperclip}
              label="Attachment picks"
              value={attachmentSelections}
              accent={accent}
            />
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2>Top weapons</h2>
                <p className="mt-1 text-sm text-teritary">
                  Community rating leads the ranking, with loadout usage
                  breaking ties.
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate(weaponMetaListPath(selectedGame))}
                className="group hidden shrink-0 items-center gap-2 text-sm text-secondary transition-colors hover:text-[#fafafa] sm:flex"
              >
                Full weapon list
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>

            {weaponMetrics[0] && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    weaponMetaPath(
                      selectedGame,
                      String(weaponMetrics[0].weapon.id),
                    ),
                  )
                }
                className="group relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4 text-left transition-colors hover:bg-white/[0.055] sm:grid-cols-[3rem_10rem_minmax(0,1fr)_8rem_7rem_5rem_auto] sm:p-5"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.06]"
                  style={{
                    background: `linear-gradient(90deg, ${accent}, transparent 65%)`,
                  }}
                />
                <span className="relative font-mono text-lg text-[#fafafa]">
                  #1
                </span>
                <div className="relative hidden sm:block">
                  <WeaponImage
                    imageUrl={weaponMetrics[0].weapon.imageUrl}
                    alt={weaponMetrics[0].weapon.name}
                  />
                </div>
                <div className="relative min-w-0">
                  <p className="truncate font-mono text-base uppercase text-[#fafafa] sm:text-lg">
                    {weaponMetrics[0].weapon.name}
                  </p>
                  <p className="mt-1 text-xs text-teritary">
                    Top community weapon
                  </p>
                </div>
                <div className="relative hidden sm:block">
                  <p className="truncate text-sm text-secondary">
                    {weaponMetrics[0].weapon.type ?? "Unclassified"}
                  </p>
                  <p className="mt-1 text-xs text-teritary">weapon type</p>
                </div>
                <div className="relative hidden sm:block">
                  <p className="font-mono text-sm text-[#fafafa]">
                    {weaponMetrics[0].count}
                  </p>
                  <p className="mt-1 text-xs text-teritary">loadouts</p>
                </div>
                <div className="relative flex justify-end">
                  <RatingRing
                    percent={weaponMetrics[0].avgRating}
                    size={48}
                    fallbackLabel="—"
                  />
                </div>
                <ChevronRight className="relative hidden size-4 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70 sm:block" />
              </button>
            )}

            {weaponMetrics.length > 1 && (
              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                <div className="divide-y divide-white/[0.06]">
                  {weaponMetrics.slice(1, 5).map((metric, metricIndex) => (
                    <button
                      key={metric.weapon.id}
                      type="button"
                      onClick={() =>
                        navigate(weaponMetaPath(selectedGame, metric.weapon.id))
                      }
                      className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.035] sm:gap-4 sm:px-5"
                    >
                      <span className="w-7 shrink-0 font-mono text-xs text-teritary">
                        #{metricIndex + 2}
                      </span>
                      <div className="w-20 shrink-0 sm:w-28">
                        <WeaponImage
                          imageUrl={metric.weapon.imageUrl}
                          alt={metric.weapon.name}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-sm uppercase text-[#fafafa]">
                          {metric.weapon.name}
                        </span>
                        <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-white/[0.07]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${metric.share}%`,
                              backgroundColor: accent,
                            }}
                          />
                        </div>
                      </div>
                      <div className="hidden w-32 shrink-0 md:block">
                        <p className="truncate text-sm text-secondary">
                          {metric.weapon.type ?? "Unclassified"}
                        </p>
                        <p className="text-xs text-teritary">weapon type</p>
                      </div>
                      <div className="hidden w-24 shrink-0 sm:block">
                        <p className="font-mono text-sm text-[#fafafa]">
                          {Math.round(metric.share)}%
                        </p>
                        <p className="text-xs text-teritary">usage</p>
                      </div>
                      <div className="flex w-16 shrink-0 justify-end">
                        <RatingRing
                          percent={metric.avgRating}
                          size={42}
                          fallbackLabel="—"
                        />
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate(weaponMetaListPath(selectedGame))}
              className="group flex items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-secondary transition-colors hover:bg-white/[0.05] hover:text-[#fafafa] sm:hidden"
            >
              Full weapon list
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </section>

          {attachmentGroups.length > 0 && (
            <section className="flex flex-col gap-4">
              <div>
                <h2>Attachment trends</h2>
                {/* <p className="mt-1 text-sm text-teritary">
                  Top concrete attachment picks by slot.
                </p> */}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {attachmentGroups.map((group) => (
                  <AttachmentSlotCard
                    key={group.type}
                    slot={group}
                    onSelect={(attachment) =>
                      navigate(
                        attachmentMetaPath(selectedGame, String(attachment.id)),
                      )
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AppLayout>
  );
}
