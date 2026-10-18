"use client";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Props = {
  /** Tombol field hero: menerima fokus lagi saat sheet ditutup. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/** Bottom sheet untuk field hero di bawah md (dimuat dinamis oleh HeroField). */
export function HeroFieldSheet({ triggerRef, open, onOpenChange, title, description, footer, children }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        closeLabel="Tutup"
        // Tanpa deskripsi: hapus aria-describedby bawaan Radix (mencegah peringatan konsol).
        {...(description ? {} : { "aria-describedby": undefined })}
        className="data-[side=bottom]:max-h-[85svh]"
        onCloseAutoFocus={(event) => {
          // Sheet tidak punya SheetTrigger sendiri; kembalikan fokus ke field secara manual.
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <SheetBody className="px-1">{children}</SheetBody>
        {footer ? <SheetFooter>{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}
