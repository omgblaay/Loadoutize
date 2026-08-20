import * as React from "react";

import { cn } from "./utils";

export function Input({
  className,
  type,
  icon,
  iconPosition = "start",
  ...props
}: React.ComponentProps<"input"> & {
  icon?: React.ReactNode;
  iconPosition?: "start" | "end";
}) {
  const input = (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[52px] flex rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.1] focus:bg-white/[0.1] items-center gap-3 px-4 text-[14px] text-[#fafafa] placeholder:text-[#8d898a] outline-none w-full",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        icon && (iconPosition === "start" ? "pl-11" : "pr-11"),
        className,
      )}
      {...props}
    />
  );

  if (!icon) return input;

  return (
    <div className="relative flex items-center w-full">
      {input}
      <span
        className={cn(
          "absolute flex items-center justify-center pointer-events-none",
          iconPosition === "start" ? "left-4" : "right-4",
        )}
      >
        {icon}
      </span>
    </div>
  );
}
