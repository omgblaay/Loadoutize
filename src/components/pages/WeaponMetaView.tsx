import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/templates/AppLayout";
import { WeaponImage } from "@/components/molecules/WeaponImage";
import { RatingRing } from "@/components/atoms/RatingRing";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Button } from "@/components/atoms/Button";
import { MetaTrendCharts } from "@/components/organisms/MetaTrendCharts";
import { AttachmentSlotCard } from "@/components/organisms/AttachmentSlotCard";
import { LoadoutCard } from "@/components/organisms/LoadoutCard";
import { getGameColor } from "@/lib/gameColors";
import { gameMeta } from "@/lib/games";
import type { CardLoadout } from "@/types/loadout";
import { cn } from "@/lib/utils";
import {
  attachmentGroupMetaPath,
  attachmentMetaPath,
  explorePath,
  gamePath,
  loadoutPath,
  weaponMetaListPath,
} from "@/lib/routes";
import { buildWeaponMetrics, ratingTier } from "@/lib/metaMetrics";
import {
  useMetaData,
  type MetaAttachment,
} from "@/hooks/useMetaData";

const MIN_RATING_VOTES = 5;

interface AttachmentUsage {
  attachment: MetaAttachment;
  count: number;
  percent: number;
}

interface AttachmentSlot {
  type: string;
  typeImageUrl: string | null;
  items: AttachmentUsage[];
}

function isConcreteAttachment(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized !== "any" && normalized !== "__any__";
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function WeaponMetaSkeleton() {
  const block = "bg-white/[0.06]";
  return (
    <>
      <Skeleton className={cn("h-64 rounded-2xl", block)} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className={cn("h-80 rounded-2xl", block)} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className={cn("h-48 rounded-2xl", block)} />
        ))}
      </div>
    </>
  );
}

