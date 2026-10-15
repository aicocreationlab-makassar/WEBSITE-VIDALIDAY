"use client";

import { useId, useRef } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  /** Label kecil di atas nilai, mis. "Tipe kamar". */
  label: string;
  /** Nilai aktif, mis. "Semua tipe". */
  value: string;
  testId?: string;
  disabled?: boolean;
  /** Judul sheet/popover, mis. "Pilih tipe kamar". */
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** md ke atas: popover; di bawahnya: bottom sheet. */
  isDesktop: boolean;
  children: React.ReactNode;
  /** Aksi menempel di bawah (mis. "Terapkan"). */
  footer?: React.ReactNode;
  className?: string;
};

/**
 * Field pemicu hero (56px, ikon kiri, label kecil di atas nilai, chevron kanan) yang membuka
 * bottom sheet di mobile dan popover 360px di desktop. Struktur pohon sama di server dan klien
 * (Popover selalu ada) supaya tombol tidak dipasang ulang setelah hidrasi. Fokus kembali ke tombol
 * setelah ditutup.
 */
export function HeroField({
  icon: Icon,
  label,
  value,
  testId,
  disabled,
  title,
  description,
  open,
  onOpenChange,
  isDesktop,
  children,
  footer,
  className,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Popover open={isDesktop && open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          data-testid={testId}
          disabled={disabled}
          className={cn(
            "group flex h-14 w-full min-w-0 items-center gap-3 rounded-control border-[1.5px] border-line bg-white px-3.5 text-left transition-[border-color,background-color] duration-150 ease-out hover:border-subtle aria-expanded:border-brand-500 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:hover:border-line",
            className,
          )}
        >
          <Icon className="size-5 shrink-0 text-brand-600 group-disabled:text-subtle" aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-caption font-medium text-muted group-disabled:text-ink-2">{label}</span>
            <span className="truncate text-base leading-6 font-semibold text-ink">{value}</span>
          </span>
          <ChevronDown
            className="size-5 shrink-0 text-ink-2 transition-transform duration-150 ease-out group-aria-expanded:rotate-180"
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>

      {isDesktop ? (
        <PopoverContent
          align="start"
          sideOffset={8}
          collisionPadding={16}
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
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
      ) : (
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
      )}
    </Popover>
  );
}
