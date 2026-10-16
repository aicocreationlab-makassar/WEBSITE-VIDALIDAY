"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { activeFilterCount, type SewaFilter } from "@/lib/validation/filters";
import type { SearchIndexRow } from "@/types/domain";
import type { SearchLocation } from "./filter-model";
import type { AmenityChip } from "./filter-panel";

// Sheet (Radix Dialog) diunduh saat tombol Filter pertama kali ditekan, disorot, atau difokus.
const FilterSheetDialog = dynamic(() => import("./filter-sheet-dialog").then((mod) => mod.FilterSheetDialog), {
  ssr: false,
});

function preloadDialog() {
  void import("./filter-sheet-dialog");
}

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
 * Tombol "Filter (n)" + bottom sheet hampir layar penuh (mobile). Perubahan di draft; sheet
 * (FilterSheetDialog) menghitung "Tampilkan n unit" dan menerapkan draft.
 */
export function FilterSheet({ filter, locations, amenities, index, onApply, onApplied }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState(filter);
  const activeCount = activeFilterCount(filter);

  function openSheet() {
    setDraft(filter);
    setMounted(true);
    setOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="w-full px-3"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={preloadDialog}
        onFocus={preloadDialog}
        onClick={openSheet}
      >
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

      {mounted ? (
        <FilterSheetDialog
          open={open}
          onOpenChange={setOpen}
          draft={draft}
          onDraftChange={setDraft}
          locations={locations}
          amenities={amenities}
          index={index}
          onApply={onApply}
          onApplied={onApplied}
        />
      ) : null}
    </>
  );
}
