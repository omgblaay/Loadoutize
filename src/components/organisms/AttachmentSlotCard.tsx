import { ChevronRight, Paperclip } from "lucide-react";
import type { MetaAttachment } from "@/hooks/useMetaData";
import { ratingTier } from "@/lib/metaMetrics";
import { cn } from "@/lib/utils";
import { AttachmentIcon } from "@/components/atoms/AttachmentIcon";
import { attachmentDisplayName } from "@/lib/attachmentPresentation";

const RANK_MEDALS = ["#1", "#2", "#3"];

export interface AttachmentSlotCardItem {
  attachment: MetaAttachment;
  count: number;
  percent: number;
  /** Omit when the parent view does not calculate attachment rating. */
  avgRating?: number | null;
}

export interface AttachmentSlotCardData {
  type: string;
  typeImageUrl: string | null;
  items: AttachmentSlotCardItem[];
}

export function AttachmentSlotCard({
  slot,
  onSelect,
  onSelectSlot,
  maxItems = 3,
  className,
}: {
  slot: AttachmentSlotCardData;
  onSelect: (attachment: MetaAttachment) => void;
  onSelectSlot?: () => void;
  maxItems?: number;
  className?: string;
}) {
  const slotHeader = (
    <>
      <span className="flex size-6 shrink-0 items-center justify-center">
        {slot.type === "APEX" ? (
          <AttachmentIcon attachment={{ name: "APEX", type: "APEX" }} className="size-4" />
        ) : slot.typeImageUrl ? (
          <img
            src={slot.typeImageUrl}
            alt=""
            className="size-5 object-contain opacity-70"
          />
        ) : (
          <Paperclip className="size-4 text-teritary" />
        )}
      </span>
      <h3 className="min-w-0 flex-1 truncate text-sm font-sans">{slot.type}</h3>
      {onSelectSlot && (
        <ChevronRight className="size-4 shrink-0 text-white/25 transition-transform group-hover/slot:translate-x-0.5 group-hover/slot:text-white/70" />
      )}
    </>
  );

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-white/[0.07]",
        className,
      )}
    >
      {onSelectSlot ? (
        <button
          type="button"
          onClick={onSelectSlot}
          aria-label={`View all ${slot.type} attachments`}
          className="group/slot flex w-full items-center gap-3 border-b border-white/[0.07] px-4 py-3 text-left transition-colors hover:bg-white/[0.035]"
        >
          {slotHeader}
        </button>
      ) : (
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
          {slotHeader}
        </div>
      )}

      <ol className="divide-y divide-white/[0.06]">
        {slot.items.slice(0, maxItems).map((item, index) => {
          const { attachment, percent } = item;
          const showsRating = item.avgRating !== undefined;
          return (
            <li key={attachment.id}>
              <button
                type="button"
                onClick={() => onSelect(attachment)}
                className="group flex w-full items-center bg-white/[0.02] gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.035]"
              >
                <span
                  className="w-6 shrink-0 text-center text-teritary text-xs "
                  aria-label={`Rank ${index + 1}`}
                >
                  {RANK_MEDALS[index] ?? `#${index + 1}`}
                </span>
                <AttachmentIcon attachment={attachment} className="size-7" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm text-secondary">
                  <span className="truncate">{attachmentDisplayName(attachment)}</span>
                  {attachment.subtypeLabel && (
                    <span className="truncate text-[10px] uppercase tracking-[0.08em] text-teritary">
                      {attachment.subtypeLabel}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-xs text-[#fafafa]">
                    {Math.round(percent)}% used
                  </span>
                  {showsRating && (
                    <span className="mt-0.5 block text-[11px] text-teritary">
                      {item.avgRating == null
                        ? "New rating"
                        : `${ratingTier(item.avgRating)} avg. tier`}
                    </span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
