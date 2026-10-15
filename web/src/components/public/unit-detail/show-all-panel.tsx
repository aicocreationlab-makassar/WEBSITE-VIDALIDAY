"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsDesktop } from "@/hooks/use-media-query";

type Props = {
  /** Teks tombol, mis. "Lihat semua (12)". */
  label: string;
  title: string;
  description?: string;
  className?: string;
  /** Isi lengkap (dirender di server). */
  children: React.ReactNode;
};

/** Tombol "Lihat semua (n)" yang membuka daftar lengkap: bottom sheet di mobile, modal di desktop. */
export function ShowAllPanel({ label, title, description, className, children }: Props) {
  const [open, setOpen] = useState(false);
  const desktop = useIsDesktop();

  return (
    <>
      <Button type="button" variant="secondary" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {label}
      </Button>
      {desktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>
            {children}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              {description ? <SheetDescription>{description}</SheetDescription> : null}
            </SheetHeader>
            <SheetBody>{children}</SheetBody>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
