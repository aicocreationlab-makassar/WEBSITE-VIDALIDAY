"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReturnFocus } from "@/components/ui/dialog";

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-ink/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Sheet. `side="bottom"` = bottom sheet mobile (radius atas 24, pegangan dekoratif,
 * memperhitungkan safe area). Fokus terkunci di dalam, Esc menutup, fokus kembali ke elemen pembuka.
 */
function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  closeLabel = "Tutup",
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
  closeLabel?: string;
}) {
  const focusHandlers = useReturnFocus(onOpenAutoFocus, onCloseAutoFocus);
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        {...focusHandlers}
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col bg-white text-ink shadow-raised outline-none transition ease-out duration-200",
          "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:max-h-[92dvh] data-[side=bottom]:rounded-t-sheet data-[side=bottom]:pb-[env(safe-area-inset-bottom)]",
          "data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-[min(85vw,20rem)]",
          "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-[min(85vw,22rem)]",
          "data-[side=top]:inset-x-0 data-[side=top]:top-0",
          "data-open:animate-in data-closed:animate-out data-[side=bottom]:data-open:slide-in-from-bottom data-[side=bottom]:data-closed:slide-out-to-bottom data-[side=left]:data-open:slide-in-from-left data-[side=left]:data-closed:slide-out-to-left data-[side=right]:data-open:slide-in-from-right data-[side=right]:data-closed:slide-out-to-right data-[side=top]:data-open:slide-in-from-top data-[side=top]:data-closed:slide-out-to-top",
          className,
        )}
        {...props}
      >
        {side === "bottom" ? (
          <span aria-hidden="true" className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line" />
        ) : null}
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className="absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">{closeLabel}</span>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

/**
 * Untuk `onOpenAutoFocus`: fokus ke kontainer sheet (tabIndex -1 dari Radix), bukan ke isian pertama.
 * Keyboard HP tidak langsung muncul, tapi fokus tetap terkunci di dalam sheet.
 */
function focusSheetContainer(event: Event) {
  event.preventDefault();
  (event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex min-h-14 flex-col justify-center gap-0.5 px-4 pt-3 pb-2 pr-14", className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex shrink-0 gap-3 border-t border-line bg-white px-4 py-3", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg leading-6 font-bold text-ink", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  focusSheetContainer,
};
