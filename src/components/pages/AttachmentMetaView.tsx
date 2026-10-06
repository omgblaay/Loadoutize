import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronRight, Paperclip } from "lucide-react";
import { AppLayout } from "@/components/templates/AppLayout";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Tag } from "@/components/atoms/Tag";
import { WeaponImage } from "@/components/molecules/WeaponImage";
import { MetaTrendCharts } from "@/components/organisms/MetaTrendCharts";
import { useMetaData, type MetaWeapon } from "@/hooks/useMetaData";
import { weaponMetaPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

const META_ACCENT = "#f4f1ea";

interface WeaponUsage {
  weapon: MetaWeapon;
  count: number;
  adoption: number;
}

function isConcreteAttachment(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized !== "any" && normalized !== "__any__";
}

function AttachmentMetaSkeleton() {
  const block = "bg-white/[0.06]";
  return (
    <>
      <Skeleton className={cn("h-64 rounded-2xl", block)} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className={cn("h-80 rounded-2xl", block)} />
        ))}
      </div>
      <Skeleton className={cn("h-80 rounded-2xl", block)} />
    </>
  );
}

export function AttachmentMetaView() {
  const { gameId = "mw4", attachmentId = "" } = useParams<{
    gameId: string;
    attachmentId: string;
  }>();
  const navigate = useNavigate();
  const { loadouts, weapons, attachments, loading, error } =
    useMetaData(gameId);
  const attachment = attachments.find(
    (candidate) =>
      String(candidate.id) === attachmentId &&
      isConcreteAttachment(candidate.name),
  );

  const attachmentMatches = (value: string | undefined) =>
    Boolean(
      attachment &&
      value &&
      (value === attachment.name || String(value) === String(attachment.id)),
    );

  const attachmentLoadouts = useMemo(
    () =>
      attachment
        ? loadouts.filter((loadout) =>
            (loadout.weapons ?? []).some((loadoutWeapon) =>
              attachmentMatches(loadoutWeapon.attachments?.[attachment.type]),
            ),
          )
        : [],
    [attachment, loadouts],
  );

  const weaponUsage = useMemo<WeaponUsage[]>(() => {
    if (!attachment) return [];

    const uses = new Map<string, Set<string>>();
    const totals = new Map<string, Set<string>>();

    for (const loadout of loadouts) {
      for (const loadoutWeapon of loadout.weapons ?? []) {
        const weaponId = String(loadoutWeapon.id);
        const totalSet = totals.get(weaponId) ?? new Set<string>();
        totalSet.add(String(loadout.id));
        totals.set(weaponId, totalSet);

        if (attachmentMatches(loadoutWeapon.attachments?.[attachment.type])) {
          const useSet = uses.get(weaponId) ?? new Set<string>();
          useSet.add(String(loadout.id));
          uses.set(weaponId, useSet);
        }
      }
    }

    return weapons
      .map((weapon) => {
        const count = uses.get(String(weapon.id))?.size ?? 0;
        const total = totals.get(String(weapon.id))?.size ?? 0;
        return {
          weapon,
          count,
          adoption: total > 0 ? (count / total) * 100 : 0,
        };
      })
      .filter((item) => item.count > 0)
      .sort(
        (a, b) =>
          b.count - a.count ||
          b.adoption - a.adoption ||
          a.weapon.name.localeCompare(b.weapon.name),
      );
  }, [attachment, loadouts, weapons]);

  if (loading) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(`/${id}/meta`)}
      >
        <AttachmentMetaSkeleton />
      </AppLayout>
    );
  }

  if (error || !attachment) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(`/${id}/meta`)}
      >
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center">
          <h1 className="text-xl font-semibold text-[#fafafa]">
            Attachment data unavailable
          </h1>
          <p className="mt-2 text-sm text-teritary">
            {error ?? "This attachment could not be found in the current game."}
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
        <div />
        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.55fr)] md:items-center">
          <div>
            <div className="flex items-center gap-2">
              {attachment.typeImageUrl ? (
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/[0.05]">
                  <img
                    src={attachment.typeImageUrl}
                    alt=""
                    className="size-5 object-contain opacity-70"
                  />
                </span>
              ) : (
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/[0.05]">
                  <Paperclip className="size-4 text-teritary" />
                </span>
              )}
              <Tag>{attachment.type}</Tag>
            </div>
            <h1 className="mt-4 text-3xl uppercase sm:text-4xl">
              {attachment.name}
            </h1>
            <p className="mt-2 text-sm text-teritary">
              Used in {attachmentLoadouts.length} community loadout
              {attachmentLoadouts.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex absolute left-0 top-0 min-h-36">
            {attachment.imageUrl ? (
              <img
                src={attachment.imageUrl}
                alt={attachment.name}
                className="max-h-32 opacity-10 w-full object-contain"
              />
            ) : (
              <Paperclip className="size-12 text-white/15" />
            )}
          </div>
        </div>
      </header>

      <MetaTrendCharts
        loadouts={attachmentLoadouts}
        entityName={attachment.name}
        title="Attachment trends"
        popularityTitle="Attachment popularity"
        popularityDescription=""
      />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Most used on weapons</h2>
          <p className="mt-1 text-sm text-teritary">
            Ranked by the number of community loadouts using this attachment.
          </p>
        </div>

        {weaponUsage.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.06]">
            {weaponUsage.map(({ weapon, count, adoption }, index) => (
              <button
                key={weapon.id}
                type="button"
                onClick={() =>
                  navigate(weaponMetaPath(gameId, String(weapon.id)))
                }
                className="group flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.035] sm:gap-5 sm:px-5"
              >
                <span className="w-7 shrink-0 font-mono text-xs text-teritary">
                  #{index + 1}
                </span>
                <div className="w-20 shrink-0 sm:w-28">
                  <WeaponImage imageUrl={weapon.imageUrl} alt={weapon.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-sm uppercase text-[#fafafa]">
                      {weapon.name}
                    </span>
                    {weapon.typeShort && (
                      <Tag className="hidden sm:inline-flex">
                        {weapon.typeShort}
                      </Tag>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-[#f4f1ea]/70"
                      style={{ width: `${Math.min(adoption, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm text-[#fafafa]">
                    {count} builds
                  </p>
                  <p className="text-xs text-teritary">
                    {Math.round(adoption)}% adoption
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center text-teritary">
            No weapon usage is available for this attachment yet.
          </div>
        )}
      </section>
    </AppLayout>
  );
}
