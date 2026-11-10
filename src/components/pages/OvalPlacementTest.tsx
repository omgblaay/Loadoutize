import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Copy, RotateCcw } from "lucide-react";
import {
  getOvalAttachmentBadgePosition,
  getOvalAttachmentBadgeTransform,
  ovalAttachmentBadgePlacements,
  type OvalBadgePlacement,
} from "@/lib/weaponAttachmentBadgePositions";

const STORAGE_KEY = "loadoutize:oval-placement-test";
const slots = Object.keys(ovalAttachmentBadgePlacements);
type Placements = Record<string, OvalBadgePlacement>;

const slotLabel = (slot: string) => slot === "cylinder" ? "Cylinder (revolver)" : slot;

function defaults(): Placements {
  return Object.fromEntries(slots.map((slot) => [slot, { ...ovalAttachmentBadgePlacements[slot] }]));
}

function savedPlacements(): Placements {
  const initial = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Placements> | null;
    if (!saved || typeof saved !== "object") return initial;
    for (const slot of slots) {
      const value = saved[slot];
      if (!value || !Number.isFinite(value.percent)) continue;
      initial[slot] = {
        percent: value.percent,
        x: Number.isFinite(value.x) ? value.x : 0,
        y: Number.isFinite(value.y) ? value.y : 0,
      };
    }
  } catch {
    // An older or incomplete draft should not prevent the test page from loading.
  }
  return initial;
}

function codeFor(placements: Placements): string {
  const lines = slots.map((slot) => {
    const { percent, x = 0, y = 0 } = placements[slot];
    const offsets = [x !== 0 ? `x: ${x}` : null, y !== 0 ? `y: ${y}` : null].filter(Boolean);
    return `  ${slot}: { percent: ${percent}${offsets.length ? `, ${offsets.join(", ")}` : ""} },`;
  });
  return `export const ovalAttachmentBadgePlacements = {\n${lines.join("\n")}\n};`;
}

