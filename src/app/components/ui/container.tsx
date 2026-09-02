import * as React from "react";
import { cn } from "./utils";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("bg-[#121011] border border-[#201e1f] rounded-2xl sm:p-6 p-4 flex flex-col gap-4", className)}>
      {children}
    </div>
  );
}
