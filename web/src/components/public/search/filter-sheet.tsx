"use client";

import { useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { countMatches } from "@/lib/search-index";
import { activeFilterCount, type SewaFilter } from "@/lib/validation/filters";
import type { SearchIndexRow } from "@/types/domain";
import { clearFilters, normalizeFilter, type SearchLocation } from "./filter-model";
import { FilterPanel, type AmenityChip } from "./filter-panel";

type Props = {
  /** Filter aktif (optimistis). Draft diisi ulang darinya setiap kali sheet dibuka. */
  filter: SewaFilter;
  locations: SearchLocation[];
  amenities: AmenityChip[];
  index: SearchIndexRow[];
  /** Terapkan draft; true kalau URL berubah. */
  onApply: (next: SewaFilter) => boolean;
  /** Dipanggil setelah sheet tertutup karena filter diterapkan (fokus ke judul hasil). */
  onApplied: () => void;
};

/**
 * Tombol "Filter (n)" + bottom sheet hampir layar penuh (mobile). Perubahan di draft;
 * angka "Tampilkan n unit" dihitung langsung dari indeks dengan logika yang sama dengan server.
 */
export function FilterSheet({ filter, locations, amenities, index, onApply, onApplied }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filter);
  const applied = useRef(false);

  const activeCount = activeFilterCount(filter);
  const normalized = normalizeFilter(draft, locations);
  const count = countMatches(index, normalized);
  const draftCount = activeFilterCount(normalized);

  function handleOpenChange(next: boolean) {
    if (next) setDraft(filter);
    setOpen(next);
  }

  function apply() {
    applied.current = onApply(normalized);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="w-full px-3">
          <SlidersHorizontal aria-hidden="true" />
          Filter
          {activeCount ? (
            <>
              <span
                aria-hidden="true"
                className="inline-flex size-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white tabular-nums"
              >
                {activeCount}
              </span>
              <span className="sr-only">, {activeCount} aktif</span>
            </>
          ) : null}
        </Button>
      </SheetTrigger>

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
            onChange={setDraft}
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
              onClick={() => setDraft(clearFilters(draft))}
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
