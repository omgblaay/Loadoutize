import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronRight, Paperclip, Search } from "lucide-react";
import { AppLayout } from "@/components/templates/AppLayout";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { RatingRing } from "@/components/atoms/RatingRing";
import { Skeleton } from "@/components/atoms/Skeleton";
import { useMetaData, type MetaAttachment } from "@/hooks/useMetaData";
import { MIN_RATING_VOTES } from "@/lib/metaMetrics";
import {
  attachmentGroupMetaPath,
  attachmentMetaListPath,
  attachmentMetaPath,
} from "@/lib/routes";
import { cn } from "@/lib/utils";

interface AttachmentMetric {
  attachment: MetaAttachment;
  count: number;
  share: number;
  avgRating: number | null;
}

function isConcreteAttachment(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized !== "any" && normalized !== "__any__";
}

function AttachmentListSkeleton() {
  const block = "bg-white/[0.06]";
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className={cn("h-9 w-64", block)} />
        <Skeleton className={cn("h-4 w-96 max-w-full", block)} />
      </div>
      <Skeleton className={cn("h-[52px] w-full rounded-xl", block)} />
      <Skeleton className={cn("h-[520px] w-full rounded-2xl", block)} />
    </>
  );
}

export function AttachmentMetaListView() {
  const { gameId = "mw4", attachmentGroup } = useParams<{
    gameId: string;
    attachmentGroup?: string;
  }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { loadouts, attachments, loading, error } = useMetaData(gameId);

  const attachmentMetrics = useMemo<AttachmentMetric[]>(() => {
    const groupAttachments = attachments.filter(
      (attachment) =>
        (!attachmentGroup || attachment.type === attachmentGroup) &&
        isConcreteAttachment(attachment.name),
    );

    return groupAttachments
      .map((attachment) => {
        const matchingLoadouts = loadouts.filter((loadout) =>
          (loadout.weapons ?? []).some((weapon) => {
            const value = weapon.attachments?.[attachment.type];
            return (
              value === attachment.name ||
              String(value) === String(attachment.id)
            );
          }),
        );
        const ratedLoadouts = matchingLoadouts.filter(
          (loadout) =>
            loadout.ratingPercent != null &&
            loadout.likes + loadout.dislikes >= MIN_RATING_VOTES,
        );
        const avgRating =
          ratedLoadouts.length > 0
            ? Math.round(
                ratedLoadouts.reduce(
                  (sum, loadout) =>
                    sum + (loadout.ratingPercent as number),
                  0,
                ) / ratedLoadouts.length,
              )
            : null;

        return {
          attachment,
          count: matchingLoadouts.length,
          share:
            loadouts.length > 0
              ? (matchingLoadouts.length / loadouts.length) * 100
              : 0,
          avgRating,
        };
      })
      .sort(
        (a, b) =>
          b.count - a.count ||
          (b.avgRating ?? -1) - (a.avgRating ?? -1) ||
          a.attachment.name.localeCompare(b.attachment.name),
      );
  }, [attachmentGroup, attachments, loadouts]);

  const filteredMetrics = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return attachmentMetrics;
    return attachmentMetrics.filter(({ attachment }) =>
      [attachment.name, attachment.type].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [attachmentMetrics, search]);

  const typeImageUrl = attachmentGroup
    ? attachmentMetrics[0]?.attachment.typeImageUrl
    : null;
  const listPath = (id: string) =>
    attachmentGroup
      ? attachmentGroupMetaPath(id, attachmentGroup)
      : attachmentMetaListPath(id);

  if (loading) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(listPath(id))}
      >
        <AttachmentListSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedGame={gameId}
      onGameSelect={(id) => navigate(listPath(id))}
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

      <header className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
          {typeImageUrl ? (
            <img
              src={typeImageUrl}
              alt=""
              className="size-6 object-contain opacity-75"
            />
          ) : (
            <Paperclip className="size-5 text-teritary" />
          )}
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl uppercase sm:text-4xl">
            {attachmentGroup
              ? `${attachmentGroup} attachments`
              : "Attachment breakdown"}
          </h1>
          <p className="mt-2 text-sm text-teritary">
            {attachmentGroup
              ? `Search and compare every attachment in the ${attachmentGroup} slot by community usage and qualified loadout rating.`
              : "Search and compare every attachment by slot, community usage, and qualified loadout rating."}
          </p>
        </div>
      </header>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={
          attachmentGroup
            ? `Search ${attachmentGroup.toLowerCase()} attachments...`
            : "Search attachments or slots..."
        }
        aria-label="Search attachments"
        icon={<Search className="size-5 text-teritary" />}
      />

      {error ? (
        <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-12 text-center text-secondary">
          {error}
        </div>
      ) : filteredMetrics.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center text-secondary">
          {search
            ? `No attachments match “${search}”.`
            : "No attachments are available."}
        </div>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[3rem_minmax(240px,1.5fr)_minmax(140px,0.8fr)_7rem_7rem_2rem] items-center gap-4 border-b border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[11px] uppercase tracking-[0.08em] text-teritary">
              <span>Rank</span>
              <span>Attachment</span>
              <span>Slot</span>
              <span>Usage</span>
              <span className="text-center">Avg. rating</span>
              <span />
            </div>
            <div className="divide-y divide-white/[0.06]">
              {filteredMetrics.map((metric) => {
                const rank =
                  attachmentMetrics.findIndex(
                    (candidate) =>
                      candidate.attachment.id === metric.attachment.id,
                  ) + 1;
                return (
                  <button
                    key={metric.attachment.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        attachmentMetaPath(
                          gameId,
                          String(metric.attachment.id),
                        ),
                      )
                    }
                    className="group grid w-full grid-cols-[3rem_minmax(240px,1.5fr)_minmax(140px,0.8fr)_7rem_7rem_2rem] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.035]"
                  >
                    <span className="font-mono text-xs text-teritary">
                      #{rank}
                    </span>
                    <span className="flex min-w-0 items-center gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-black/20 p-2">
                        {metric.attachment.imageUrl ? (
                          <img
                            src={metric.attachment.imageUrl}
                            alt=""
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <Paperclip className="size-4 text-white/20" />
                        )}
                      </span>
                      <span className="truncate font-mono text-sm uppercase">
                        {metric.attachment.name}
                      </span>
                    </span>
                    <span className="truncate text-sm text-secondary">
                      {metric.attachment.type}
                    </span>
                    <span>
                      <span className="block font-mono text-sm">
                        {Math.round(metric.share)}%
                      </span>
                      <span className="text-xs text-teritary">
                        {metric.count} loadout{metric.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="flex justify-center">
                      <RatingRing
                        percent={metric.avgRating}
                        size={42}
                        fallbackLabel="—"
                      />
                    </span>
                    <ChevronRight className="size-4 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </AppLayout>
  );
}
