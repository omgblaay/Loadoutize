"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "bg-transparent text-teritary hover:bg-white/10 hover:text-[#efedf1] data-[state=on]:bg-slate-100 data-[state=on]:text-[#0C0B0B] data-[state=on]:hover:bg-[#D8CED6]",
        outline:
          "rounded-xl px-1 bg-transparent text-teritary hover:border-white hover:text-[#efedf1] data-[state=on]:bg-slate-100 data-[state=on]:text-[#0C0B0B] data-[state=on]:border-slate-100 data-[state=on]:hover:bg-[#D8CED6] data-[state=on]:hover:border-[#D8CED6]",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