export function WeaponMetaView() {
  const { gameId = "mw4", weaponId = "" } = useParams<{
    gameId: string;
    weaponId: string;
  }>();
  const navigate = useNavigate();
  const { loadouts, weapons, attachments, tags, loading, error } =
    useMetaData(gameId);
  const weapon = weapons.find((candidate) => String(candidate.id) === weaponId);
  const weaponGroupRank = useMemo(() => {
    if (!weapon?.type) return null;
    const groupMetrics = buildWeaponMetrics(
      weapons.filter((candidate) => candidate.type === weapon.type),
      loadouts,
      true,
    );
    const index = groupMetrics.findIndex(
      (metric) => String(metric.weapon.id) === String(weapon.id),
    );
    return index >= 0 ? index + 1 : null;
  }, [loadouts, weapon, weapons]);

  const weaponLoadouts = useMemo(
    () =>
      loadouts.filter((loadout) =>
        (loadout.weapons ?? []).some(
          (loadoutWeapon) => String(loadoutWeapon.id) === weaponId,
        ),
      ),
    [loadouts, weaponId],
  );

  const ratedLoadouts = weaponLoadouts.filter(
    (loadout) =>
      loadout.ratingPercent != null &&
      loadout.likes + loadout.dislikes >= MIN_RATING_VOTES,
  );
  const avgRating =
    ratedLoadouts.length > 0
      ? Math.round(
          average(
            ratedLoadouts.map((loadout) => loadout.ratingPercent as number),
          ),
        )
      : null;
  const attachmentSlots = useMemo<AttachmentSlot[]>(() => {
    const usage = new Map<string, number>();
    for (const loadout of weaponLoadouts) {
      const matchingWeapon = (loadout.weapons ?? []).find(
        (loadoutWeapon) => String(loadoutWeapon.id) === weaponId,
      );
      for (const [type, name] of Object.entries(
        matchingWeapon?.attachments ?? {},
      )) {
        if (!isConcreteAttachment(name)) continue;
        const key = `${type}\u0000${name}`;
        usage.set(key, (usage.get(key) ?? 0) + 1);
      }
    }

    const slots = new Map<string, AttachmentSlot>();
    for (const attachment of attachments) {
      if (!isConcreteAttachment(attachment.name)) continue;
      const count =
        usage.get(`${attachment.type}\u0000${attachment.name}`) ?? 0;
      if (count === 0) continue;
      const slot = slots.get(attachment.type) ?? {
        type: attachment.type,
        typeImageUrl: attachment.typeImageUrl,
        items: [],
      };
      slot.items.push({
        attachment,
        count,
        percent:
          weaponLoadouts.length > 0 ? (count / weaponLoadouts.length) * 100 : 0,
      });
      slots.set(attachment.type, slot);
    }

    return Array.from(slots.values())
      .map((slot) => ({
        ...slot,
        items: slot.items.sort(
          (a, b) =>
            b.count - a.count ||
            a.attachment.name.localeCompare(b.attachment.name),
        ),
      }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [attachments, weaponLoadouts, weaponId]);

  const topLoadouts = useMemo<CardLoadout[]>(
    () =>
      [...weaponLoadouts]
        .sort(
          (a, b) =>
            Number(b.ratingPercent != null && b.likes + b.dislikes >= MIN_RATING_VOTES) -
              Number(a.ratingPercent != null && a.likes + a.dislikes >= MIN_RATING_VOTES) ||
            (b.ratingPercent ?? -1) - (a.ratingPercent ?? -1) ||
            b.score - a.score,
        )
        .slice(0, 6)
        .map((loadout) => ({
          ...loadout,
          gameId: loadout.gameId ?? gameId,
          userName: loadout.userName ?? "",
          views: loadout.views ?? 0,
        })),
    [gameId, weaponLoadouts],
  );

  if (loading) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(gamePath(id, "meta"))}
      >
        <WeaponMetaSkeleton />
      </AppLayout>
    );
  }

  if (error || !weapon) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(gamePath(id, "meta"))}
      >
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center">
          <h1 className="text-xl font-semibold ">Weapon data unavailable</h1>
          <p className="mt-2 text-sm text-teritary">
            {error ?? "This weapon could not be found in the current game."}
          </p>
          <Button className="mt-5" onClick={() => navigate(gamePath(gameId, "meta"))}>
            Back to Meta
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedGame={gameId}
      onGameSelect={(id) => navigate(gamePath(id, "meta"))}
    >
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(gamePath(gameId, "meta"))}
        >
          <ArrowLeft className="size-4" />
          Meta dashboard
        </Button>
      </div>
      <header className="relative overflow-hidden py-3 sm:py-7">
        <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_minmax(300px,0.82fr)] md:gap-10">
          <div className="order-2 min-w-0 md:order-1">
            <div className="mt-3 min-w-0">
              <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.9] uppercase tracking-[-0.04em] ">
                <Link
                  to={explorePath(gameId, { weapon: weaponId })}
                  className="transition-colors hover:text-[#d8d1d7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {weapon.name}
                </Link>
              </h1>
              {weapon.type && weaponGroupRank != null && (
                <Link
                  to={weaponMetaListPath(gameId, weapon.type)}
                  className="group mt-3 inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:"
                >
                  Top {weaponGroupRank} in {weapon.type}
                  <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
              <div className="flex items-center gap-3">
                <RatingRing percent={avgRating} size={54} fallbackLabel="—" />
                <div>
                  <p className="font-rating text-lg ">
                    {ratingTier(avgRating) ?? "Unrated"}
                  </p>
                  <p className="text-xs text-teritary">community tier</p>
                </div>
              </div>
              <div>
                <p className="font-mono text-lg ">{weaponLoadouts.length}</p>
                <p className="text-xs text-teritary">published configs</p>
              </div>
              <div>
                <p className="font-mono text-lg ">{ratedLoadouts.length}</p>
                <p className="text-xs text-teritary">qualified ratings</p>
              </div>
            </div>
          </div>

          <div className="relative order-1 flex min-h-44 items-center justify-center md:order-2 md:min-h-56">
            {weaponGroupRank != null && (
              <span
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 select-none font-rating text-[clamp(7rem,15vw,12rem)] font-semibold leading-none tracking-[-0.08em] text-white/[0.055]"
                aria-hidden="true"
              >
                {String(weaponGroupRank).padStart(2, "0")}
              </span>
            )}
            <div className="relative z-10 w-full max-w-lg">
              <WeaponImage
                imageUrl={weapon.imageUrl}
                variant="large"
                alt={weapon.name}
                weaponId={weapon.id}
                enableSpritePreview={gameId === "mw4"}
              />
            </div>
            {weapon.type && (
              <p className="absolute bottom-0 right-0 font-mono text-[10px] uppercase tracking-[0.16em] text-white/25">
                {weapon.type} rank
              </p>
            )}
          </div>
        </div>
      </header>
      <MetaTrendCharts
        loadouts={weaponLoadouts}
        entityName={weapon.name}
        title="Weapon trends"
        popularityTitle="Weapon popularity"
        popularityDescription={`New ${weapon.name} configs created in this period`}
      />
      <h2 className="mt-1 text-base font-semibold">Top attachments by slot</h2>
      {attachmentSlots.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {attachmentSlots.map((slot) => (
            <AttachmentSlotCard
              key={slot.type}
              slot={slot}
              onSelectSlot={() =>
                navigate(attachmentGroupMetaPath(gameId, slot.type))
              }
              onSelect={(attachment) =>
                navigate(attachmentMetaPath(gameId, String(attachment.id)))
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center text-teritary">
          No concrete attachment data is available for this weapon yet.
        </div>
      )}
      <section className="mt-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Top {weapon.name} loadouts</h2>
            <p className="mt-1 text-sm text-teritary">
              Highest-rated community builds using this weapon.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={explorePath(gameId, { weapon: weaponId })}>
              See all for this weapon
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
        {topLoadouts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topLoadouts.map((loadout, index) => (
              <LoadoutCard
                key={loadout.id}
                loadout={loadout}
                weapons={weapons}
                attachments={attachments}
                tags={tags}
                accent={getGameColor(gameId).primary}
                gameShort={gameMeta[gameId]?.short ?? gameId.toUpperCase()}
                index={index}
                to={loadoutPath(
                  gameId,
                  loadout.id,
                  loadout.contentType ?? "weapon_config",
                )}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-8 text-sm text-teritary">
            No loadouts for this weapon yet.
          </p>
        )}
      </section>
    </AppLayout>
  );
}
