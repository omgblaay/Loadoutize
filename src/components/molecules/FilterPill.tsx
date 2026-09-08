import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/molecules/ToggleGroup";
import { cn } from "@/lib/utils";

/** Wraps a row of FilterPills into a single- or multi-select toggle group (roving tabindex, arrow-key nav). */
export const FilterPillGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroup>,
  React.ComponentProps<typeof ToggleGroup>
>(({ variant = "outline", className, ...props }, ref) => (
  <ToggleGroup ref={ref} variant={variant} className={cn("flex-wrap", className)} {...props} />
));
FilterPillGroup.displayName = "FilterPillGroup";

/** Text/icon tab used for filter and scope toggles (category filters, sort/scope tabs). Must be rendered inside a FilterPillGroup. */
export const FilterPill = React.forwardRef<
  React.ElementRef<typeof ToggleGroupItem>,
  Omit<React.ComponentProps<typeof ToggleGroupItem>, "size"> & {
    size?: "sm" | "md";
  }
>(({ size = "md", className, ...props }, ref) => (
  <ToggleGroupItem
    ref={ref}
    className={cn("text-[14px]", size === "sm" ? "h-8 px-3" : "h-9 px-3.5", className)}
    {...props}
  />
));
FilterPill.displayName = "FilterPill";
