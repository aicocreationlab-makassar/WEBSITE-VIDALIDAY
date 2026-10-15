"use client";

import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { activeFilterCount, sewaHref, type SewaFilter, type SortOption } from "@/lib/validation/filters";
import type { SearchIndexRow } from "@/types/domain";
import {
  clearFilters,
  filterChips,
  headingText,
  isSameFilter,
  normalizeFilter,
  type FilterChip,
  type SearchLocation,
} from "./filter-model";
import { FilterPanel, type AmenityChip } from "./filter-panel";
import { FilterSheet } from "./filter-sheet";
import { MOBILE_BAR, SEWA_COLUMNS, SIDEBAR_PANEL } from "./layout";
import { SortSelect, SortSheet } from "./sort-sheet";

type Props = {
  /** Filter yang sudah disanitasi server (sumber kebenaran URL). */
  filter: SewaFilter;
  total: number;
  /** Jumlah kartu yang dirender (hal × 12). */
  shown: number;
  hasMore: boolean;
  locations: SearchLocation[];
  amenities: AmenityChip[];
  /** Indeks ringkas semua unit published untuk angka langsung di panel filter. */
  index: SearchIndexRow[];
  /** Hasil (grid atau empty state) yang dirender di server. */
  children: React.ReactNode;
};

/** Judul di bawah tinggi header (60px mobile, 72px desktop) dianggap tidak terlihat. */
const HEADER_CLEARANCE = 80;

/**
 * Halaman hasil /sewa (PRD 6.3, DESIGN 4.7, UX 2.3). State filter ada di URL: setiap perubahan
 * router.push (Back mengembalikan filter sebelumnya), "Muat lebih banyak" router.replace tanpa gulir.
 * Selama navigasi, kontrol memakai nilai optimistis dan hasil diredupkan (aria-busy).
 */
