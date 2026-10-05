"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const STEPS = 38;
const CELL = 3;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type PixelFireTone = "orange" | "green" | "red";

const FIRE_TONES: Record<
  PixelFireTone,
  {
    low: [number, number, number];
    mid: [number, number, number];
    high: [number, number, number];
    base: [number, number, number];
    focus: string;
  }
> = {
  orange: {
    low: [120, 20, 0],
    mid: [218, 58, 0],
    high: [255, 228, 157],
    base: [218, 58, 0],
    focus: "#ff8a3d",
  },
  green: {
    low: [0, 54, 28],
    mid: [1, 160, 89],
    high: [174, 255, 205],
    base: [1, 160, 89],
    focus: "#32d583",
  },
  red: {
    low: [72, 0, 22],
    mid: [208, 0, 80],
    high: [255, 178, 199],
    base: [208, 0, 80],
    focus: "#ff477e",
  },
};

function buildPalette(alpha: number, tone: PixelFireTone) {
  const colors = FIRE_TONES[tone];
  const palette = new Uint8Array(STEPS * 4);

  for (let step = 0; step < STEPS; step++) {
    const t = step / (STEPS - 1);
    const from = t < 0.58 ? colors.low : colors.mid;
    const to = t < 0.58 ? colors.mid : colors.high;
    const progress = t < 0.58 ? t / 0.58 : (t - 0.58) / 0.42;

    palette[step * 4] = lerp(from[0], to[0], progress);
    palette[step * 4 + 1] = lerp(from[1], to[1], progress);
    palette[step * 4 + 2] = lerp(from[2], to[2], progress);
    palette[step * 4 + 3] = Math.round(t ** 1.2 * alpha);
  }

  return palette;
}

