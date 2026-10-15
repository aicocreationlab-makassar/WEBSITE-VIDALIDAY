// Pencarian /sewa: filter, urut, paginasi atas katalog (fungsi murni, ada test).
// Katalog kecil (±50 unit) sehingga semua dikerjakan di memori, bukan di query PostgREST.

import { discountPercent } from "@/lib/pricing";
import { matchesRow, toSearchIndex, type FilterKey } from "@/lib/search-index";
import { PAGE_SIZE, type SewaFilter, type SortOption } from "@/lib/validation/filters";
import type { CatalogUnit, Popularity, SearchIndexRow } from "@/types/domain";

function priceFields(u: CatalogUnit) {
  return { normal_price: u.normalPrice, promo_price: u.promoPrice, is_promo_active: u.isPromoActive };
}

function byId(a: CatalogUnit, b: CatalogUnit) {
  return a.id - b.id;
}

/** Urutkan; unit penuh selalu di bawah (PRD 6.3). */
export function sortUnits(units: CatalogUnit[], urut: SortOption, popularity: Popularity = {}): CatalogUnit[] {
  const compare: Record<SortOption, (a: CatalogUnit, b: CatalogUnit) => number> = {
    // Unggulan → paling diminati 30 hari → harga terendah
    rekomendasi: (a, b) =>
      Number(b.isFeatured) - Number(a.isFeatured) ||
      (popularity[b.id] ?? 0) - (popularity[a.id] ?? 0) ||
      a.effectivePrice - b.effectivePrice ||
      a.sortOrder - b.sortOrder ||
      byId(a, b),
    termurah: (a, b) => a.effectivePrice - b.effectivePrice || byId(a, b),
    termahal: (a, b) => b.effectivePrice - a.effectivePrice || byId(a, b),
    diskon: (a, b) =>
      discountPercent(priceFields(b)) - discountPercent(priceFields(a)) ||
      a.effectivePrice - b.effectivePrice ||
      byId(a, b),
    terbaru: (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id,
  };
  return [...units].sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable) || compare[urut](a, b));
}

export type SearchResult = {
  /** Kartu yang ditampilkan: hal × 12. */
  items: CatalogUnit[];
  total: number;
  hasMore: boolean;
  page: number;
  /** Saran 3 unit terdekat saat hasil kosong. */
  suggestions: CatalogUnit[];
};

const RELAX_STEPS: FilterKey[][] = [
  ["harga"],
  ["harga", "tipe", "kategori"],
  ["harga", "tipe", "kategori", "tamu", "fasilitas"],
];

/** Saran saat kosong: longgarkan harga dulu, lalu tipe, lalu sisanya. Urut kedekatan harga. */
export function nearestUnits(
  catalog: CatalogUnit[],
  index: SearchIndexRow[],
  filter: SewaFilter,
  popularity: Popularity,
  limit = 3,
): CatalogUnit[] {
  const target = filter.max ?? filter.min;
  for (const ignore of RELAX_STEPS) {
    const ids = new Set(index.filter((row) => matchesRow(row, { ...filter, penuh: false }, ignore)).map((r) => r.id));
    const matched = catalog.filter((u) => ids.has(u.id));
    if (!matched.length) continue;
    const sorted =
      target !== null
        ? [...matched].sort(
            (a, b) => Math.abs(a.effectivePrice - target) - Math.abs(b.effectivePrice - target) || byId(a, b),
          )
        : sortUnits(matched, "rekomendasi", popularity);
    return sorted.slice(0, limit);
  }
  return sortUnits(
    catalog.filter((u) => u.isAvailable),
    "rekomendasi",
    popularity,
  ).slice(0, limit);
}

export function searchUnits(catalog: CatalogUnit[], filter: SewaFilter, popularity: Popularity = {}): SearchResult {
  const index = toSearchIndex(catalog);
  const ids = new Set(index.filter((row) => matchesRow(row, filter)).map((row) => row.id));
  const matched = sortUnits(
    catalog.filter((u) => ids.has(u.id)),
    filter.urut,
    popularity,
  );
  const shown = filter.hal * PAGE_SIZE;
  return {
    items: matched.slice(0, shown),
    total: matched.length,
    hasMore: matched.length > shown,
    page: filter.hal,
    suggestions: matched.length ? [] : nearestUnits(catalog, index, filter, popularity),
  };
}
