import type { ReactNode } from "react";
import { XIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/Dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/molecules/Drawer";

/**
 * A picker surface that renders as a centered Dialog on desktop and a
 * bottom Drawer on mobile -- for content (like an attachment picker) that's
 * too tall/wide to sit inline in the page.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  children,
  variant = "default",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  variant?: "default" | "destructive" | "success";
}) {
  const isMobile = useIsMobile();
  const surfaceClassName = cn(
    variant === "destructive" && "!border-destructive/40 !bg-[#1b1113]",
    variant === "success" && "!border-[#01a059]/40 !bg-[#0e1813]",
  );
  const titleClassName = cn(
    variant === "destructive" && "text-[#ef9696]",
    variant === "success" && "text-[#5be8a8]",
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={surfaceClassName} data-variant={variant}>
          <DrawerHeader>
            <DrawerTitle className={titleClassName}>{title}</DrawerTitle>
            <DrawerClose className="absolute top-4 right-4 rounded-xs text-[#8d898a] hover:text-[#fafafa] transition-colors">
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={surfaceClassName} data-variant={variant}>
        <DialogHeader>
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
