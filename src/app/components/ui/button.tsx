import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { AppTooltip } from "./tooltip";
<title>Loadoutize - Compio</title>

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-[#0C0B0B] hover:bg-[#D8CED6]",
        destructive:
          "bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
            "rounded-xl border border-white/[0.18] text-teritary hover:border-white hover:text-[#efedf1]",
        secondary:
          "bg-container-alt alt-foreground hover:bg-[#353132]",
        ghost:
          "hover:bg-accent hover:bg-white/10",
        link: "underline-offset-4 hover:underline",
        sidenav: "min-h-[52px] hover:bg-white/[0.05] rounded-xl px-4 flex gap-2 uppercase hover:bg-white/[0.05]",
        sidenavActive: "min-h-[52px] hover:bg-white/[0.05] bg-white/[0.08] rounded-xl px-4 flex gap-2 uppercase  hover:bg-white/[0.05]",
      },
      size: {
        default: "h-10 px-6 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        icon: "h-10 aspect-square p-0",
        iconsm: "h-8 aspect-square p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
      /** Text shown in the shared black tooltip on hover. */
      tooltip?: React.ReactNode;
      tooltipSide?: "top" | "right" | "bottom" | "left";
    }
>(({ className, variant, size, asChild = false, tooltip, tooltipSide, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  const button = (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );

  return (
    <AppTooltip content={tooltip} side={tooltipSide}>
      {button}
    </AppTooltip>
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
