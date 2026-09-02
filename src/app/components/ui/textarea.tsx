import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[104px] w-full resize-none rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.1] focus:bg-white/[0.1] px-4 py-3 text-[14px] text-[#fafafa] placeholder:text-[#8d898a] outline-none transition-colors",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