export function OvalPlacementTest() {
  const [placements, setPlacements] = useState<Placements>(savedPlacements);
  const [selected, setSelected] = useState("apex");
  const [imageWidth, setImageWidth] = useState(1200);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
  }, [placements]);

  const positions = useMemo(
    () => Object.fromEntries(slots.map((slot, index) => [
      slot,
      getOvalAttachmentBadgePosition(undefined, slot, undefined, index, slots.length, placements[slot]),
    ])),
    [placements],
  );
  const current = placements[selected];

  const update = (field: keyof OvalBadgePlacement, value: number) => {
    if (!Number.isFinite(value)) return;
    setPlacements((previous) => ({
      ...previous,
      [selected]: { ...previous[selected], [field]: value },
    }));
    setCopied(false);
    setCopyError(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codeFor(placements));
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0909] px-5 py-8 text-white lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/explore" className="text-sm text-white/55 hover:text-white">← Back to app</Link>
            <h1 className="mt-3 text-3xl font-semibold">Oval attachment placement</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Every selectable attachment slot is shown as a picked attachment with a placeholder name and icon. Select a callout or a row, then adjust its position around the oval and its X/Y offset.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setPlacements(defaults()); setCopied(false); setCopyError(false); }} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10">
              <RotateCcw className="size-4" /> Reset
            </button>
            <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/85">
              <Copy className="size-4" /> {copied ? "Copied" : "Copy positions"}
            </button>
          </div>
        </div>

        {copyError && <p className="mt-3 text-sm text-white/70">Clipboard access is unavailable. Select the code in the panel below to copy it manually.</p>}

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 rounded-2xl border border-white/10 bg-[#141114]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-sm text-white/60">
              <span>0% left · 25% top · 50% right · 75% bottom · X/Y offsets are percentage points of the image box</span>
              <label className="flex items-center gap-2 text-xs text-white/70">
                Preview size
                <select value={imageWidth} onChange={(event) => setImageWidth(Number(event.target.value))} className="rounded-md border border-white/20 bg-[#211c21] px-2 py-1.5 text-white outline-none focus:border-white/60">
                  <option value={480}>Actual width · 480 px</option>
                  <option value={900}>Medium · 900 px</option>
                  <option value={1200}>Spread · 1200 px</option>
                </select>
              </label>
            </div>
            <div className="overflow-x-auto overflow-y-hidden">
              <div className="relative mx-auto" style={{ width: imageWidth + 600, height: imageWidth / 2 + 440 }}>
                <div className="absolute left-[300px] top-[220px]" style={{ width: imageWidth, height: imageWidth / 2 }}>
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-dashed border-white/25 bg-white/[0.025] text-sm text-white/35">
                    Weapon image box · {imageWidth} × {imageWidth / 2}
                  </div>
                  <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
                    <ellipse cx="50%" cy="50%" rx="58%" ry="75%" fill="none" stroke="rgba(255,255,255,0.18)" strokeDasharray="5 7" />
                  </svg>
                  {slots.map((slot) => {
                    const position = positions[slot];
                    const isSelected = slot === selected;
                    return (
                      <button
                        key={slot}
                        type="button"
                        title={`${slotLabel(slot)}: ${placements[slot].percent}%`}
                        aria-label={`Adjust ${slotLabel(slot)}`}
                        onClick={() => setSelected(slot)}
                        className={`absolute flex w-[200px] items-center gap-2 rounded-lg bg-[#151315]/95 py-1.5 pl-1.5 pr-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:border-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${isSelected ? "z-20 border border-white/70" : "z-10 border border-white/10"}`}
                        style={{ left: `${position.x}%`, top: `${position.y}%`, transform: getOvalAttachmentBadgeTransform(position.percent) }}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-white/70">{slot.slice(0, 2).toUpperCase()}</span>
                        <span className="flex min-w-0 flex-col leading-tight">
                          <span className="truncate text-sm font-medium uppercase text-white">{slot === "cylinder" ? "Revolver cylinder" : `${slot} attachment`}</span>
                          <span className="truncate text-[9px] uppercase tracking-[0.1em] text-white/50">{slotLabel(slot)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-white/10 bg-[#141114] p-4">
            <h2 className="text-base font-semibold">Adjust {slotLabel(selected)}</h2>
            <p className="mt-1 text-xs text-white/50">Changes are saved in this browser. Copy positions to use them in the app source.</p>
            {selected === "cylinder" && <p className="mt-2 text-xs text-white/60">The cylinder holds ammunition in a revolver. This slot has light and heavy attachment variants.</p>}
            <div className="mt-5 space-y-4">
              {(["percent", "x", "y"] as const).map((field) => (
                <label key={field} className="block">
                  <span className="mb-2 flex justify-between text-xs uppercase tracking-[0.08em] text-white/65">
                    <span>{field === "percent" ? "Oval position" : `${field.toUpperCase()} offset`}</span>
                    <span>{field === "percent" ? "%" : "percentage points"}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <input type="range" min={field === "percent" ? 0 : -50} max={field === "percent" ? 100 : 50} step="0.5" value={current[field] ?? 0} onChange={(event) => update(field, Number(event.target.value))} className="min-w-0 flex-1 accent-white" />
                    <input type="number" min={field === "percent" ? 0 : -50} max={field === "percent" ? 100 : 50} step="0.5" value={current[field] ?? 0} onChange={(event) => update(field, Number(event.target.value))} className="w-16 rounded-md border border-white/20 bg-[#211c21] px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-white/60" />
                  </div>
                </label>
              ))}
            </div>

            <h3 className="mt-7 mb-2 text-xs uppercase tracking-[0.08em] text-white/50">All attachment slots</h3>
            <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
              {slots.map((slot, index) => (
                <button key={slot} type="button" onClick={() => setSelected(slot)} className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm ${selected === slot ? "bg-white/15 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"}`}>
                  <span><span className="mr-2 inline-block w-5 text-xs text-white/40">{index + 1}</span>{slotLabel(slot)}</span>
                  <span className="font-mono text-xs tabular-nums">{placements[slot].percent}%</span>
                </button>
              ))}
            </div>
            <details className="mt-5 border-t border-white/10 pt-4">
              <summary className="cursor-pointer text-sm text-white/65 hover:text-white">View placement code</summary>
              <textarea readOnly value={codeFor(placements)} onFocus={(event) => event.target.select()} className="mt-3 h-40 w-full resize-y rounded-md border border-white/15 bg-[#211c21] p-2 font-mono text-xs text-white/75 outline-none" aria-label="Placement code" />
            </details>
          </aside>
        </div>
      </div>
    </main>
  );
}