function FireCanvas({
  litRef,
  hoverRef,
  pressedRef,
  tone,
}: {
  litRef: React.RefObject<boolean>;
  hoverRef: React.RefObject<boolean>;
  pressedRef: React.RefObject<boolean>;
  tone: PixelFireTone;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cols = Math.max(8, Math.ceil((canvas.offsetWidth || 160) / CELL));
    const rows = Math.max(8, Math.ceil((canvas.offsetHeight || 38) / CELL));
    canvas.width = cols;
    canvas.height = rows;

    const colors = FIRE_TONES[tone];
    const palette = buildPalette(180, tone);
    const heat = new Uint8Array(cols * rows);
    const waterline = new Float32Array(cols);
    let pointerX = cols / 2;
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0)
        pointerX = ((event.clientX - rect.left) / rect.width) * cols;
    };
    const parent = canvas.parentElement;
    parent?.addEventListener("pointermove", onMove);

    const image = ctx.createImageData(cols, rows);
    let level = litRef.current ? 1 : 0;

    if (level === 1) {
      const data = image.data;
      for (let offset = 0; offset < data.length; offset += 4) {
        data[offset] = colors.base[0];
        data[offset + 1] = colors.base[1];
        data[offset + 2] = colors.base[2];
        data[offset + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
    }

    let frame = 0;
    let lastTime = 0;
    let accumulator = 0;
    let burst = 0;
    let wasPressed = false;
    let alive = true;
    const tick = 1000 / 30;

    const render = (time: number) => {
      if (!alive) return;
      frame = requestAnimationFrame(render);
      lastTime ||= time;
      const delta = Math.min(64, time - lastTime);
      lastTime = time;

      if (litRef.current) level += (1 - level) * (1 - Math.exp(-delta / 240));
      else if (level > 0) {
        level += (0 - level) * (1 - Math.exp(-delta / 320));
        if (level < 0.02) level = 0;
      }

      accumulator += delta;
      if (accumulator >= tick) {
        accumulator %= tick;

        for (let x = 0; x < cols; x++) {
          waterline[x] = Math.max(
            -4,
            Math.min(4, (waterline[x] ?? 0) + (Math.random() - 0.5) * 1.6),
          );
        }
        for (let x = 1; x < cols - 1; x++) {
          waterline[x] =
            ((waterline[x - 1] ?? 0) +
              (waterline[x] ?? 0) * 2 +
              (waterline[x + 1] ?? 0)) /
            4;
        }

        const cool = litRef.current ? 0 : 1;
        for (let y = 0; y < rows - 1; y++) {
          for (let x = 0; x < cols; x++) {
            const source = (y + 1) * cols + x;
            const destination =
              y * cols +
              Math.min(
                cols - 1,
                Math.max(0, x + ((Math.random() * 3) | 0) - 1),
              );
            const value =
              (heat[source] ?? 0) - (1 + cool + ((Math.random() * 2.4) | 0));
            heat[destination] = value > 0 ? value : 0;
          }
        }

        const churn = level * (1 - level) * 4;
        const fill = level * (rows + 6);

        if (pressedRef.current && !wasPressed) burst = 1;
        wasPressed = !!pressedRef.current;
        burst = pressedRef.current ? Math.max(burst * 0.86, 0.45) : burst * 0.8;

        if (litRef.current) {
          for (let x = 0; x < cols; x++) {
            const height = fill + (waterline[x] ?? 0) * (0.4 + churn);
            const surface = rows - 1 - Math.floor(height);
            if (level > 0.02 && surface >= 0 && surface < rows) {
              heat[surface * cols + x] = STEPS - 1;
              if (surface + 1 < rows)
                heat[(surface + 1) * cols + x] = STEPS - 1;
            }
            if (level > 0.97) {
              if (burst > 0.05) {
                heat[(rows - 1) * cols + x] = STEPS - 1;
                heat[(rows - 2) * cols + x] = STEPS - 1;
                if (rows > 2 && Math.random() < burst)
                  heat[(rows - 3) * cols + x] = STEPS - 1;
                if (Math.random() < burst * 0.3) {
                  heat[((Math.random() * rows) | 0) * cols + x] = STEPS - 1;
                }
              } else if (hoverRef.current) {
                heat[(rows - 1) * cols + x] = STEPS - 1;
                if (Math.random() < 0.7)
                  heat[(rows - 2) * cols + x] = STEPS - 2;
                const distance = x - pointerX;
                const near = Math.exp(-(distance * distance) / 18);
                if (near > 0.35 && rows > 2)
                  heat[(rows - 3) * cols + x] = STEPS - 1;
                if (near > 0.7 && rows > 3)
                  heat[(rows - 4) * cols + x] = STEPS - 3;
              } else if (Math.random() < 0.55) {
                heat[(rows - 1) * cols + x] =
                  Math.random() < 0.5 ? STEPS - 11 : STEPS - 17;
              }
            }
          }
        } else {
          // Keep a low ember bed alive while inactive. Previously an unlit
          // button started with an empty heat buffer and only showed embers
          // after it had first been selected and then deselected.
          for (let x = 0; x < cols; x++) {
            const hoverBoost = hoverRef.current ? 3 : 0;
            heat[(rows - 1) * cols + x] = Math.min(
              STEPS - 1,
              STEPS - 16 + hoverBoost + ((Math.random() * 7) | 0),
            );
            if (rows > 1 && Math.random() < 0.72) {
              heat[(rows - 2) * cols + x] =
                STEPS - 22 + hoverBoost + ((Math.random() * 7) | 0);
            }
            if (rows > 2 && Math.random() < 0.18) {
              heat[(rows - 3) * cols + x] =
                STEPS - 25 + ((Math.random() * 6) | 0);
            }
          }
        }
      }

      const data = image.data;
      const churn = level * (1 - level) * 4;
      const fill = level * (rows + 6);
      for (let x = 0; x < cols; x++) {
        const height = fill + (waterline[x] ?? 0) * (0.4 + churn);
        for (let y = 0; y < rows; y++) {
          const index = y * cols + x;
          const offset = index * 4;
          const value = heat[index] ?? 0;
          const paletteIndex = value * 4;
          const alpha = palette[paletteIndex + 3]!;
          if (rows - y <= height) {
            data[offset] =
              colors.base[0] +
              (((palette[paletteIndex]! - colors.base[0]) * alpha) >> 8);
            data[offset + 1] =
              colors.base[1] +
              (((palette[paletteIndex + 1]! - colors.base[1]) * alpha) >> 8);
            data[offset + 2] =
              colors.base[2] +
              (((palette[paletteIndex + 2]! - colors.base[2]) * alpha) >> 8);
            data[offset + 3] = 255;
          } else {
            data[offset] = palette[paletteIndex]!;
            data[offset + 1] = palette[paletteIndex + 1]!;
            data[offset + 2] = palette[paletteIndex + 2]!;
            data[offset + 3] = alpha;
          }
        }
      }
      ctx.putImageData(image, 0, 0);
    };
    frame = requestAnimationFrame(render);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      parent?.removeEventListener("pointermove", onMove);
    };
  }, [hoverRef, litRef, pressedRef, tone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full [image-rendering:pixelated]"
    />
  );
}

