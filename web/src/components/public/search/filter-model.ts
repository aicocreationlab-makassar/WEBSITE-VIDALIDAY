// Logika murni halaman /sewa (PRD 5.4, 6.3; DESIGN 4.7; UX 2.3): sanitasi filter dari URL,
// chip filter aktif, facet fasilitas, opsi chip panel filter beserta jumlah unit, rentang budget,
// stepper tamu, dan normalisasi draft → filter. Dipakai server dan klien, diuji vitest.

import { BUDGET_PRESETS, budgetLabel, presetFor, type BudgetPreset, type BudgetRange } from "@/lib/budget";
import { formatRupiah } from "@/lib/format";
import type { IconName } from "@/lib/icons";
import { countMatches, priceBounds } from "@/lib/search-index";
import {
  CATEGORY_PARAMS,
  EMPTY_FILTER,
  SORT_OPTIONS,
  sewaHref,
  type SewaFilter,
  type SortOption,
} from "@/lib/validation/filters";
import {
  ROOM_CATEGORIES,
  type Amenity,
  type CatalogUnit,
  type LocationWithTypes,
  type RoomCategory,
  type SearchIndexRow,
} from "@/types/domain";

export type CategoryParam = (typeof CATEGORY_PARAMS)[number];

export type SearchRoomType = { slug: string; name: string; category: RoomCategory };

/** Apartemen versi ringkas untuk klien: cukup untuk chip, label, dan validasi tipe. */
export type SearchLocation = { slug: string; shortName: string; types: SearchRoomType[] };

export type AmenityFacet = { id: number; name: string; icon: IconName; unitCount: number };

/** Stepper tamu 1..10; 10 tampil "10+". */
export const MAX_GUESTS = 10;
/** Chip fasilitas yang langsung tampil sebelum "Lihat semua (n)" (UX G19). */
export const AMENITY_LIMIT = 10;
/** Fasilitas hanya jadi chip kalau dipakai minimal sekian unit published (UX G19). */
export const AMENITY_MIN_UNITS = 2;

const MAX_PRICE = 100_000_000;

// ---------------------------------------------------------------------------
// Data awal
// ---------------------------------------------------------------------------

/** Apartemen terdaftar → bentuk ringkas, urut sort_order (tipe kamar ikut urut sort_order). */
export function toSearchLocations(locations: LocationWithTypes[]): SearchLocation[] {
  return [...locations]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((location) => ({
      slug: location.slug,
      shortName: location.shortName,
      types: [...location.roomTypes]
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
        .map((type) => ({ slug: type.slug, name: type.name, category: type.category })),
    }));
}

export function findLocation(locations: SearchLocation[], slug: string | null): SearchLocation | null {
  if (!slug) return null;
  return locations.find((location) => location.slug === slug) ?? null;
}

export function categoryLabel(category: RoomCategory): string {
  return ROOM_CATEGORIES.find((item) => item.value === category)?.label ?? "Lainnya";
}

function toCategoryParam(value: string | null | undefined): CategoryParam | null {
  return (CATEGORY_PARAMS as readonly string[]).includes(value ?? "") ? (value as CategoryParam) : null;
}

export function sortLabel(urut: SortOption): string {
  return SORT_OPTIONS.find((option) => option.value === urut)?.label ?? SORT_OPTIONS[0].label;
}

/** "24 unit di Vida View" / "24 unit di semua apartemen" (H1 halaman). */
export function headingText(total: number, filter: Pick<SewaFilter, "lokasi">, locations: SearchLocation[]): string {
  return `${total} unit di ${findLocation(locations, filter.lokasi)?.shortName ?? "semua apartemen"}`;
}

// ---------------------------------------------------------------------------
// Normalisasi
// ---------------------------------------------------------------------------

/**
 * Bersihkan filter terhadap data yang ada: apartemen tidak terdaftar dibuang (beserta tipenya),
 * tipe harus milik apartemen itu, tipe mengalahkan kategori, harga ditukar kalau terbalik,
 * tamu 1 berarti tanpa filter. Halaman kembali ke 1 (dipakai setiap kali filter berubah).
 */
