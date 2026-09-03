import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./utils";

interface CompactPageHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
}

// A smaller "shadow" of the page's own <h1> that stays hidden until that
// title scrolls out of view, then docks at the top of the screen -- these
// pages' TopNavBar isn't sticky (only the homepage's is), so once the real
// title is gone there's otherwise nothing showing what page you're on or a
// way to act (save/back/react) without scrolling back up.
export function CompactPageHeader({ title, actions }: CompactPageHeaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px -mt-px" />
      <div
        className={cn(
          "fixed top-0 inset-x-0 z-40 backdrop-blur-md bg-[rgba(6,5,9,0.6)] border-b border-white/[0.16] transition-all duration-200",
          visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        )}
      >
        <div className="max-w-[1440px] mx-auto px-2 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="text-base sm:text-lg font-semibold text-[#efedf1] truncate min-w-0">{title}</div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    </>
  );
}
