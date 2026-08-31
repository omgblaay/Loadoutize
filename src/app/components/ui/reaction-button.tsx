import * as React from "react";
import { cn } from "./utils";

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const int = parseInt(normalized, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/** Mixes `amount` (0-1) of white into an [r,g,b] triple. */
function lighten([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return [mix(r), mix(g), mix(b)];
}

function rgba([r, g, b]: [number, number, number], alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Pill-shaped async reaction button (Upvote / Downvote / Favorite) that
 * collapses to a spinning circle while the request is in flight, then
 * expands back to its label (icon + text + count) in the settled
 * active/inactive look -- no separate "success" checkmark stage, so the
 * button always resolves back to the same content it started with.
 *
 * Motion values are copied verbatim from the reference AsyncButton this was
 * adapted from: every duration and easing curve below is intentional, not a
 * rounding choice.
 */

const HEIGHT = 52;

type Phase = "idle" | "loading";

export interface ReactionButtonProps {
  /** An icon element (e.g. `<ThumbsUp />`) -- cloned with `fill`/`stroke` set to match active state. */
  icon: React.ReactElement<{ fill?: string; stroke?: string }>;
  label: string;
  count: number;
  /** Is this reaction currently the viewer's persisted state (liked/disliked/favorited)? */
  active: boolean;
  /** Hex accent driving the spinner ring and the active styling. */
  accent: string;
  /** Performs the request and resolves to whether this reaction is now active. */
  onClick: () => Promise<boolean>;
  disabled?: boolean;
  className?: string;
}

export function ReactionButton({
  icon,
  label,
  count,
  active,
  accent,
  onClick,
  disabled,
  className,
}: ReactionButtonProps) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [isHovered, setIsHovered] = React.useState(false);
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [idleWidth, setIdleWidth] = React.useState<number | null>(null);

  const prefersReducedMotion =
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

  // Measures the idle layer's natural width (icon + label + count) so the
  // button can animate its own width to/from a real pixel value instead of
  // `auto`, which CSS can't transition reliably.
  React.useLayoutEffect(() => {
    if (!measureRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setIdleWidth(Math.ceil(entry.contentRect.width) + 32);
    });
    observer.observe(measureRef.current);
    return () => observer.disconnect();
  }, [label, count]);

  const handleClick = async () => {
    if (phase !== "idle" || disabled) return;
    setPhase("loading");
    try {
      await onClick();
    } finally {
      setPhase("idle");
    }
  };

  const isLoading = phase === "loading";
  const isDisabled = disabled || isLoading;

  const width = isLoading ? HEIGHT : idleWidth ?? undefined;

  const baseRgb = hexToRgb(accent);
  // Hovering brightens whichever accent-derived color is currently showing --
  // the settled active tint, or a hint of it while idle -- by 20% white mix.
  const effectiveRgb = isHovered ? lighten(baseRgb, 0.2) : baseRgb;

  const showAccent = phase === "idle" && active;
  const buttonBg = showAccent ? rgba(effectiveRgb, 0.12) : isHovered ? rgba(effectiveRgb, 0.08) : "transparent";
  const buttonBorder = showAccent
    ? rgba(effectiveRgb, 0.55)
    : isHovered
      ? rgba(effectiveRgb, 0.33)
      : "rgba(255,255,255,0.18)";
  const buttonColor = showAccent || isHovered ? rgba(effectiveRgb, 1) : "#fafafa";

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      onMouseEnter={() => !isDisabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
      style={{
        all: "unset",
        boxSizing: "border-box",
        cursor: isDisabled ? "default" : "pointer",
        height: HEIGHT,
        width,
        borderRadius: HEIGHT / 2,
        background: buttonBg,
        border: `1px solid ${buttonBorder}`,
        color: buttonColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        transition: prefersReducedMotion
          ? "width 0.001ms, background 0.001ms, border-color 0.001ms, color 0.001ms"
          : "width 0.38s cubic-bezier(0.4, 0, 0.2, 1), background 0.28s ease, border-color 0.28s ease, color 0.28s ease",
      }}
    >
      {/* Idle / resting-active label */}
      <span
        ref={measureRef}
        className={cn("flex items-center gap-2 whitespace-nowrap text-[14px] px-4", active && "font-medium")}
        style={{
          opacity: phase === "idle" ? 1 : 0,
          pointerEvents: phase === "idle" ? "auto" : "none",
          transition: prefersReducedMotion ? "opacity 0.001ms ease" : "opacity 0.18s ease",
        }}
      >
        {React.cloneElement(icon, { fill: active ? "currentColor" : "none", stroke: "currentColor" })}
        <span>{label}</span>
        <span style={{ color: active ? rgba(effectiveRgb, 1) : "#8d898a" }}>{count}</span>
      </span>

      {/* Spinner */}
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: isLoading ? 1 : 0,
          pointerEvents: "none",
          transition: prefersReducedMotion ? "opacity 0.001ms ease" : "opacity 0.18s ease",
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "2.5px solid rgba(250,250,250,0.2)",
            borderTopColor: rgba(effectiveRgb, 1),
            animation: prefersReducedMotion ? "reaction-spin 0.001ms linear infinite" : "reaction-spin 0.7s linear infinite",
            display: "block",
          }}
        />
      </span>

      <style>{`
        @keyframes reaction-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
