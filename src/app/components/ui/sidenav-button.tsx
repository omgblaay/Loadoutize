import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { AppTooltip } from "./tooltip";

const buttonVariants = cva(
  "h-14 items-center !min-w-14 rounded-xl px-3 flex flex-row gap-3 uppercase font-medium hover:bg-white/5",
  {
  variants: {
    state: {
        active: "bg-white/[0.08]",
        default: "",
    },
},
  },
);

const SideNavButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
      /** Text shown in the shared black tooltip on hover -- e.g. the icon-only rail. */
      tooltip?: React.ReactNode;
      tooltipSide?: "top" | "right" | "bottom" | "left";
    }
>(({ className, state, asChild = false, tooltip, tooltipSide = "right", ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  const button = (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ state, className }))}
      {...props}
    />
  );

  return (
    <AppTooltip content={tooltip} side={tooltipSide}>
      {button}
    </AppTooltip>
  );
});
SideNavButton.displayName = "SideNavButton";

export { SideNavButton, buttonVariants };
