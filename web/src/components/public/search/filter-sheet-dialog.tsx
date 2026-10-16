"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { countMatches } from "@/lib/search-index";
import { activeFilterCount, type SewaFilter } from "@/lib/validation/filters";
import type { SearchIndexRow } from "@/types/domain";
import { clearFilters, normalizeFilter, type SearchLocation } from "./filter-model";
import { FilterPanel, type AmenityChip } from "./filter-panel";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Draft filter di sheet (diisi ulang dari filter aktif setiap kali dibuka). */
  draft: SewaFilter;
  onDraftChange: (draft: SewaFilter) => void;
  locations: SearchLocation[];
  amenities: AmenityChip[];
  index: SearchIndexRow[];
  /** Terapkan draft; true kalau URL berubah. */
  onApply: (next: SewaFilter) => boolean;
  /** Dipanggil setelah sheet tertutup karena filter diterapkan (fokus ke judul hasil). */
  onApplied: () => void;
};

/**
 * Bottom sheet filter hampir layar penuh (mobile), dimuat dinamis oleh FilterSheet. Angka
 * "Tampilkan n unit" dihitung langsung dari indeks dengan logika yang sama dengan server.
 */
export function FilterSheetDialog({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  locations,
  amenities,
  index,
  onApply,
  onApplied,
}: Props) {
  const applied = useRef(false);
  const normalized = normalizeFilter(draft, locations);
  const count = countMatches(index, normalized);
  const draftCount = activeFilterCount(normalized);

  function apply() {
    applied.current = onApply(normalized);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        closeLabel="Tutup filter"
        aria-describedby={undefined}
        className="data-[side=bottom]:h-[calc(100dvh-1rem)] data-[side=bottom]:max-h-none"
        onCloseAutoFocus={(event) => {
          if (!applied.current) return;
          // Filter diterapkan: fokus ke judul hasil (bukan kembali ke tombol Filter).
          applied.current = false;
          event.preventDefault();
          requestAnimationFrame(onApplied);
        }}
      >
        <SheetHeader className="border-b border-line">
          <SheetTitle>Filter</SheetTitle>
        </SheetHeader>

        <SheetBody className="pt-5 pb-8">
          <FilterPanel
            value={draft}
            onChange={onDraftChange}
            locations={locations}
            amenities={amenities}
            index={index}
            variant="sheet"
          />
        </SheetBody>

        <SheetFooter className="flex-col gap-2 shadow-sticky">
          {count === 0 ? (
            <p className="text-center text-sm font-medium text-ink-2">Coba naikkan budget atau pilih tipe lain.</p>
          ) : null}
          <p aria-live="polite" aria-atomic="true" className="sr-only">
            {count ? `${count} unit cocok` : "Tidak ada unit yang cocok"}
          </p>
          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="px-3"
              disabled={draftCount === 0}
              onClick={() => onDraftChange(clearFilters(draft))}
            >
              Reset
            </Button>
            <Button size="lg" className="px-3" disabled={count === 0} onClick={apply}>
              {count ? `Tampilkan ${count} unit` : "Tidak ada unit yang cocok"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