export function normalizeFilter(filter: SewaFilter, locations: SearchLocation[]): SewaFilter {
  const location = findLocation(locations, filter.lokasi);
  const tipe = location && filter.tipe && location.types.some((type) => type.slug === filter.tipe) ? filter.tipe : null;

  let min = filter.min !== null && filter.min > 0 ? Math.min(filter.min, MAX_PRICE) : null;
  let max = filter.max !== null && filter.max > 0 ? Math.min(filter.max, MAX_PRICE) : null;
  if (min !== null && max !== null && min > max) [min, max] = [max, min];

  return {
    ...filter,
    lokasi: location?.slug ?? null,
    tipe,
    // Tipe lebih spesifik; keduanya bersamaan hanya mungkin dari URL buatan tangan.
    kategori: tipe ? null : toCategoryParam(filter.kategori),
    min,
    max,
    tamu: filter.tamu !== null && filter.tamu > 1 ? Math.min(filter.tamu, 30) : null,
    fasilitas: [...new Set(filter.fasilitas)].sort((a, b) => a - b),
    hal: 1,
  };
}

/** Filter dari URL (sudah lolos parseSewaFilter) → filter yang cocok dengan data. Halaman dipertahankan. */
export function sanitizeFilter(
  filter: SewaFilter,
  locations: SearchLocation[],
  amenityIds: Iterable<number>,
): SewaFilter {
  const known = new Set(amenityIds);
  const clean = normalizeFilter(filter, locations);
  return { ...clean, fasilitas: clean.fasilitas.filter((id) => known.has(id)), hal: filter.hal };
}

/** Sama kalau URL-nya sama, tanpa memperhitungkan halaman. */
export function isSameFilter(a: SewaFilter, b: SewaFilter): boolean {
  return sewaHref({ ...a, hal: 1 }) === sewaHref({ ...b, hal: 1 });
}

/** Hapus semua filter, urutan tetap. */
export function clearFilters(filter: Pick<SewaFilter, "urut">): SewaFilter {
  return { ...EMPTY_FILTER, urut: filter.urut };
}

/**
 * Ganti apartemen. Ke apartemen tertentu: tipe dan kategori kembali ke "Semua tipe" (sama dengan hero).
 * Ke "Semua": tipe yang dipilih diteruskan sebagai kategorinya (Studio di Vida View → Studio di semua apartemen).
 */
export function withLokasi(filter: SewaFilter, lokasi: string | null, locations: SearchLocation[]): SewaFilter {
  if (filter.lokasi === lokasi) return filter;
  if (lokasi === null) {
    const type = findLocation(locations, filter.lokasi)?.types.find((item) => item.slug === filter.tipe);
    return { ...filter, lokasi: null, tipe: null, kategori: filter.kategori ?? toCategoryParam(type?.category), hal: 1 };
  }
  return { ...filter, lokasi, tipe: null, kategori: null, hal: 1 };
}

// ---------------------------------------------------------------------------
// Chip filter aktif
// ---------------------------------------------------------------------------

export type FilterChip = {
  id: string;
  label: string;
  /** Filter setelah chip ini dihapus. */
  next: SewaFilter;
};

/** Chip filter aktif berurutan: apartemen, tipe/kategori, budget, tamu, fasilitas, unit penuh. */
export function filterChips(
  filter: SewaFilter,
  locations: SearchLocation[],
  amenities: Pick<AmenityFacet, "id" | "name">[],
): FilterChip[] {
  const base: SewaFilter = { ...filter, hal: 1 };
  const chips: FilterChip[] = [];
  const location = findLocation(locations, filter.lokasi);

  if (location) {
    chips.push({ id: "lokasi", label: location.shortName, next: withLokasi(base, null, locations) });
    const type = filter.tipe ? location.types.find((item) => item.slug === filter.tipe) : undefined;
    if (type) chips.push({ id: "tipe", label: type.name, next: { ...base, tipe: null } });
  }
  if (filter.kategori) {
    chips.push({ id: "kategori", label: categoryLabel(filter.kategori), next: { ...base, kategori: null } });
  }
  if (filter.min !== null || filter.max !== null) {
    chips.push({
      id: "harga",
      label: budgetLabel({ min: filter.min, max: filter.max }),
      next: { ...base, min: null, max: null },
    });
  }
  if (filter.tamu !== null && filter.tamu > 1) {
    chips.push({ id: "tamu", label: `Min. ${filter.tamu} tamu`, next: { ...base, tamu: null } });
  }
  for (const id of filter.fasilitas) {
    const amenity = amenities.find((item) => item.id === id);
    if (amenity) {
      chips.push({
        id: `fasilitas-${id}`,
        label: amenity.name,
        next: { ...base, fasilitas: filter.fasilitas.filter((other) => other !== id) },
      });
    }
  }
  if (filter.penuh) chips.push({ id: "penuh", label: "Termasuk unit penuh", next: { ...base, penuh: false } });
  return chips;
}

