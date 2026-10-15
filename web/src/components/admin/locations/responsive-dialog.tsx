"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsDesktop } from "@/hooks/use-media-query";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Selama menyimpan, dialog tidak bisa ditutup supaya hasil (dan galat) tidak hilang. */
  busy?: boolean;
  children: React.ReactNode;
};

/** Form kecil admin: modal di desktop, bottom sheet di HP (pola fasilitas kamar). */
export function ResponsiveDialog({ open, onOpenChange, title, description, busy = false, children }: Props) {
  const isDesktop = useIsDesktop();
  const handleOpenChange = (next: boolean) => {
    if (!busy || next) onOpenChange(next);
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <SheetBody className="pt-2">{children}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}
