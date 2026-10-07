import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Activity,
  Check,
  ChevronDown,
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
import { toggleVariants } from "@/components/atoms/Toggle";
import { WeaponImage } from "@/components/molecules/WeaponImage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/molecules/DropdownMenu";
import { AttachmentSlotCard } from "@/components/organisms/AttachmentSlotCard";
import { cn } from "@/lib/utils";
import { sortWeaponCategories } from "@/lib/weaponCategories";
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
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.07] xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn(
              "h-28 rounded-none border-white/[0.07]",
              index === 0 && "border-b border-r xl:border-b-0",
              index === 1 && "border-b xl:border-b-0 xl:border-r",
              index === 2 && "border-r",
              block,
            )}
          />
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
  className,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  detail?: string;
  accent: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border-white/[0.07] p-4 sm:p-5",
        className,
      )}
    >
      {/* <div
        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-10 blur-3xl"
        style={{ backgroundColor: accent }}
      /> */}
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-teritary">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold  sm:text-3xl">{value}</p>
          {/* <p className="mt-1 text-xs text-teritary">{detail}</p> */}
        </div>
        {/* <span className="flex items-center justify-center">
          <Icon className="size-4" style={{ color: accent }} />
        </span> */}
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
  const [openScopeMenu, setOpenScopeMenu] = useState<"tag" | "category" | null>(
    null,
  );

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
  const weaponById = useMemo(
    () => new Map(weapons.map((weapon) => [weapon.id, weapon])),
    [weapons],
  );
  const selectedTag = tags.find((tag) => tag.id === selectedTagId);

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
        <div className="relative flex flex-col gap-5 sm:flex-row sm:justify-between">
          <NavIcon
            icon="meta"
            flat={<Crown className="size-5" />}
            active
            hovered={false}
            size={28}
          />
          <div className="flex flex-1 flex-col">
            <h1 className="text-2xl font-semibold  sm:text-4xl">
              {gameName} Meta
            </h1>
            <p className="mt-2 max-w-2xl leading-6 text-teritary">
              See which weapons rise to the top, how often they appear, and the
              attachments players trust most. Updated from published loadouts
            </p>
          </div>
        </div>
      </header>

      <div
        role="group"
        aria-label="Meta view"
        className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl bg-[#1c191b] p-1"
      >
        <button
          type="button"
          onClick={() => {
            setOpenScopeMenu(null);
            selectScope("all");
          }}
          aria-pressed={scope === "all"}
          className={toggleVariants({
            variant: "outline",
            className: cn(
              "h-9 px-3.5 text-[14px]",
              scope === "all" &&
                "!border-slate-100 !bg-slate-100 !text-[#0C0B0B] hover:!border-[#D8CED6] hover:!bg-[#D8CED6] hover:!text-[#0C0B0B]",
            ),
          })}
        >
          Overview
        </button>

        <DropdownMenu
          open={openScopeMenu === "tag"}
          onOpenChange={(open) => {
            setOpenScopeMenu(open ? "tag" : null);
            if (open) selectScope("tag");
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-pressed={scope === "tag"}
              className={toggleVariants({
                variant: "outline",
                className: cn(
                  "h-9 px-3.5 text-[14px]",
                  scope === "tag" &&
                    "!border-slate-100 !bg-slate-100 !text-[#0C0B0B] hover:!border-[#D8CED6] hover:!bg-[#D8CED6] hover:!text-[#0C0B0B]",
                ),
              })}
            >
              <span className={scope === "tag" ? "font-normal opacity-70" : ""}>
                {scope === "tag" ? "Playstyle:" : "By playstyle"}
              </span>
              {scope === "tag" && selectedTag && (
                <>
                  <strong className="font-semibold">{selectedTag.name}</strong>
                  <span
                    role="button"
                    aria-label="Clear playstyle filter"
                    className="flex size-5 items-center justify-center text-destructive hover:text-red-600"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedTagId(null);
                      setOpenScopeMenu(null);
                      selectScope("all");
                    }}
                  >
                    ×
                  </span>
                </>
              )}
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  openScopeMenu === "tag" && "rotate-180",
                )}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="!w-max min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)] rounded-2xl p-2"
          >
            <DropdownMenuLabel className="px-3 pb-1 pt-2 text-xs font-normal text-teritary">
              Playstyle
            </DropdownMenuLabel>
            {tags.map((tag) => {
              const selected = selectedTagId === tag.id;
              return (
                <DropdownMenuItem
                  key={tag.id}
                  onSelect={() => setSelectedTagId(tag.id)}
                  className={cn(
                    "h-11 gap-3 font-handwritten aliassed whitespace-nowrap rounded-xl px-3 text-sm",
                    selected && "bg-white/[0.08] text-[#fafafa]",
                  )}
                >
                  {/* <Activity className="size-4 text-teritary" /> */}
                  <span>{tag.name}</span>
                  {selected && <Check className="ml-auto size-4" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu
          open={openScopeMenu === "category"}
          onOpenChange={(open) => {
            setOpenScopeMenu(open ? "category" : null);
            if (open) selectScope("category");
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-pressed={scope === "category"}
              className={toggleVariants({
                variant: "outline",
                className: cn(
                  "h-9 px-3.5 text-[14px]",
                  scope === "category" &&
                    "!border-slate-100 !bg-slate-100 !text-[#0C0B0B] hover:!border-[#D8CED6] hover:!bg-[#D8CED6] hover:!text-[#0C0B0B]",
                ),
              })}
            >
              <span
                className={scope === "category" ? "font-normal opacity-70" : ""}
              >
                {scope === "category" ? "Weapon type:" : "Weapon type"}
              </span>
              {scope === "category" && selectedCategory && (
                <>
                  <strong className="font-semibold">{selectedCategory}</strong>
                  <span
                    role="button"
                    aria-label="Clear weapon type filter"
                    className="flex size-5 items-center justify-center text-destructive hover:text-red-600"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedCategory(null);
                      setOpenScopeMenu(null);
                      selectScope("all");
                    }}
                  >
                    ×
                  </span>
                </>
              )}
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  openScopeMenu === "category" && "rotate-180",
                )}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="!w-max min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)] rounded-2xl p-2"
          >
            <DropdownMenuLabel className="px-3 pb-1 pt-2 text-xs font-normal text-teritary">
              Weapon type
            </DropdownMenuLabel>
            {categories.map((category) => {
              const selected = selectedCategory === category;
              return (
                <DropdownMenuItem
                  key={category}
                  onSelect={() => setSelectedCategory(category)}
                  className={cn(
                    "h-11 gap-3 whitespace-nowrap rounded-xl px-3 text-sm",
                    selected && "bg-white/[0.08] text-[#fafafa]",
                  )}
                >
                  <Tag className="shrink-0">
                    {categoryShortNames.get(category)}
                  </Tag>
                  <span>{category}</span>
                  {selected && <Check className="ml-auto size-4" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
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
          <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] xl:grid-cols-4">
            <StatCard
              icon={Layers3}
              label="Published builds"
              value={scopedLoadouts.length}
              accent={accent}
              className="border-b border-r xl:border-b-0"
            />
            <StatCard
              icon={Target}
              label="Active weapons"
              value={weaponMetrics.length}
              accent={accent}
              className="border-b xl:border-b-0 xl:border-r"
            />
            <StatCard
              icon={Trophy}
              label="Rated builds"
              value={ratedBuilds}
              accent={accent}
              className="border-r"
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
                className="group hidden shrink-0 items-center gap-2 text-sm text-secondary transition-colors hover: sm:flex"
              >
                Full weapon list
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>

            {weaponMetrics.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                <div className="divide-y divide-white/[0.06]">
                  {weaponMetrics.slice(0, 5).map((metric, index) => {
                    const isTopWeapon = index === 0;
                    return (
                      <button
                        key={metric.weapon.id}
                        type="button"
                        onClick={() =>
                          navigate(
                            weaponMetaPath(
                              selectedGame,
                              String(metric.weapon.id),
                            ),
                          )
                        }
                        className={cn(
                          "group relative flex w-full items-center gap-3 px-4 text-left transition-colors hover:bg-white/[0.045] sm:gap-4 sm:px-5",
                          isTopWeapon
                            ? "bg-white/[0.035] py-5 sm:py-6"
                            : "py-3",
                        )}
                      >
                        {isTopWeapon && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute right-20 top-1/2 -translate-y-1/2 font-rating text-7xl font-semibold text-white/[0.035] sm:text-8xl"
                          >
                            01
                          </span>
                        )}
                        <span
                          className={cn(
                            "relative w-7 shrink-0 text-teritary",
                            isTopWeapon ? "text-base " : "text-xs",
                          )}
                        >
                          #{index + 1}
                        </span>
                        <div
                          className={cn(
                            "relative shrink-0",
                            isTopWeapon ? "w-24 sm:w-36" : "w-20 sm:w-28",
                          )}
                        >
                          <WeaponImage
                            imageUrl={metric.weapon.imageUrl}
                            alt={metric.weapon.name}
                          />
                        </div>
                        <div className="relative min-w-0 flex-row flex gap-2 flex-1">
                          <Tag className="shrink-0">
                            {metric.weapon.typeShort}
                          </Tag>
                          <span
                            className={cn(
                              "block truncate uppercase",
                              isTopWeapon ? "text-base sm:text-lg" : "text-sm",
                            )}
                          >
                            {metric.weapon.name}{" "}
                          </span>{" "}
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

                        <div className="relative hidden w-24 shrink-0 sm:block">
                          <p className="text-sm ">
                            {Math.round(metric.share)}%
                          </p>
                          <p className="text-xs text-teritary">usage</p>
                        </div>
                        <div className="relative flex w-16 shrink-0 justify-end">
                          <RatingRing
                            percent={metric.avgRating}
                            size={isTopWeapon ? 48 : 42}
                            fallbackLabel="—"
                          />
                        </div>
                        <ChevronRight className="relative size-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate(weaponMetaListPath(selectedGame))}
              className="group flex items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-secondary transition-colors hover:bg-white/[0.05] hover: sm:hidden"
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
