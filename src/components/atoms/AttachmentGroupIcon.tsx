import {
  AlignHorizontalJustifyCenter,
  CircleDashed,
  CircleDot,
  Crosshair,
  Focus,
  Grip,
  Hammer,
  MousePointerClick,
  PanelBottom,
  PanelRight,
  Paperclip,
  Puzzle,
  Rows3,
  Ruler,
  ScanLine,
  Shield,
  Wrench,
} from "lucide-react";
import { normalizePreviewSlot } from "@/lib/weaponSpritePreview";
import { cn } from "@/lib/utils";

const GROUP_ICONS = {
  muzzle: Crosshair,
  barrel: Ruler,
  laser: ScanLine,
  optic: Focus,
  stock: PanelRight,
  comb: AlignHorizontalJustifyCenter,
  rear_grip: Grip,
  magazine: Rows3,
  apex: Puzzle,
  trigger: MousePointerClick,
  underbarrel: PanelBottom,
  ammunition: CircleDot,
  bolt: Wrench,
  cylinder: CircleDashed,
  guard: Shield,
  hammer: Hammer,
  iron_sights: Focus,
} as const;

export function AttachmentGroupIcon({
  type,
  imageUrl,
  className,
}: {
  type: string;
  imageUrl?: string | null;
  className?: string;
}) {
  if (imageUrl) {
    return <img src={imageUrl} alt="" className={cn("size-7 shrink-0 object-contain", className)} />;
  }

  const Icon = GROUP_ICONS[normalizePreviewSlot(type) as keyof typeof GROUP_ICONS] ?? Paperclip;
  return <Icon aria-hidden="true" className={cn("size-7 shrink-0 text-teritary", className)} />;
}
