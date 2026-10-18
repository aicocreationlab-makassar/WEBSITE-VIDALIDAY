"use client";

import { useRef } from "react";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SORT_OPTIONS, type SortOption } from "@/lib/validation/filters";
import { ChoiceList, type Choice } from "./choice-group";

function sortChoices(value: SortOption): Choice[] {
  return SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label, selected: option.value === value }));
}

function isSortOption(value: string | null): value is SortOption {
  return SORT_OPTIONS.some((option) => option.value === value);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: SortOption;
  onSelect: (urut: SortOption) => void;
  /** Setelah sheet tertutup karena urutan berubah (gulir ke atas hasil). */
  onChanged: () => void;
};

/** Bottom sheet "Urutkan" berisi baris 56px; ketuk = pilih, tutup, terapkan. Dimuat dinamis oleh SortSheet. */
export function SortSheetDialog({ open, onOpenChange, value, onSelect, onChanged }: Props) {
  const changed = useRef(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        closeLabel="Tutup"
        aria-describedby={undefined}
        onCloseAutoFocus={() => {
          // Fokus tetap kembali ke tombol Urutkan (useReturnFocus); hasil digulir ke atas kalau urutan berubah.
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
              onOpenChange(false);
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