// ---------------------------------------------------------------------------
// Fasilitas kamar (facet)
// ---------------------------------------------------------------------------

/**
 * Fasilitas yang layak jadi chip: aktif dan dipakai minimal 2 unit published, urut sort_order.
 * Fasilitas yang sedang dipilih selalu ikut supaya tidak ada filter aktif yang tersembunyi.
 */
export function amenityFacets(
  catalog: CatalogUnit[],
  amenities: Amenity[],
  selected: readonly number[] = [],
): AmenityFacet[] {
  const counts = new Map<number, number>();
  for (const unit of catalog) {
    for (const id of new Set(unit.amenities.map((amenity) => amenity.id))) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return amenities
    .filter((amenity) => amenity.isActive)
    .filter((amenity) => (counts.get(amenity.id) ?? 0) >= AMENITY_MIN_UNITS || selected.includes(amenity.id))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "id"))
    .map((amenity) => ({ id: amenity.id, name: amenity.name, icon: amenity.icon, unitCount: counts.get(amenity.id) ?? 0 }));
}

/** Chip yang tampil sebelum "Lihat semua": 10 pertama + yang terpilih di luar itu. */
export function visibleFacets<T extends { id: number }>(
  facets: T[],
  selected: readonly number[],
  expanded: boolean,
  limit = AMENITY_LIMIT,
): { visible: T[]; hidden: number } {
  if (expanded || facets.length <= limit) return { visible: facets, hidden: 0 };
  const visible = facets.filter((facet, position) => position < limit || selected.includes(facet.id));
  return { visible, hidden: facets.length - visible.length };
}

export function toggleAmenity(filter: SewaFilter, id: number): SewaFilter {
  const fasilitas = filter.fasilitas.includes(id)
    ? filter.fasilitas.filter((other) => other !== id)
    : [...filter.fasilitas, id].sort((a, b) => a - b);
  return { ...filter, fasilitas, hal: 1 };
}

// ---------------------------------------------------------------------------
// Opsi chip di panel filter (jumlah unit dihitung dari indeks, sama dengan server)
// ---------------------------------------------------------------------------

export type ChipOption = {
  /** null = opsi "Semua …". */
  value: string | null;
  label: string;
  count: number;
  selected: boolean;
  /** Nol hasil dan belum dipilih. Opsi "Semua …" tidak pernah nonaktif. */
  disabled: boolean;
};

function chipOption(value: string | null, label: string, count: number, selected: boolean): ChipOption {
  return { value, label, count, selected, disabled: value !== null && !selected && count === 0 };
}

/** "Semua" lalu tiap apartemen; jumlah = hasil kalau apartemen itu dipilih (dengan filter lain tetap). */
export function lokasiOptions(
  index: SearchIndexRow[],
  filter: SewaFilter,
  locations: SearchLocation[],
): ChipOption[] {
  return [
    chipOption(null, "Semua", countMatches(index, withLokasi(filter, null, locations)), filter.lokasi === null),
    ...locations.map((location) =>
      chipOption(
        location.slug,
        location.shortName,
        countMatches(index, withLokasi(filter, location.slug, locations)),
        filter.lokasi === location.slug,
      ),
    ),
  ];
}

const TYPE_PREFIX = "t:";
const CATEGORY_PREFIX = "k:";

/**
 * Apartemen dipilih: "Semua tipe" + tipe kamar aktif apartemen itu ("(0)" nonaktif).
 * Semua apartemen: "Semua tipe" + kategori Studio/1 Bedroom/2 Bedroom/3 Bedroom yang punya unit.
 * Nilai opsi: null, "t:<slug tipe>", atau "k:<kategori>".
 */
export function typeOptions(index: SearchIndexRow[], filter: SewaFilter, locations: SearchLocation[]): ChipOption[] {
  const location = findLocation(locations, filter.lokasi);
  const all = chipOption(
    null,
    "Semua tipe",
    countMatches(index, { ...filter, tipe: null, kategori: null }),
    !filter.tipe && !filter.kategori,
  );

  if (!location) {
    const categories = CATEGORY_PARAMS.filter(
      (category) => category === filter.kategori || index.some((row) => row.c === category),
    );
    return [
      all,
      ...categories.map((category) =>
        chipOption(
          `${CATEGORY_PREFIX}${category}`,
          categoryLabel(category),
          countMatches(index, { ...filter, tipe: null, kategori: category }),
          filter.kategori === category,
        ),
      ),
    ];
  }

  // Apartemen + kategori tanpa tipe (hanya dari URL): tampilkan sebagai pilihan yang aktif supaya terlihat.
  const categoryChip =
    filter.kategori && !filter.tipe
      ? [
          chipOption(
            `${CATEGORY_PREFIX}${filter.kategori}`,
            `Semua ${categoryLabel(filter.kategori)}`,
            countMatches(index, { ...filter, tipe: null }),
            true,
          ),
        ]
      : [];

  return [
    all,
    ...categoryChip,
    ...location.types.map((type) =>
      chipOption(
        `${TYPE_PREFIX}${type.slug}`,
        type.name,
        countMatches(index, { ...filter, tipe: type.slug, kategori: null }),
        filter.tipe === type.slug,
      ),
    ),
  ];
}

