// Filter halaman /sewa (PRD 5.4). Semua state ada di query URL.
// Parameter yang tidak valid diabaikan diam-diam (tidak pernah error).

import type { RoomCategory } from "@/types/domain";

export const SORT_OPTIONS = [
  { value: "rekomendasi", label: "Rekomendasi" },
  { value: "termurah", label: "Harga terendah" },
  { value: "termahal", label: "Harga tertinggi" },
  { value: "diskon", label: "Diskon terbesar" },
  { value: "terbaru", label: "Terbaru" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const CATEGORY_PARAMS = ["studio", "1br", "2br", "3br"] as const satisfies readonly RoomCategory[];

export const PAGE_SIZE = 12;
const MAX_PAGE = 50;
const MAX_PRICE = 100_000_000;

export type SewaFilter = {
  lokasi: string | null;
  /** Slug tipe kamar; hanya berlaku bersama `lokasi`. */
  tipe: string | null;
  kategori: (typeof CATEGORY_PARAMS)[number] | null;
  min: number | null;
  max: number | null;
  tamu: number | null;
  fasilitas: number[];
  penuh: boolean;
  urut: SortOption;
  hal: number;
};

export const EMPTY_FILTER: SewaFilter = {
  lokasi: null,
  tipe: null,
  kategori: null,
  min: null,
  max: null,
  tamu: null,
  fasilitas: [],
  penuh: false,
  urut: "rekomendasi",
  hal: 1,
};

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function first(params: RawParams, key: string): string | null {
  if (params instanceof URLSearchParams) return params.get(key);
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slug(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return v.length <= 80 && SLUG.test(v) ? v : null;
}

function int(value: string | null, min: number, max: number): number | null {
  if (!value || !/^\d{1,12}$/.test(value.trim())) return null;
  const n = Number(value.trim());
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}

/** searchParams → filter bersih. Aman untuk input apa pun. */
export function parseSewaFilter(params: RawParams): SewaFilter {
  const lokasi = slug(first(params, "lokasi"));
  const tipe = lokasi ? slug(first(params, "tipe")) : null;
  const kategoriRaw = first(params, "kategori")?.trim().toLowerCase() ?? null;
  const kategori = (CATEGORY_PARAMS as readonly string[]).includes(kategoriRaw ?? "")
    ? (kategoriRaw as SewaFilter["kategori"])
    : null;

  let min = int(first(params, "min"), 0, MAX_PRICE);
  let max = int(first(params, "max"), 0, MAX_PRICE);
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  if (min === 0) min = null;

  const fasilitas = [
    ...new Set(
      (first(params, "fasilitas") ?? "")
        .split(",")
        .map((part) => int(part, 1, 2_147_483_647))
        .filter((id): id is number => id !== null),
    ),
  ]
    .slice(0, 20)
    .sort((a, b) => a - b);

  const urutRaw = first(params, "urut");
  const urut = SORT_OPTIONS.some((option) => option.value === urutRaw)
    ? (urutRaw as SortOption)
    : "rekomendasi";

  return {
    lokasi,
    tipe,
    kategori,
    min,
    max,
    tamu: int(first(params, "tamu"), 1, 30),
    fasilitas,
    penuh: first(params, "penuh") === "1",
    urut,
    hal: int(first(params, "hal"), 1, MAX_PAGE) ?? 1,
  };
}

/** Filter → query string (tanpa nilai bawaan), urutan kunci stabil supaya URL bisa dibagikan. */
export function filterToSearchParams(filter: Partial<SewaFilter>): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.lokasi) params.set("lokasi", filter.lokasi);
  if (filter.lokasi && filter.tipe) params.set("tipe", filter.tipe);
  if (filter.kategori) params.set("kategori", filter.kategori);
  if (filter.min) params.set("min", String(filter.min));
  if (filter.max) params.set("max", String(filter.max));
  if (filter.tamu) params.set("tamu", String(filter.tamu));
  if (filter.fasilitas?.length) params.set("fasilitas", [...filter.fasilitas].sort((a, b) => a - b).join(","));
  if (filter.penuh) params.set("penuh", "1");
  if (filter.urut && filter.urut !== "rekomendasi") params.set("urut", filter.urut);
  if (filter.hal && filter.hal > 1) params.set("hal", String(filter.hal));
  return params;
}

export function sewaHref(filter: Partial<SewaFilter>): string {
  const query = filterToSearchParams(filter).toString();
  return query ? `/sewa?${query}` : "/sewa";
}

/** Jumlah grup filter aktif (untuk badge "Filter (n)"). Urutan dan halaman tidak dihitung. */
export function activeFilterCount(filter: SewaFilter): number {
  return [
    filter.lokasi,
    filter.tipe,
    filter.kategori,
    filter.min !== null || filter.max !== null ? "harga" : null,
    filter.tamu,
    filter.fasilitas.length ? "fasilitas" : null,
    filter.penuh ? "penuh" : null,
  ].filter(Boolean).length;
}
