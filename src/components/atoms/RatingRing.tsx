import * as React from "react";
import { cn } from "@/lib/utils";
import { ratingTier, type RatingTier } from "@/lib/metaMetrics";

export interface RatingRingProps {
  /** Internal 0-100 rating score used to derive the visible tier grade. */
  percent?: number | null;
  /** Number of explicit Like/Dislike votes. When supplied, color is withheld until `minimumVotes`. */
  votes?: number;
  minimumVotes?: number;
  size: number;
  fallbackLabel?: string;
  /** Extra classes on the outer ring (e.g. a border). */
  className?: string;
  /** Extra classes on the inner disc (e.g. a border). */
  innerClassName?: string;
}

const RATING_LABEL_CLASS =
  "font-heading font-bold text-xs text-white text-shadow-md";

const TIER_COLORS: Record<RatingTier, string> = {
  "S+": "#3FA45C",
  S: "#3FA45C",
  "S-": "#3FA45C",
  "A+": "#79B84A",
  A: "#79B84A",
  "A-": "#79B84A",
  "B+": "#C0B92F",
  B: "#C0B92F",
  "B-": "#C0B92F",
  "C+": "#EE8B2D",
  C: "#EE8B2D",
  "C-": "#EE8B2D",
  "D+": "#D65353",
  D: "#D65353",
  "D-": "#D65353",
};

interface FireRatingProps {
  idPrefix: string;
  size: number;
}

function FireRating({ idPrefix, size }: FireRatingProps) {
  const outlineGradient = `${idPrefix}-outline`;
  const flameGradient = `${idPrefix}-flame`;
  const highlightGradient = `${idPrefix}-highlight`;
  const centerGradient = `${idPrefix}-center`;
  const flamePath = `${idPrefix}-path`;
  const flameMask = `${idPrefix}-mask`;

  return (
    <svg
      aria-hidden="true"
      className="absolute bottom-0 overflow-visible"
      width={size}
      height={(size * 62) / 56}
      viewBox="0 0 56 62"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.583333"
        y="6.41671"
        width="54.8333"
        height="54.8333"
        rx="27.4167"
        stroke={`url(#${outlineGradient})`}
        strokeOpacity="0.6"
        style={{ mixBlendMode: "overlay" }}
        strokeWidth="1.16667"
      />
      <use href={`#${flamePath}`} fill={`url(#${flameGradient})`} />
      <mask id={flameMask} fill="white">
        <use href={`#${flamePath}`} />
      </mask>
      <path
        d="M32.514 56.7989C41.7388 54.9516 53.6667 48.3148 53.6667 31.1549C53.6667 15.5412 42.2375 5.14198 34.019 0.36434C32.1924 -0.698013 30.0588 0.697801 30.0588 2.80775V8.20215C30.0588 12.4575 28.2705 20.2244 23.3011 23.4558C20.7632 25.1054 18.0188 22.6354 17.7119 19.6254L17.4581 17.1525C17.163 14.2782 14.2357 12.5342 11.9398 14.2871C7.81138 17.4299 3.5 22.9482 3.5 31.1519C3.5 52.1363 19.1077 57.3861 26.9101 57.3861C27.3665 57.3861 27.8426 57.3714 28.3384 57.3419C29.6545 57.1766 28.3384 57.634 32.514 56.7959"
        strokeWidth="5.90196"
        stroke={`url(#${highlightGradient})`}
        strokeOpacity="0.6"
        style={{ mixBlendMode: "overlay" }}
        mask={`url(#${flameMask})`}
      />
      <rect
        x="11.3335"
        y="17.1667"
        width="33.3333"
        height="33.3333"
        rx="16.6667"
        fill={`url(#${centerGradient})`}
        fillOpacity="0.27"
      />
      <defs>
        <linearGradient
          id={outlineGradient}
          x1="28"
          y1="5.83337"
          x2="28"
          y2="61.8334"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.4" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
        <linearGradient
          id={flameGradient}
          x1="29.8375"
          y1="1.33456"
          x2="28.3106"
          y2="57.3787"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF5425" />
          <stop offset="0.675402" stopColor="#CE2D00" />
          <stop offset="0.910135" stopColor="#FF9E0C" />
        </linearGradient>
        <linearGradient
          id={highlightGradient}
          x1="28.5833"
          y1="0"
          x2="28.5833"
          y2="57.3861"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.4" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
        <linearGradient
          id={centerGradient}
          x1="28.0002"
          y1="17.1667"
          x2="28.0002"
          y2="50.5001"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#272727" stopOpacity="0.32" />
          <stop offset="1" />
        </linearGradient>
        <path
          id={flamePath}
          d="M32.514 56.7989C41.7388 54.9516 53.6667 48.3148 53.6667 31.1549C53.6667 15.5412 42.2375 5.14198 34.019 0.36434C32.1924 -0.698013 30.0588 0.697801 30.0588 2.80775V8.20215C30.0588 12.4575 28.2705 20.2244 23.3011 23.4558C20.7632 25.1054 18.0188 22.6354 17.7119 19.6254L17.4581 17.1525C17.163 14.2782 14.2357 12.5342 11.9398 14.2871C7.81138 17.4299 3.5 22.9482 3.5 31.1519C3.5 52.1363 19.1077 57.3861 26.9101 57.3861C27.3665 57.3861 27.8426 57.3714 28.3384 57.3419C29.6545 57.1766 28.3384 57.634 32.514 56.7959"
        />
      </defs>
    </svg>
  );
}

export function RatingRing({
  percent,
  votes,
  minimumVotes = 5,
  size,
  fallbackLabel = "—",
  className,
  innerClassName,
}: RatingRingProps) {
  const fireId = React.useId().replace(/:/g, "");
  const qualified = percent != null && (votes == null || votes >= minimumVotes);
  const tier = qualified ? ratingTier(percent, votes) : null;
  const label =
    tier ?? (votes != null && votes > 0 ? `${votes}` : fallbackLabel);
  const isSTier = tier?.startsWith("S") ?? false;

  const ariaLabel = tier
    ? `${tier} rating from ${votes ?? "qualified"} votes`
    : `${votes ?? 0} of ${minimumVotes} votes needed for a rating`;
  const title = tier
    ? `${tier} rating${votes != null ? ` • ${votes} votes` : ""}`
    : `${votes ?? 0}/${minimumVotes} votes needed`;

  if (isSTier) {
    return (
      <div
        className={cn(
          "relative shrink-0 flex items-center justify-center",
          className,
        )}
        role="img"
        aria-label={ariaLabel}
        title={title}
        style={{ width: size, height: size }}
      >
        <FireRating idPrefix={`rating-fire-${fireId}`} size={size} />
        <span className={cn("relative", RATING_LABEL_CLASS)}>{tier}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full flex items-center justify-center",
        className,
      )}
      role="img"
      aria-label={ariaLabel}
      title={title}
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
          "absolute inset-[8px] rounded-full bg-[#201e1f] flex items-center justify-center",
          innerClassName,
        )}
      >
        <span className={RATING_LABEL_CLASS}>{label}</span>
      </div>
    </div>
  );
}
