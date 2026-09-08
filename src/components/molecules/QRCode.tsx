import { useEffect, useRef, useState } from "react";
import QRCodeLib from "qrcode";
import logoMark from "figma:asset/ldtize-logo-mark.svg";
import logoWordmark from "figma:asset/logo.svg";
import { cn } from "@/lib/utils";

interface QRCodeCanvasProps {
  value: string;
  size?: number;
  className?: string;
  darkColor?: string;
  plateColor?: string;
  /** Called with a PNG data URL each time the code (re)renders -- wire up a download button to this. */
  onGenerated?: (dataUrl: string) => void;
}

// How rounded each module is, relative to its own size -- 0 is square, 0.5 is a full circle.
const MODULE_RADIUS_RATIO = 0.32;
// The center logo's footprint as a fraction of the QR's module grid. At "L" error correction
// (~7% damage tolerance) this eats most of that margin -- shrink it further if scans get flaky.
const LOGO_MODULE_RATIO = 0.22;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

interface DrawQROptions {
  darkColor: string;
  /** Background behind the center logo. Omit (or pass a falsy logoImg) to skip the logo entirely. */
  plateColor?: string;
  logoImg?: HTMLImageElement | null;
}

/** Draws the rounded-module QR (and, if a logo is given, its center plate + mark) into an existing 2D context at (x, y). */
function drawQR(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, opts: DrawQROptions) {
  const qr = QRCodeLib.create(value, { errorCorrectionLevel: "Q" });
  const count = qr.modules.size;
  const cell = size / count;
  const radius = cell * MODULE_RADIUS_RATIO;

  let logoStart = -1;
  let logoEnd = -1;
  if (opts.logoImg) {
    const logoModules = Math.ceil(count * LOGO_MODULE_RATIO);
    logoStart = Math.floor((count - logoModules) / 2);
    logoEnd = logoStart + logoModules;
  }

  ctx.fillStyle = opts.darkColor;
  ctx.beginPath();
  for (let row = 0; row < count; row++) {
    const inLogoRow = row >= logoStart && row < logoEnd;
    for (let col = 0; col < count; col++) {
      if (inLogoRow && col >= logoStart && col < logoEnd) continue;
      if (!qr.modules.get(row, col)) continue;
      ctx.roundRect(x + col * cell, y + row * cell, cell, cell, radius);
    }
  }
  ctx.fill();

  if (opts.logoImg && logoStart >= 0) {
    const plateSize = (logoEnd - logoStart) * cell;
    const plateX = x + logoStart * cell;
    const plateY = y + logoStart * cell;
    ctx.fillStyle = opts.plateColor ?? opts.darkColor;
    ctx.beginPath();
    ctx.roundRect(plateX, plateY, plateSize, plateSize, plateSize * 0.28);
    ctx.fill();

    const pad = plateSize * 0.2;
    const box = plateSize - pad * 2;
    const aspect = opts.logoImg.width / opts.logoImg.height;
    const logoW = aspect >= 1 ? box : box * aspect;
    const logoH = aspect >= 1 ? box / aspect : box;
    ctx.drawImage(opts.logoImg, plateX + (plateSize - logoW) / 2, plateY + (plateSize - logoH) / 2, logoW, logoH);
  }
}

export function QRCodeCanvas({
  value,
  size = 208,
  className,
  darkColor = "#fafafa",
  plateColor = "#121011",
  onGenerated,
}: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    loadImage(logoMark).then(setLogoImg);
  }, []);

  useEffect(() => {
    if (!logoImg) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    drawQR(ctx, value, 0, 0, size, { darkColor, plateColor, logoImg });

    onGenerated?.(canvas.toDataURL("image/png"));
    // onGenerated identity isn't meant to retrigger the draw -- only the visual inputs should.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, size, logoImg, darkColor, plateColor]);

  return <canvas ref={canvasRef} className={cn("shrink-0", className)} role="img" aria-label="QR code" />;
}

/** A bare QR PNG on a transparent background, in the given color -- no card, just the code itself. */
export async function generatePlainQRPng(value: string, color = "#000000", size = 480): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const logoImg = await loadImage(logoMark);
  drawQR(ctx, value, 0, 0, size, { darkColor: color, plateColor: color, logoImg });
  return canvas.toDataURL("image/png");
}

/** A shareable branded card (Container-styled: dark bg, border, rounded, p-4-equivalent padding) with the
 * Loadoutize wordmark on top, the QR code, and a caption underneath (defaults to a loadout-share caption). */
export async function generateBrandedQRPng(
  value: string,
  qrSize = 240,
  caption = "Scan QR code to see the loadout"
): Promise<string> {
  const padding = 32;
  const wordmarkHeight = 28;
  const gap = 24;
  const captionHeight = 24;
  const cornerRadius = 24;

  const width = qrSize + padding * 2;
  const height = padding + wordmarkHeight + gap + qrSize + gap + captionHeight + padding;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Container-style card background + border.
  ctx.fillStyle = "#121011";
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, cornerRadius);
  ctx.fill();
  ctx.strokeStyle = "#201e1f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(1, 1, width - 2, height - 2, cornerRadius);
  ctx.stroke();

  const [markImg, wordmarkImg] = await Promise.all([loadImage(logoMark), loadImage(logoWordmark)]);

  const wmAspect = wordmarkImg.width / wordmarkImg.height;
  const wmW = wordmarkHeight * wmAspect;
  ctx.drawImage(wordmarkImg, (width - wmW) / 2, padding, wmW, wordmarkHeight);

  const qrY = padding + wordmarkHeight + gap;
  drawQR(ctx, value, (width - qrSize) / 2, qrY, qrSize, { darkColor: "#fafafa", plateColor: "#121011", logoImg: markImg });

  await document.fonts.ready;
  ctx.fillStyle = "#8d898a";
  ctx.font = "600 14px Aspekta, ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(caption, width / 2, qrY + qrSize + gap + captionHeight / 2);

  return canvas.toDataURL("image/png");
}
