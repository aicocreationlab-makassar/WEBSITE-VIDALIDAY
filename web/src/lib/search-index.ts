// Logika pencocokan filter yang sama untuk server (katalog) dan klien (indeks ringkas),
// supaya angka "Tampilkan n unit" di klien selalu sama dengan hasil server.

import type { CatalogUnit, SearchIndexRow } from "@/types/domain";
import type { SewaFilter } from "@/lib/validation/filters";

export type FilterKey = "lokasi" | "tipe" | "kategori" | "harga" | "tamu" | "fasilitas" | "penuh";

export function toSearchIndex(units: CatalogUnit[]): SearchIndexRow[] {
  return units.map((u) => ({
    id: u.id,
    l: u.locationSlug,
    t: u.roomTypeSlug,
    c: u.category,
    p: u.effectivePrice,
    g: u.maxGuests,
    a: u.amenities.map((a) => a.id),
    av: u.isAvailable,
  }));
}

/** Cocokkan satu baris indeks dengan filter. `ignore` melonggarkan grup tertentu. */
export function matchesRow(
  row: SearchIndexRow,
  filter: Pick<SewaFilter, "lokasi" | "tipe" | "kategori" | "min" | "max" | "tamu" | "fasilitas" | "penuh">,
  ignore: FilterKey[] = [],
): boolean {
  const skip = (key: FilterKey) => ignore.includes(key);
  if (!skip("penuh") && !filter.penuh && !row.av) return false;
  if (!skip("lokasi") && filter.lokasi && row.l !== filter.lokasi) return false;
  if (!skip("tipe") && filter.lokasi && filter.tipe && row.t !== filter.tipe) return false;
  if (!skip("kategori") && filter.kategori && row.c !== filter.kategori) return false;
  if (!skip("harga")) {
    if (filter.min !== null && row.p < filter.min) return false;
    if (filter.max !== null && row.p > filter.max) return false;
  }
  if (!skip("tamu") && filter.tamu !== null && row.g < filter.tamu) return false;
  if (!skip("fasilitas") && filter.fasilitas.length && !filter.fasilitas.every((id) => row.a.includes(id))) {
    return false;
  }
  return true;
}

export function countMatches(
  rows: SearchIndexRow[],
  filter: Parameters<typeof matchesRow>[1],
  ignore: FilterKey[] = [],
): number {
  let count = 0;
  for (const row of rows) if (matchesRow(row, filter, ignore)) count += 1;
  return count;
}

export const PRICE_STEP = 50_000;

/** Batas slider budget: harga terendah dibulatkan ke bawah, tertinggi ke atas (kelipatan Rp50.000). */
export function priceBounds(rows: SearchIndexRow[], lokasi?: string | null): { min: number; max: number } | null {
  const prices = rows.filter((r) => r.av && (!lokasi || r.l === lokasi)).map((r) => r.p);
  if (!prices.length) return null;
  const min = Math.floor(Math.min(...prices) / PRICE_STEP) * PRICE_STEP;
  let max = Math.ceil(Math.max(...prices) / PRICE_STEP) * PRICE_STEP;
  if (max <= min) max = min + PRICE_STEP;
  return { min, max };
}
