// Logika murni kotak pencarian hero (PRD 6.2, DESIGN 4.2/4.3): pilihan bawaan, jumlah unit,
// label field, rentang budget kustom, dan URL /sewa. Dipakai komponen klien dan diuji vitest.

import { BUDGET_PRESETS, presetFor, type BudgetPreset, type BudgetRange } from "@/lib/budget";
import { formatRupiah, formatRupiahShort } from "@/lib/format";
import { countMatches, priceBounds } from "@/lib/search-index";
import { EMPTY_FILTER, sewaHref, type SewaFilter } from "@/lib/validation/filters";
import type { LocationWithTypes, SearchIndexRow } from "@/types/domain";

/** Lebih dari ini, segmented control apartemen diganti dropdown (DESIGN 4.3). */
export const MAX_SEGMENTS = 3;

/** Batas atas harga yang diterima input kustom (sama dengan parseSewaFilter). */
const MAX_PRICE = 100_000_000;

export type HeroRoomType = { slug: string; name: string };

/** Apartemen versi ringkas untuk komponen klien (hanya yang perlu diserialisasi). */
export type HeroLocation = {
  slug: string;
  name: string;
  shortName: string;
  types: HeroRoomType[];
};

export type HeroState = {
  /** null hanya mungkin di mode dropdown ("Semua apartemen"). */
  lokasi: string | null;
  tipe: string | null;
  budget: BudgetRange;
};

export type HeroOption = {
  /** null = "Semua tipe" / "Semua harga" / "Semua apartemen". */
  value: string | null;
  label: string;
  /** Teks kanan: "9 unit", "belum tersedia", "tidak ada unit". */
  note: string;
  count: number;
  disabled: boolean;
};

export type PriceBounds = { min: number; max: number };

export const ANY_BUDGET: BudgetRange = { min: null, max: null };

// ---------------------------------------------------------------------------
// Data awal
// ---------------------------------------------------------------------------

/** Apartemen terdaftar → bentuk ringkas, urut sort_order (tipe kamar sudah urut dari data layer). */
export function toHeroLocations(locations: LocationWithTypes[]): HeroLocation[] {
  return [...locations]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((location) => ({
      slug: location.slug,
      name: location.name,
      shortName: location.shortName,
      types: [...location.roomTypes]
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
        .map((type) => ({ slug: type.slug, name: type.name })),
    }));
}

/** Hanya baris tersedia di apartemen yang tampil: cukup untuk semua angka di hero, payload kecil. */
export function toHeroIndex(index: SearchIndexRow[], locations: Pick<HeroLocation, "slug">[]): SearchIndexRow[] {
  const slugs = new Set(locations.map((location) => location.slug));
  return index.filter((row) => row.av && slugs.has(row.l));
}

export function usesDropdown(locations: HeroLocation[]): boolean {
  return locations.length > MAX_SEGMENTS;
}

/** Default: apartemen pertama (sort_order), semua tipe, semua harga. */
export function initialHeroState(locations: HeroLocation[]): HeroState {
  return { lokasi: locations[0]?.slug ?? null, tipe: null, budget: ANY_BUDGET };
}

/** Ganti apartemen → tipe kembali ke "Semua tipe". Budget tetap (niat harga tamu tidak berubah). */
export function withLokasi(state: HeroState, lokasi: string | null): HeroState {
  if (state.lokasi === lokasi) return state;
  return { ...state, lokasi, tipe: null };
}

export function findLocation(locations: HeroLocation[], lokasi: string | null): HeroLocation | null {
  if (!lokasi) return null;
  return locations.find((location) => location.slug === lokasi) ?? null;
}

function filterOf(
  lokasi: string | null,
  tipe: string | null,
  range: BudgetRange = ANY_BUDGET,
): Pick<SewaFilter, "lokasi" | "tipe" | "kategori" | "min" | "max" | "tamu" | "fasilitas" | "penuh"> {
  return { ...EMPTY_FILTER, lokasi, tipe: lokasi ? tipe : null, min: range.min, max: range.max };
}

// ---------------------------------------------------------------------------
// Ringkasan di bawah segmented control
// ---------------------------------------------------------------------------

export type HeroSummary = { available: number; minPrice: number | null };

export function heroSummary(index: SearchIndexRow[], lokasi: string | null): HeroSummary {
  let available = 0;
  let minPrice: number | null = null;
  for (const row of index) {
    if (!row.av || (lokasi && row.l !== lokasi)) continue;
    available += 1;
    if (minPrice === null || row.p < minPrice) minPrice = row.p;
  }
  return { available, minPrice };
}

/** Potongan teks ringkasan; harga dicetak tebal oleh komponen. */
export function heroSummaryParts(summary: HeroSummary): { lead: string; price: string | null } {
  if (summary.available === 0) return { lead: "Belum ada unit tersedia", price: null };
  return {
    lead: `${summary.available} unit tersedia`,
    price: summary.minPrice === null ? null : formatRupiahShort(summary.minPrice),
  };
}

/** "9 unit tersedia · mulai Rp250rb/malam" (sama dengan textContent elemen ringkasan). */
export function heroSummaryText(summary: HeroSummary): string {
  const { lead, price } = heroSummaryParts(summary);
  return price ? `${lead} · mulai ${price}/malam` : lead;
}

// ---------------------------------------------------------------------------
// Apartemen (mode dropdown), tipe kamar, budget
// ---------------------------------------------------------------------------

export function lokasiLabel(locations: HeroLocation[], lokasi: string | null): string {
  return findLocation(locations, lokasi)?.shortName ?? "Semua apartemen";
}

