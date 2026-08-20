import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "min-h-[52px] text-[#fafafa] items-center rounded-xl px-4 flex flex-row gap-3 text-[#fafafa] uppercase text-[.8rem] font-medium hover:bg-white/[0.12]",
  {
  variants: {
    state: {
        active: "bg-white/[0.08]",
        default: "",
    },
},
  },
);

function SideNavButton({
  className,  
  state,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ state, className }))}
      {...props}
    />
  );
}

export { SideNavButton, buttonVariants };
