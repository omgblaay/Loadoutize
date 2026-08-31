import * as React from "react";
import { useNavigate } from "react-router";

import { cn } from "./utils";

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/** Mixes `amount` (0-1) of white into `hex` — used to derive the tag's text color. */
function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Base hex color for the tag's group (e.g. Balanced = blue, Run 'n' Gun = red). Omit for the neutral default style. */
  color?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Internal route path (e.g. `/mw4/explore?category=SMG`). When set, the tag becomes clickable and navigates there. */
  link?: string;
}

export function Tag({ color, icon, children, className, style, link, onClick, ...props }: TagProps) {
  const navigate = useNavigate();

  const sharedClassName = cn(
    "inline-flex h-6 w-fit items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 border-b border-white/20 uppercase",
    "[&>svg]:size-3 [&>svg]:shrink-0 [&>img]:size-3 [&>img]:shrink-0 [&>svg]:pointer-events-none",
    link && "cursor-pointer hover:opacity-80 transition-opacity",
    className,
  );
  const sharedStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    lineHeight: 1,
    backgroundColor: color ? withAlpha(color, 0.2) : "rgba(255, 255, 255, 0.1)",
    borderColor: color ?? "rgba(255, 255, 255, 0.2)",
    color: color ? lighten(color, 0.1) : "#ffffff",
    ...style,
  };
  const content = (
    <>
      {icon}
      <span className="truncate">{children}</span>
    </>
  );

  if (link) {
    return (
      <button
        type="button"
        className={sharedClassName}
        style={sharedStyle}
        onClick={(e) => {
          onClick?.(e as unknown as React.MouseEvent<HTMLSpanElement>);
          navigate(link);
        }}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={sharedClassName} style={sharedStyle} onClick={onClick} {...props}>
      {content}
    </span>
  );
}
