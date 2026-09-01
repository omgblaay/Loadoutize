import * as React from "react";
import { cn } from "./utils";

/** Text/icon tab used for filter and scope toggles (category filters, sort/scope tabs). */
export function FilterPill({
  active,
  onClick,
  size = "md",
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl text-[14px] transition-colors",
        size === "sm" ? "h-8 px-3" : "h-9 px-3.5",
        active ? "bg-[#2a2829] text-[#fafafa]" : "text-[#8d898a] hover:text-[#fafafa]",
        className
      )}
    >
      {children}
    </button>
  );
}
