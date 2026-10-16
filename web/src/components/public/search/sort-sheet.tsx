"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS, type SortOption } from "@/lib/validation/filters";
import { sortLabel } from "./filter-model";

// Sheet (Radix Dialog) diunduh saat tombol Urutkan pertama kali ditekan, disorot, atau difokus.
const SortSheetDialog = dynamic(() => import("./sort-sheet-dialog").then((mod) => mod.SortSheetDialog), {
  ssr: false,
});

function preloadDialog() {
  void import("./sort-sheet-dialog");
}

function isSortOption(value: string | null): value is SortOption {
  return SORT_OPTIONS.some((option) => option.value === value);
}

type SheetProps = {
  value: SortOption;
  onSelect: (urut: SortOption) => void;
  /** Setelah sheet tertutup karena urutan berubah (gulir ke atas hasil). */
  onChanged: () => void;
};

/** Tombol "Urutkan" + bottom sheet berisi baris 56px; ketuk = pilih, tutup, terapkan (mobile). */
export function SortSheet({ value, onSelect, onChanged }: SheetProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="w-full gap-2 px-3"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={preloadDialog}
        onFocus={preloadDialog}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        <ArrowUpDown aria-hidden="true" />
        <span className="flex min-w-0 flex-col items-start text-left">
          <span className="text-[15px] leading-[18px] font-semibold text-ink">Urutkan</span>
          <span className="max-w-full truncate text-caption font-medium text-ink-2">{sortLabel(value)}</span>
        </span>
      </Button>

      {mounted ? (
        <SortSheetDialog open={open} onOpenChange={setOpen} value={value} onSelect={onSelect} onChanged={onChanged} />
      ) : null}
    </>
  );
}

/** Urutan di desktop: select bawaan bergaya kontrol 44px dengan label "Urutkan". */
export function SortSelect({
  value,
  onSelect,
  className,
}: {
  value: SortOption;
  onSelect: (urut: SortOption) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("shrink-0 items-center gap-2.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink-2">
        Urutkan
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => {
            if (isSortOption(event.target.value)) onSelect(event.target.value);
          }}
          className="h-11 cursor-pointer appearance-none rounded-control border-[1.5px] border-line bg-white py-0 pr-10 pl-3.5 font-semibold text-ink transition-colors duration-150 ease-out hover:border-subtle focus-visible:border-brand-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-2"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
