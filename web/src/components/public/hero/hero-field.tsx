"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** true setelah modul popover termuat (popover benar-benar bisa tampil). */
let popoverReady = false;

// Popover (desktop) dan bottom sheet (mobile) diunduh saat field pertama kali dibuka, atau lebih
// awal saat field disorot/difokus/disentuh. Mobile tidak pernah mengunduh kode popover, dan sebaliknya.
const HeroFieldPopover = dynamic(
  () =>
    import("./hero-field-popover").then((mod) => {
      popoverReady = true;
      return mod.HeroFieldPopover;
    }),
  { ssr: false },
);
const HeroFieldSheet = dynamic(() => import("./hero-field-sheet").then((mod) => mod.HeroFieldSheet), {
  ssr: false,
});

function preloadOverlay(isDesktop: boolean) {
  void (isDesktop ? import("./hero-field-popover") : import("./hero-field-sheet"));
}

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
 * bottom sheet di mobile dan popover 360px di desktop. Tombolnya selalu elemen yang sama di server
 * dan klien (tidak dipasang ulang setelah hidrasi atau saat overlay termuat). Fokus kembali ke
 * tombol setelah ditutup.
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
  // Overlay dipasang sejak pertama dibuka dan dibiarkan terpasang (animasi tutup, fokus kembali).
  const [mounted, setMounted] = useState(false);
  if (open && !mounted) setMounted(true);

  const overlayProps = { triggerRef, open, onOpenChange, title, description, footer, children };
  const preload = () => preloadOverlay(isDesktop);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid={testId}
        disabled={disabled}
        onPointerEnter={preload}
        onFocus={preload}
        onClick={() => {
          // Mobile: sheet modal menutupi tombol, jadi klik selalu membuka. Desktop: klik saat popover
          // tampil menutupnya (seperti PopoverTrigger). Ketukan kedua selagi modul overlay masih
          // diunduh tidak menutup field yang sedang dibuka.
          if (!open) onOpenChange(true);
          else if (isDesktop && popoverReady) onOpenChange(false);
        }}
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

      {mounted && isDesktop ? <HeroFieldPopover {...overlayProps} /> : null}
      {mounted && !isDesktop ? <HeroFieldSheet {...overlayProps} /> : null}
    </>
  );
}
