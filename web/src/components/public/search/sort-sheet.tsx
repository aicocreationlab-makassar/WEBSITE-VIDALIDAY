"use client";

import { useId, useRef, useState } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS, type SortOption } from "@/lib/validation/filters";
import { ChoiceList, type Choice } from "./choice-group";
import { sortLabel } from "./filter-model";

function sortChoices(value: SortOption): Choice[] {
  return SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label, selected: option.value === value }));
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
  const changed = useRef(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 px-3">
          <ArrowUpDown aria-hidden="true" />
          <span className="flex min-w-0 flex-col items-start text-left">
            <span className="text-[15px] leading-[18px] font-semibold text-ink">Urutkan</span>
            <span className="max-w-full truncate text-caption font-medium text-ink-2">{sortLabel(value)}</span>
          </span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        closeLabel="Tutup"
        aria-describedby={undefined}
        onCloseAutoFocus={() => {
          // Fokus tetap kembali ke tombol Urutkan (bawaan Radix); hasil digulir ke atas kalau urutan berubah.
          if (!changed.current) return;
          changed.current = false;
          requestAnimationFrame(onChanged);
        }}
      >
        <SheetHeader>
          <SheetTitle>Urutkan</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-2 pb-4">
          <ChoiceList
            label="Urutkan"
            options={sortChoices(value)}
            onSelect={(next) => {
              setOpen(false);
              if (isSortOption(next) && next !== value) {
                changed.current = true;
                onSelect(next);
              }
            }}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
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