export function lokasiOptions(locations: HeroLocation[], index: SearchIndexRow[]): HeroOption[] {
  const total = countMatches(index, filterOf(null, null));
  return [
    { value: null, label: "Semua apartemen", note: `${total} unit`, count: total, disabled: false },
    ...locations.map((location) => {
      const count = countMatches(index, filterOf(location.slug, null));
      return {
        value: location.slug,
        label: location.shortName,
        note: count ? `${count} unit` : "Penuh",
        count,
        disabled: false,
      };
    }),
  ];
}

export function typeLabel(location: HeroLocation | null, tipe: string | null): string {
  if (!location || !tipe) return "Semua tipe";
  return location.types.find((type) => type.slug === tipe)?.name ?? "Semua tipe";
}

/** "Semua tipe" (total), lalu tiap tipe aktif dengan jumlah unit tersedia; 0 → nonaktif "belum tersedia". */
export function typeOptions(location: HeroLocation | null, index: SearchIndexRow[]): HeroOption[] {
  if (!location) return [];
  const total = countMatches(index, filterOf(location.slug, null));
  return [
    { value: null, label: "Semua tipe", note: `${total} unit`, count: total, disabled: false },
    ...location.types.map((type) => {
      const count = countMatches(index, filterOf(location.slug, type.slug));
      return {
        value: type.slug,
        label: type.name,
        note: count ? `${count} unit` : "belum tersedia",
        count,
        disabled: count === 0,
      };
    }),
  ];
}

export type BudgetOption = HeroOption & { preset: BudgetPreset };

/** Pilihan cepat budget dengan jumlah unit untuk apartemen + tipe terpilih. "Semua harga" tidak pernah nonaktif. */
export function budgetOptions(index: SearchIndexRow[], state: Pick<HeroState, "lokasi" | "tipe">): BudgetOption[] {
  return BUDGET_PRESETS.map((preset) => {
    const count = countMatches(index, filterOf(state.lokasi, state.tipe, preset));
    const always = preset.min === null && preset.max === null;
    return {
      preset,
      value: preset.id,
      label: preset.label,
      note: count ? `${count} unit` : "tidak ada unit",
      count,
      disabled: !always && count === 0,
    };
  });
}

/** id preset yang cocok persis dengan rentang aktif; null kalau rentang kustom. */
export function selectedPresetId(range: BudgetRange): string | null {
  return presetFor(range)?.id ?? null;
}

export function isCustomBudget(range: BudgetRange): boolean {
  return presetFor(range) === null;
}

/** Batas slider untuk apartemen terpilih (kelipatan Rp50.000); null kalau tidak ada unit tersedia. */
export function heroPriceBounds(index: SearchIndexRow[], lokasi: string | null): PriceBounds | null {
  return priceBounds(index, lokasi);
}

// ---------------------------------------------------------------------------
// Rentang kustom ("Atur sendiri")
// ---------------------------------------------------------------------------

/** Nilai input saat diketik; null = kosong. */
export type BudgetDraft = { min: number | null; max: number | null };

function clamp(value: number, bounds: PriceBounds): number {
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

/** Rentang aktif → nilai awal slider (kosong = batas apartemen). */
export function draftFromRange(range: BudgetRange, bounds: PriceBounds): { min: number; max: number } {
  return normalizeDraft({ min: range.min, max: range.max }, bounds);
}

/** Isi kosong dengan batas, jepit ke batas, dan tukar kalau minimum > maksimum. */
export function normalizeDraft(draft: BudgetDraft, bounds: PriceBounds): { min: number; max: number } {
  const a = clamp(draft.min ?? bounds.min, bounds);
  const b = clamp(draft.max ?? bounds.max, bounds);
  return a <= b ? { min: a, max: b } : { min: b, max: a };
}

/** Draft → rentang yang dipakai URL. Nilai yang menempel di batas berarti "tanpa batas" (URL tetap ringkas). */
export function rangeFromDraft(draft: BudgetDraft, bounds: PriceBounds): BudgetRange {
  const { min, max } = normalizeDraft(draft, bounds);
  return { min: min <= bounds.min ? null : min, max: max >= bounds.max ? null : max };
}

/** Jumlah unit dalam rentang kustom untuk apartemen + tipe terpilih. */
export function countInRange(
  index: SearchIndexRow[],
  state: Pick<HeroState, "lokasi" | "tipe">,
  range: BudgetRange,
): number {
  return countMatches(index, filterOf(state.lokasi, state.tipe, range));
}

/** "Rp350.000" / "350000" / "350.000" → 350000. Kosong atau bukan angka → null. */
export function parseRupiahInput(text: string): number | null {
  const digits = text.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number(digits.slice(0, 9));
  return Number.isSafeInteger(value) ? Math.min(value, MAX_PRICE) : null;
}

export function formatRupiahInput(value: number | null): string {
  return value === null ? "" : formatRupiah(value);
}

// ---------------------------------------------------------------------------
// Kirim
// ---------------------------------------------------------------------------

/** Nilai input tersembunyi; null = input dinonaktifkan supaya tidak ikut ke URL. */
export function hiddenValues(state: HeroState): { tipe: string | null; min: string | null; max: string | null } {
  return {
    tipe: state.lokasi && state.tipe ? state.tipe : null,
    min: state.budget.min ? String(state.budget.min) : null,
    max: state.budget.max ? String(state.budget.max) : null,
  };
}

/** URL tujuan; urutan param sama dengan GET form bawaan: lokasi, tipe, min, max. */
export function heroHref(state: HeroState): string {
  return sewaHref({ lokasi: state.lokasi, tipe: state.tipe, min: state.budget.min, max: state.budget.max });
}

/** Properti event `search_submit`: id preset, "kustom", atau null kalau budget tidak diatur. */
export function budgetEventId(range: BudgetRange): string | null {
  if (range.min === null && range.max === null) return null;
  return presetFor(range)?.id ?? "kustom";
}
