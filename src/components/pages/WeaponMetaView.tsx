import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronRight, Paperclip } from "lucide-react";
import { AppLayout } from "@/components/templates/AppLayout";
import { WeaponImage } from "@/components/molecules/WeaponImage";
import { RatingRing } from "@/components/atoms/RatingRing";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Button } from "@/components/atoms/Button";
import { MetaTrendCharts } from "@/components/organisms/MetaTrendCharts";
import { cn } from "@/lib/utils";
import { attachmentMetaPath, weaponGroupMetaPath } from "@/lib/routes";
import { buildWeaponMetrics } from "@/lib/metaMetrics";
import {
  useMetaData,
  type MetaAttachment,
  type MetaLoadout,
} from "@/hooks/useMetaData";

const MIN_RATING_VOTES = 5;
const META_ACCENT = "#f4f1ea";

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

function AttachmentSlotCard({
  slot,
  accent,
  onSelect,
}: {
  slot: AttachmentSlot;
  accent: string;
  onSelect: (attachment: MetaAttachment) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
          {slot.typeImageUrl ? (
            <img
              src={slot.typeImageUrl}
              alt=""
              className="size-5 object-contain opacity-80"
            />
          ) : (
            <Paperclip className="size-4 text-teritary" />
          )}
        </span>
        <div className="min-w-0">
          <h3 className="font-sans">{slot.type}</h3>
        </div>
      </div>
      <ol className="divide-y divide-white/[0.06]">
        {slot.items.slice(0, 3).map(({ attachment, percent }, index) => (
          <li key={attachment.id}>
            <button
              type="button"
              onClick={() => onSelect(attachment)}
              className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.035]"
            >
              <span
                className="pointer-events-none absolute inset-y-0 left-0 opacity-[0.07]"
                style={{ width: `${percent}%`, backgroundColor: accent }}
              />
              <span className="relative w-7 shrink-0 font-mono text-xs text-teritary">
                #{index + 1}
              </span>
              {attachment.imageUrl ? (
                <img
                  src={attachment.imageUrl}
                  alt=""
                  className="relative size-8 shrink-0 object-contain"
                />
              ) : (
                <span className="relative size-8 shrink-0" />
              )}
              <span className="relative min-w-0 flex-1 truncate text-sm text-secondary">
                {attachment.name}
              </span>
              <span className="relative shrink-0 font-mono text-xs text-[#fafafa]">
                {Math.round(percent)}%
              </span>
              <ChevronRight className="relative size-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function WeaponMetaView() {
  const { gameId = "mw4", weaponId = "" } = useParams<{
    gameId: string;
    weaponId: string;
  }>();
  const navigate = useNavigate();
  const { loadouts, weapons, attachments, loading, error } =
    useMetaData(gameId);
  const accent = META_ACCENT;
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

  const topLoadouts = useMemo(
    () =>
      [...weaponLoadouts]
        .sort(
          (a, b) =>
            (b.ratingPercent ?? -1) - (a.ratingPercent ?? -1) ||
            b.score - a.score,
        )
        .slice(0, 5),
    [weaponLoadouts],
  );

  if (loading) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(`/${id}/meta`)}
      >
        <WeaponMetaSkeleton />
      </AppLayout>
    );
  }

  if (error || !weapon) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(`/${id}/meta`)}
      >
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center">
          <h1 className="text-xl font-semibold text-[#fafafa]">
            Weapon data unavailable
          </h1>
          <p className="mt-2 text-sm text-teritary">
            {error ?? "This weapon could not be found in the current game."}
          </p>
          <Button className="mt-5" onClick={() => navigate(`/${gameId}/meta`)}>
            Back to Meta
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedGame={gameId}
      onGameSelect={(id) => navigate(`/${id}/meta`)}
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
      <header className="relative">
        <div className="relative flex items-center gap-6">
          <div className="flex flex-row items-center gap-3">
            <RatingRing percent={avgRating} size={54} fallbackLabel="—" />
            <WeaponImage
              imageUrl={weapon.imageUrl}
              variant="small"
              alt={weapon.name}
            />
            <div className="min-w-0">
              <h1 className="mt-3 text-3xl uppercase sm:text-4xl">
                {weapon.name}
              </h1>
              {weapon.type && weaponGroupRank != null && (
                <Link
                  to={weaponGroupMetaPath(gameId, weapon.type)}
                  className="group mt-1 inline-flex items-center gap-1.5 text-sm text-teritary transition-colors hover:text-[#fafafa]"
                >
                  Top {weaponGroupRank} in {weapon.type}
                  <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      <MetaTrendCharts
        loadouts={weaponLoadouts}
        entityName={weapon.name}
        title="Weapon trends"
        popularityTitle="Weapon popularity"
        popularityDescription={`New ${weapon.name} loadouts created in this period`}
      />
      <h2 className="mt-1 text-2xl font-semibold font-sans">
        Top attachments by slot
      </h2>
      {attachmentSlots.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {attachmentSlots.map((slot) => (
            <AttachmentSlotCard
              key={slot.type}
              slot={slot}
              accent={accent}
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
      {topLoadouts.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
            <h2 className="font-semibold text-[#fafafa]">
              Top {weapon.name} loadouts
            </h2>
            <p className="mt-1 text-xs text-teritary">
              Highest-rated community builds using this weapon.
            </p>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {topLoadouts.map((loadout: MetaLoadout, index) => (
              <button
                key={loadout.id}
                type="button"
                onClick={() => navigate(`/${gameId}/l/${loadout.id}`)}
                className="group flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.035] sm:px-5"
              >
                <span className="w-7 shrink-0 font-mono text-xs text-teritary">
                  #{index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#fafafa]">
                    {loadout.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-teritary">
                    {loadout.description || `${weapon.name} community loadout`}
                  </p>
                </div>
                <RatingRing
                  percent={loadout.ratingPercent}
                  votes={loadout.likes + loadout.dislikes}
                  size={42}
                  fallbackLabel="New"
                />
                <ChevronRight className="size-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
              </button>
            ))}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