export function PixelFireButton({
  children,
  lit = true,
  variant = "primary",
  tone = "orange",
  className,
  style,
  overlay,
  tabIndex,
  type,
  onClick,
  disabled,
  ariaLabel,
  ariaPressed,
}: {
  children: React.ReactNode;
  /** Fire on or out. Out = dark base, dimmed label, embers dying. */
  lit?: boolean;
  variant?: "primary" | "ghost";
  /** Selects the molten-fire palette. */
  tone?: PixelFireTone;
  className?: string;
  style?: React.CSSProperties;
  overlay?: React.ReactNode;
  tabIndex?: number;
  type?: "button" | "submit";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
}) {
  const litRef = useRef(lit);
  const hoverRef = useRef(false);
  const pressedRef = useRef(false);
  litRef.current = lit;
  const focusColor = FIRE_TONES[tone].focus;

  if (variant === "ghost") {
    return (
      <button
        type={type ?? "button"}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
        className={cn(
          "relative inline-flex h-[38px] items-center justify-center gap-2 rounded-md border border-[#f4f1ea]/15 bg-[#16140f] px-4 text-sm font-semibold tracking-[-0.015em] text-[#f4f1ea]",
          "transition-[scale,border-color,box-shadow,color] duration-150 active:scale-[0.985]",
          "hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
        style={{ outlineColor: focusColor, ...style }}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type={type ?? "button"}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      onMouseEnter={() => {
        hoverRef.current = true;
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
        pressedRef.current = false;
      }}
      onPointerDown={() => {
        pressedRef.current = true;
      }}
      onPointerUp={() => {
        pressedRef.current = false;
      }}
      onPointerCancel={() => {
        pressedRef.current = false;
      }}
      tabIndex={tabIndex}
      style={{
        color: lit ? "#ffffff" : "rgba(255, 255, 255, 0.55)",
        outlineColor: focusColor,
        transition:
          "color 400ms ease, transform 120ms ease-out, width 380ms cubic-bezier(0.65, 0, 0.2, 1), padding 380ms cubic-bezier(0.65, 0, 0.2, 1)",
        ...style,
      }}
      className={cn(
        "relative inline-flex h-[38px] shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-md border-none bg-[#1c1a1a] hover:bg-[#201d1f] transition-colors duration-150 px-4 text-sm font-semibold tracking-[-0.015em] active:scale-[0.985]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
    >
      <FireCanvas
        litRef={litRef}
        hoverRef={hoverRef}
        pressedRef={pressedRef}
        tone={tone}
      />
      <span className="relative flex items-center justify-center gap-2">
        {children}
      </span>
      {overlay}
    </button>
  );
}
