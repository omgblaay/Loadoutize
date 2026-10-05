import * as React from "react";
import { cn } from "@/lib/utils";

export interface RatingRingProps {
  /** Internal 0-100 rating score used to derive the visible tier grade. */
  percent: number | null;
  /** Number of explicit Like/Dislike votes. When supplied, color is withheld until `minimumVotes`. */
  votes?: number;
  minimumVotes?: number;
  size: number;
  fallbackLabel?: string;
  /** Extra classes on the outer ring (e.g. a border). */
  className?: string;
  /** Extra classes on the inner disc (e.g. a border). */
  innerClassName?: string;
  /** Full text classes for the tier/progress label. */
  labelClassName?: string;
}

type RatingTier = "S" | "A" | "B" | "C" | "D";

function ratingTier(score: number): RatingTier {
  return score >= 90
    ? "S"
    : score >= 75
      ? "A"
      : score >= 60
        ? "B"
        : score >= 40
          ? "C"
          : "D";
}

const TIER_COLORS: Record<RatingTier, string> = {
  S: "#3FA45C",
  A: "#79B84A",
  B: "#C0B92F",
  C: "#EE8B2D",
  D: "#D65353",
};

export function RatingRing({
  percent,
  votes,
  minimumVotes = 5,
  size,
  fallbackLabel = "—",
  className,
  innerClassName,
  labelClassName,
}: RatingRingProps) {
  const qualified = percent != null && (votes == null || votes >= minimumVotes);
  const tier = qualified ? ratingTier(percent) : null;
  const label =
    tier ?? (votes != null && votes > 0 ? `${votes}` : fallbackLabel);

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full flex items-center justify-center",
        className,
      )}
      role="img"
      aria-label={
        tier
          ? `${tier} rating from ${votes ?? "qualified"} votes`
          : `${votes ?? 0} of ${minimumVotes} votes needed for a rating`
      }
      title={
        tier
          ? `${tier} rating${votes != null ? ` • ${votes} votes` : ""}`
          : `${votes ?? 0}/${minimumVotes} votes needed`
      }
      style={{
        width: size,
        height: size,
        background: tier
          ? `conic-gradient(${TIER_COLORS[tier]} ${percent * 3.6}deg, rgba(255,255,255,0.1) 0deg)`
          : "rgba(255,255,255,0.1)",
      }}
    >
      <div
        className={cn(
          "absolute inset-[8px] rounded-full bg-[#201e1f] flex items-center font-rating font-semibold justify-center",
          innerClassName,
        )}
      >
        <span
          className={cn(
            "tracking-[-0.3px] text-sm",
            votes < minimumVotes
              ? "text-[12px] font-sans text-teritary"
              : "text-lg",
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
