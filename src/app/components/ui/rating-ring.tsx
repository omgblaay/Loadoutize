import * as React from "react";
import { cn } from "./utils";

export interface RatingRingProps {
  /** 0-100, or null to show `fallbackLabel` instead of a percentage. */
  percent: number | null;
  /** Ring color when `percent` is set. Ignored while `percent` is null. */
  color: string;
  /** Ring diameter in px. */
  size: number;
  fallbackLabel?: string;
  /** Extra classes on the outer ring (e.g. a border). */
  className?: string;
  /** Extra classes on the inner disc (e.g. a border). */
  innerClassName?: string;
  /** Full text classes for the percent/fallback label -- size and color are not defaulted, so pass both. */
  labelClassName?: string;
}

export function RatingRing({
  percent,
  color,
  size,
  fallbackLabel = "—",
  className,
  innerClassName,
  labelClassName,
}: RatingRingProps) {
  return (
    <div
      className={cn("relative shrink-0 rounded-full flex items-center justify-center", className)}
      style={{
        width: size,
        height: size,
        background:
          percent != null
            ? `conic-gradient(${color} ${percent * 3.6}deg, rgba(255,255,255,0.1) 0deg)`
            : "rgba(255,255,255,0.1)",
      }}
    >
      <div
        className={cn("absolute inset-[8px] rounded-full bg-[#201e1f] flex items-center font-rating font-semibold justify-center", innerClassName)}
      >
        <span className={cn("tracking-[-0.3px]", labelClassName)}>
          {percent != null ? `${percent}%` : fallbackLabel}
        </span>
      </div>
    </div>
  );
}
