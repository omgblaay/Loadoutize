import * as React from "react";
import { useNavigate } from "react-router";

import { cn } from "@/lib/utils";

export interface BreadcrumbLinkProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Internal route path to navigate to on click. */
  to: string;
  children: React.ReactNode;
}

export function BreadcrumbLink({ to, className, children, ...props }: BreadcrumbLinkProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn("text-sm hover:text-primary transition-colors", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function BreadcrumbSpacer() {
  return <span className="text-[#342e32]">/</span>;
}