export function applyTypeOption(filter: SewaFilter, value: string | null): SewaFilter {
  if (value?.startsWith(TYPE_PREFIX)) {
    return { ...filter, tipe: value.slice(TYPE_PREFIX.length), kategori: null, hal: 1 };
  }
  if (value?.startsWith(CATEGORY_PREFIX)) {
    return { ...filter, tipe: null, kategori: toCategoryParam(value.slice(CATEGORY_PREFIX.length)), hal: 1 };
  }
  return { ...filter, tipe: null, kategori: null, hal: 1 };
}

export type BudgetOption = ChipOption & { preset: BudgetPreset };

/** Pilihan cepat budget dengan jumlah unit untuk filter lain yang sedang dipilih. */
export function budgetOptions(index: SearchIndexRow[], filter: SewaFilter): BudgetOption[] {
  const selectedId = presetFor({ min: filter.min, max: filter.max })?.id ?? null;
  return BUDGET_PRESETS.map((preset) => {
    const isAll = preset.min === null && preset.max === null;
    return {
      ...chipOption(
        isAll ? null : preset.id,
        preset.label,
        countMatches(index, { ...filter, min: preset.min, max: preset.max }),
        preset.id === selectedId,
      ),
      preset,
    };
  });
}

export function applyBudget(filter: SewaFilter, range: BudgetRange): SewaFilter {
  return { ...filter, min: range.min, max: range.max, hal: 1 };
}

// ---------------------------------------------------------------------------
// Rentang harga kustom (slider + input)
// ---------------------------------------------------------------------------

export type PriceBounds = { min: number; max: number };

/** Batas slider untuk apartemen terpilih (kelipatan Rp50.000); null kalau tidak ada unit tersedia. */
export function sliderBounds(index: SearchIndexRow[], lokasi: string | null): PriceBounds | null {
  return priceBounds(index, lokasi);
}

/** Isi kosong dengan batas, jepit ke batas, tukar kalau terbalik → nilai dua titik slider. */
export function clampRange(range: BudgetRange, bounds: PriceBounds): PriceBounds {
  const clamp = (value: number) => Math.min(bounds.max, Math.max(bounds.min, value));
  const a = clamp(range.min ?? bounds.min);
  const b = clamp(range.max ?? bounds.max);
  return a <= b ? { min: a, max: b } : { min: b, max: a };
}

/** Nilai slider/input → rentang URL. Nilai yang menempel di batas berarti "tanpa batas". */
export function rangeFromValues(range: BudgetRange, bounds: PriceBounds): BudgetRange {
  const { min, max } = clampRange(range, bounds);
  return { min: min <= bounds.min ? null : min, max: max >= bounds.max ? null : max };
}

/** Nilai ketikan boleh langsung dipakai (kosong, atau di dalam batas); selain itu tunggu blur/Enter. */
export function isCommittable(value: number | null, bounds: PriceBounds): boolean {
  return value === null || (value >= bounds.min && value <= bounds.max);
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
// Jumlah tamu
// ---------------------------------------------------------------------------

/** Nilai stepper: tanpa filter = 1, dibatasi 10. */
export function guestValue(tamu: number | null): number {
  return Math.min(Math.max(tamu ?? 1, 1), MAX_GUESTS);
}

export function guestDisplay(tamu: number | null): string {
  const value = guestValue(tamu);
  return value >= MAX_GUESTS ? `${MAX_GUESTS}+` : String(value);
}

/** Naik/turun satu; 1 tamu = tanpa filter (null). */
export function stepGuests(tamu: number | null, delta: 1 | -1): number | null {
  const next = Math.min(Math.max(guestValue(tamu) + delta, 1), MAX_GUESTS);
  return next <= 1 ? null : next;
}
