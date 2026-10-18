"use client";

import { useId, useRef } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

type Props = {
  /** Tombol field hero: jangkar posisi popover dan tujuan fokus saat ditutup. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Popover 360px untuk field hero di md ke atas (dimuat dinamis oleh HeroField). Tombolnya bukan
 * PopoverTrigger, jadi perilaku pemicu Radix ditiru: klik tombol saat terbuka tidak dihitung
 * "klik di luar" (tombol sendiri yang menutup), dan fokus kembali ke tombol kecuali tamu
 * mengeklik di luar.
 */
export function HeroFieldPopover({ triggerRef, open, onOpenChange, title, description, footer, children }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const interactedOutside = useRef(false);
  const pointerDownOutside = useRef(false);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor virtualRef={triggerRef} />
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onInteractOutside={(event) => {
          const target = event.target;
          if (target instanceof Node && triggerRef.current?.contains(target)) {
            event.preventDefault();
            return;
          }
          if (event.detail.originalEvent.type === "focusin" && pointerDownOutside.current) {
            event.preventDefault();
            return;
          }
          interactedOutside.current = true;
          if (event.detail.originalEvent.type === "pointerdown") pointerDownOutside.current = true;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (!interactedOutside.current) triggerRef.current?.focus();
          interactedOutside.current = false;
          pointerDownOutside.current = false;
        }}
        className="flex max-h-[min(560px,var(--radix-popover-content-available-height))] w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-card p-0 shadow-raised ring-line"
      >
        <div className="shrink-0 px-4 pt-4 pb-2">
          <h2 id={titleId} className="text-base leading-6 font-bold text-ink">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="text-sm text-muted">
              {description}
            </p>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2">{children}</div>
        {footer ? <div className="shrink-0 border-t border-line px-4 py-3">{footer}</div> : null}
      </PopoverContent>
    </Popover>
  );
}