export function SearchView({ filter, total, shown, hasMore, locations, amenities, index, children }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(filter);
  const [loadingMore, setLoadingMore] = useOptimistic(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  /** Posisi chip yang baru dihapus: fokus pindah ke chip berikutnya. */
  const chipFocus = useRef<number | null>(null);
  /** Indeks kartu pertama hasil "Muat lebih banyak": fokus pindah ke sana setelah dimuat. */
  const cardFocus = useRef<number | null>(null);

  const chips = filterChips(current, locations, amenities);
  const chipKey = chips.map((chip) => chip.id).join("|");

  useEffect(() => {
    const position = chipFocus.current;
    if (position === null) return;
    chipFocus.current = null;
    const buttons = chipsRef.current?.querySelectorAll<HTMLButtonElement>("button[data-chip]");
    const target = buttons?.length ? buttons[Math.min(position, buttons.length - 1)] : null;
    if (target) target.focus();
    else headingRef.current?.focus({ preventScroll: true });
  }, [chipKey]);

  useEffect(() => {
    const position = cardFocus.current;
    if (position === null || shown <= position) return;
    cardFocus.current = null;
    resultsRef.current
      ?.querySelectorAll<HTMLElement>('ul[aria-label="Hasil pencarian"] > li h2 a')
      [position]?.focus();
  }, [shown]);

  /** Terapkan filter baru (halaman kembali ke 1). false kalau tidak ada yang berubah. */
  function navigate(next: SewaFilter): boolean {
    const target = normalizeFilter(next, locations);
    if (isSameFilter(target, current)) return false;
    track("filter_apply", { filters: activeFilterCount(target), lokasi: target.lokasi, urut: target.urut });
    startTransition(() => {
      setCurrent(target);
      router.push(sewaHref(target), { scroll: false });
    });
    return true;
  }

  function revealHeading(focus: boolean) {
    const heading = headingRef.current;
    if (!heading) return;
    if (heading.getBoundingClientRect().top < HEADER_CLEARANCE) heading.scrollIntoView({ block: "start" });
    if (focus) heading.focus({ preventScroll: true });
  }

  function removeChip(position: number, chip: FilterChip) {
    chipFocus.current = position;
    navigate(chip.next);
  }

  function clearAll() {
    chipFocus.current = 0;
    navigate(clearFilters(current));
  }

  function sortBy(urut: SortOption) {
    if (navigate({ ...current, urut })) revealHeading(false);
  }

  /** Sidebar desktop: langsung diterapkan; awal hasil digulir ke layar kecuali saat harga digeser/diketik. */
  function applyFromSidebar(next: SewaFilter) {
    const priceChanged = next.min !== current.min || next.max !== current.max;
    if (navigate(next) && !priceChanged) revealHeading(false);
  }

  function loadMore() {
    cardFocus.current = shown;
    startTransition(() => {
      setLoadingMore(true);
      router.replace(sewaHref({ ...filter, hal: filter.hal + 1 }), { scroll: false });
    });
  }

  const dimmed = isPending && !loadingMore;

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
        <h1
          ref={headingRef}
          tabIndex={-1}
          data-testid="sewa-heading"
          aria-live="polite"
          aria-atomic="true"
          className="min-w-0 text-h1 font-extrabold tracking-tight text-ink outline-none md:text-h1-lg"
        >
          {headingText(total, filter, locations)}
        </h1>
        <SortSelect value={current.urut} onSelect={sortBy} className="hidden md:flex" />
      </div>

      {chips.length ? (
        <div
          ref={chipsRef}
          role="group"
          aria-label="Filter aktif"
          className="no-scrollbar -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          {chips.map((chip, position) => (
            <button
              key={chip.id}
              type="button"
              data-chip=""
              aria-label={`Hapus filter ${chip.label}`}
              onClick={() => removeChip(position, chip)}
              className="relative inline-flex h-9 max-w-[240px] shrink-0 items-center gap-1.5 rounded-full border border-line bg-white pr-2.5 pl-3.5 text-sm font-semibold text-ink transition-colors duration-150 ease-out after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] hover:border-subtle hover:bg-surface"
            >
              <span className="truncate">{chip.label}</span>
              <X className="size-4 shrink-0 text-ink-2" aria-hidden="true" />
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
          >
            Hapus semua
          </Button>
        </div>
      ) : null}

      <div className={MOBILE_BAR}>
        <div className="grid grid-cols-2 gap-2">
          <FilterSheet
            filter={current}
            locations={locations}
            amenities={amenities}
            index={index}
            onApply={navigate}
            onApplied={() => revealHeading(true)}
          />
          <SortSheet
            value={current.urut}
            onSelect={(urut) => navigate({ ...current, urut })}
            onChanged={() => revealHeading(false)}
          />
        </div>
      </div>

      <div className={cn("mt-4 md:mt-6", SEWA_COLUMNS)}>
        <aside aria-label="Filter" className="hidden md:block">
          <div className={SIDEBAR_PANEL}>
            <h2 className="mb-4 text-lg leading-6 font-bold text-ink">Filter</h2>
            <FilterPanel
              value={current}
              onChange={applyFromSidebar}
              locations={locations}
              amenities={amenities}
              index={index}
              variant="sidebar"
            />
          </div>
        </aside>

        <div
          ref={resultsRef}
          aria-busy={dimmed || undefined}
          className={cn("min-w-0 transition-opacity duration-200 ease-out", dimmed && "opacity-60")}
        >
          {children}

          {hasMore ? (
            <div className="mt-8 flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-muted">
                Menampilkan <span className="font-semibold text-ink-2 tabular-nums">{shown}</span> dari{" "}
                <span className="font-semibold text-ink-2 tabular-nums">{total}</span> unit
              </p>
              <Button
                variant="secondary"
                size="lg"
                className="min-w-[220px]"
                loading={loadingMore}
                disabled={isPending}
                onClick={loadMore}
              >
                Muat lebih banyak
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
