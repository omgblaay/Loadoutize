import type { ReactNode } from "react";
import { XIcon } from "lucide-react";
import { useIsMobile } from "./use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "./drawer";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
