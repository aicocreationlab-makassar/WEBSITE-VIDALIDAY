// Model daftar fasilitas gedung admin (PRD 7.7). Fungsi murni (tanpa React/Supabase), ada unit test.
// Dipakai komponen klien, Server Action (rencana urutan, validasi foto), dan lib/data/admin/facilities.ts.

import { planReorder, sortBySortOrder, type SortItem } from "@/components/admin/locations/location-model";
import { normalizeSearch } from "@/lib/admin/unit-query";
import { isBucketPath, isExternalUrl, isStockPhoto, mediaUrl, normalizeStoragePath } from "@/lib/media";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

/** Apartemen untuk filter, form, dan judul grup. */
export type FacilityLocation = { id: number; name: string; isActive: boolean };

export type AdminFacilityRow = {
  id: number;
  locationId: number;
  name: string;
  description: string | null;
  /** Ikon tersimpan di DB apa adanya ("" kalau kosong). */
  icon: string;
  /** Kolom `image` apa adanya (path bucket atau URL), null kalau kosong. */
  image: string | null;
  /** Foto yang tampil di situs (bukan foto stok), null = tile ikon. */
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

/** Baris mentah dari tabel `facilities` (kolom urutan/aktif dari migrasi 0003). */
export type RawFacility = {
  id: number;
  location_id: number;
  name: string;
  icon: string | null;
  description: string | null;
  image: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

export type FacilityStatus = "semua" | "aktif" | "nonaktif";

/** State filter di query URL: `?lokasi=<id>&q=<teks>&status=aktif|nonaktif`. */
export type FacilityFilter = { lokasi: number | null; q: string; status: FacilityStatus };

export const EMPTY_FACILITY_FILTER: FacilityFilter = { lokasi: null, q: "", status: "semua" };

export const FACILITY_STATUS_CHIPS: { value: FacilityStatus; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "aktif", label: "Aktif" },
  { value: "nonaktif", label: "Nonaktif" },
];

export const FACILITY_NAME_MAX = 120;
export const FACILITY_DESCRIPTION_MAX = 300;

/** Pesan kalau kolom sort_order/is_active belum ada (migrasi 0003 belum dijalankan). */
export const MIGRATION_0003_MESSAGE = "Jalankan migrasi 0003 dulu (lihat docs/PROGRESS.md).";

// ---------------------------------------------------------------------------
// Baris
// ---------------------------------------------------------------------------

/** Foto yang dipakai situs: foto stok Unsplash dari data lama dianggap tidak ada (sama dengan halaman apartemen). */
export function facilityPhotoUrl(image: string | null | undefined): string | null {
  if (!image || isStockPhoto(image)) return null;
  return mediaUrl(image);
}

export function toFacilityRow(raw: RawFacility): AdminFacilityRow {
  const description = raw.description?.trim() || null;
  const image = raw.image?.trim() || null;
  return {
    id: raw.id,
    locationId: raw.location_id,
    name: raw.name.trim(),
    description,
    icon: raw.icon?.trim() ?? "",
    image,
    imageUrl: facilityPhotoUrl(image),
    sortOrder: Number.isFinite(Number(raw.sort_order)) ? Number(raw.sort_order) : 0,
    isActive: raw.is_active !== false,
  };
}

/** Urutan tampil: urutan apartemen (seperti di menu), lalu sort_order, lalu id (sama dengan halaman publik). */
export function sortFacilities(rows: readonly AdminFacilityRow[], locations: readonly FacilityLocation[]): AdminFacilityRow[] {
  const rank = new Map(locations.map((location, index) => [location.id, index]));
  const rankOf = (id: number) => rank.get(id) ?? Number.MAX_SAFE_INTEGER;
  return [...rows].sort(
    (a, b) => rankOf(a.locationId) - rankOf(b.locationId) || a.locationId - b.locationId || a.sortOrder - b.sortOrder || a.id - b.id,
  );
}

// ---------------------------------------------------------------------------
// Filter di URL
// ---------------------------------------------------------------------------

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(source: ParamSource, key: string): string {
  if (source instanceof URLSearchParams) return source.get(key) ?? "";
  const value = source[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseFacilityFilter(source: ParamSource): FacilityFilter {
  const lokasi = Number(readParam(source, "lokasi"));
  const status = readParam(source, "status");
  return {
    lokasi: Number.isInteger(lokasi) && lokasi > 0 ? lokasi : null,
    q: readParam(source, "q").trim().slice(0, 100),
    status: status === "aktif" || status === "nonaktif" ? status : "semua",
  };
}

/** Query string untuk filter (tanpa "?"); kosong kalau semua bawaan. */
export function facilityFilterQuery(filter: FacilityFilter): string {
  const params = new URLSearchParams();
  if (filter.lokasi) params.set("lokasi", String(filter.lokasi));
  if (filter.q.trim()) params.set("q", filter.q.trim());
  if (filter.status !== "semua") params.set("status", filter.status);
  return params.toString();
}

/** Pencarian atau filter status aktif: sebagian fasilitas disembunyikan dari daftar. */
export function isNarrowed(filter: FacilityFilter): boolean {
  return filter.q.trim() !== "" || filter.status !== "semua";
}

export function hasActiveFilter(filter: FacilityFilter): boolean {
  return filter.lokasi !== null || isNarrowed(filter);
}

/** Apartemen dari URL yang sudah tidak ada diabaikan. */
export function sanitizeFilter(filter: FacilityFilter, locations: readonly FacilityLocation[]): FacilityFilter {
  if (filter.lokasi === null || locations.some((location) => location.id === filter.lokasi)) return filter;
  return { ...filter, lokasi: null };
}

// ---------------------------------------------------------------------------
// Pencarian, status, grup per apartemen
// ---------------------------------------------------------------------------

/** Setiap kata pencarian harus ada di nama, deskripsi, atau nama apartemen (abaikan huruf besar dan tanda baca). */
export function matchesFacilityQuery(
  row: Pick<AdminFacilityRow, "name" | "description">,
  query: string,
  locationName = "",
): boolean {
  const tokens = query.split(/\s+/).map(normalizeSearch).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalizeSearch([row.name, row.description ?? "", locationName].join(" "));
  return tokens.every((token) => haystack.includes(token));
}

export function matchesStatus(row: Pick<AdminFacilityRow, "isActive">, status: FacilityStatus): boolean {
  if (status === "aktif") return row.isActive;
  if (status === "nonaktif") return !row.isActive;
  return true;
}

function locationNames(locations: readonly FacilityLocation[]): Map<number, string> {
  return new Map(locations.map((location) => [location.id, location.name]));
}

/** Fasilitas yang cocok dengan apartemen + pencarian (tanpa status), dasar hitungan chip. */
function baseRows(rows: readonly AdminFacilityRow[], filter: FacilityFilter, locations: readonly FacilityLocation[]) {
  const names = locationNames(locations);
  return rows.filter(
    (row) =>
      (filter.lokasi === null || row.locationId === filter.lokasi) &&
      matchesFacilityQuery(row, filter.q, names.get(row.locationId) ?? ""),
  );
}

export function filterFacilities(
  rows: readonly AdminFacilityRow[],
  filter: FacilityFilter,
  locations: readonly FacilityLocation[],
): AdminFacilityRow[] {
  return baseRows(rows, filter, locations).filter((row) => matchesStatus(row, filter.status));
}

/** Jumlah per chip status, dihitung dari apartemen + pencarian saat ini. */
export function statusCounts(
  rows: readonly AdminFacilityRow[],
  filter: FacilityFilter,
  locations: readonly FacilityLocation[],
): Record<FacilityStatus, number> {
  const base = baseRows(rows, filter, locations);
  return {
    semua: base.length,
    aktif: base.filter((row) => row.isActive).length,
    nonaktif: base.filter((row) => !row.isActive).length,
  };
}

export type FacilityGroup = {
  location: FacilityLocation;
  /** Fasilitas yang lolos filter, urut tampil. */
  items: AdminFacilityRow[];
  /** Semua fasilitas di apartemen ini (tanpa filter). */
  total: number;
};

/**
 * Grup per apartemen (seperti admin lama: satu kartu per apartemen). Tanpa pencarian/status, apartemen
 * tanpa fasilitas tetap tampil (empty state yang mengarahkan); dengan pencarian/status, grup kosong disembunyikan.
 */
export function groupFacilities(
  rows: readonly AdminFacilityRow[],
  filter: FacilityFilter,
  locations: readonly FacilityLocation[],
): FacilityGroup[] {
  const visible = sortFacilities(filterFacilities(rows, filter, locations), locations);
  const narrowed = isNarrowed(filter);
  const scope = filter.lokasi === null ? locations : locations.filter((location) => location.id === filter.lokasi);
  return scope
    .map((location) => ({
      location,
      items: visible.filter((row) => row.locationId === location.id),
      total: rows.filter((row) => row.locationId === location.id).length,
    }))
    .filter((group) => !narrowed || group.items.length > 0);
}

/** "3 fasilitas" atau "1 dari 3 fasilitas" saat disaring. */
export function groupCountLabel(group: Pick<FacilityGroup, "items" | "total">, narrowed: boolean): string {
  return narrowed && group.items.length !== group.total
    ? `${group.items.length} dari ${group.total} fasilitas`
    : `${group.total} fasilitas`;
}

// ---------------------------------------------------------------------------
// Urutan (naik/turun di dalam apartemen yang sama)
// ---------------------------------------------------------------------------

function siblingItems(rows: readonly AdminFacilityRow[], locationId: number): SortItem[] {
  return rows.filter((row) => row.locationId === locationId).map((row) => ({ id: row.id, sortOrder: row.sortOrder }));
}

/** Posisi pertama/terakhir tiap fasilitas di apartemennya (untuk menonaktifkan tombol naik/turun). */
export function orderEdges(rows: readonly AdminFacilityRow[]): Map<number, { isFirst: boolean; isLast: boolean }> {
  const edges = new Map<number, { isFirst: boolean; isLast: boolean }>();
  const locationIds = [...new Set(rows.map((row) => row.locationId))];
  for (const locationId of locationIds) {
    const sorted = sortBySortOrder(siblingItems(rows, locationId));
    sorted.forEach((item, index) => edges.set(item.id, { isFirst: index === 0, isLast: index === sorted.length - 1 }));
  }
  return edges;
}

/**
 * Rencana perubahan sort_order untuk memindah satu fasilitas naik/turun satu posisi,
 * ditukar dengan tetangga di apartemen yang SAMA. null = tidak ada atau sudah di ujung.
 */
export function planFacilityReorder(
  rows: readonly Pick<AdminFacilityRow, "id" | "locationId" | "sortOrder">[],
  id: number,
  direction: "up" | "down",
): SortItem[] | null {
  const target = rows.find((row) => row.id === id);
  if (!target) return null;
  const siblings = rows
    .filter((row) => row.locationId === target.locationId)
    .map((row) => ({ id: row.id, sortOrder: row.sortOrder }));
  return planReorder(siblings, id, direction);
}

/** Terapkan rencana urutan ke daftar (tampilan optimistis). */
export function applyFacilityOrder<T extends { id: number; sortOrder: number }>(rows: readonly T[], updates: readonly SortItem[]): T[] {
  const byId = new Map(updates.map((update) => [update.id, update.sortOrder]));
  return rows.map((row) => {
    const sortOrder = byId.get(row.id);
    return sortOrder === undefined ? row : { ...row, sortOrder };
  });
}

/** Urutan bawaan fasilitas baru: max + 1 di apartemen yang sama (perilaku admin lama, tanpa bug count + 1). */
export function nextFacilitySortOrder(
  rows: readonly Pick<AdminFacilityRow, "id" | "locationId" | "sortOrder">[],
  locationId: number | null | undefined,
  excludeId?: number,
): number {
  if (!locationId) return 1;
  return (
    rows
      .filter((row) => row.locationId === locationId && row.id !== excludeId)
      .reduce((max, row) => Math.max(max, row.sortOrder), 0) + 1
  );
}

// ---------------------------------------------------------------------------
// Foto
// ---------------------------------------------------------------------------

const UPLOAD_PATTERN = /^facilities\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i;

/** Hasil unggahan baru dari browser (`facilities/<uuid>.webp`, lib/upload/upload.ts). */
export function isFacilityUploadPath(value: string | null | undefined): value is string {
  return typeof value === "string" && UPLOAD_PATTERN.test(value.trim());
}

/** Nilai foto sama (persis, atau path bucket yang sama setelah dinormalkan). */
export function sameImage(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = a?.trim() || null;
  const right = b?.trim() || null;
  if (left === right) return true;
  if (!left || !right) return false;
  return isBucketPath(left) && isBucketPath(right) && normalizeStoragePath(left) === normalizeStoragePath(right);
}

/**
 * Foto yang boleh disimpan: kosong, nilai lama yang tidak berubah, atau path bucket di folder
 * `facilities/` (hasil pengunggah). URL luar baru dan path folder lain ditolak.
 */
export function isAcceptableFacilityImage(next: string | null | undefined, current: string | null | undefined): boolean {
  const value = next?.trim() || null;
  if (value === null || sameImage(value, current)) return true;
  if (isExternalUrl(value) || value.includes("..") || value.includes("\\")) return false;
  return normalizeStoragePath(value).startsWith("facilities/");
}

/** Path bucket yang boleh dihapus saat foto diganti/dihapus (URL luar diabaikan). */
export function replacedImagePath(before: string | null | undefined, after: string | null | undefined): string | null {
  if (!isBucketPath(before) || sameImage(before, after)) return null;
  return normalizeStoragePath(before);
}

// ---------------------------------------------------------------------------
// Teks
// ---------------------------------------------------------------------------

/** Isi dialog hapus. */
export function deleteFacilityDescription(row: Pick<AdminFacilityRow, "image">): string {
  return row.image ? "Foto ikut terhapus." : "Fasilitas ini hilang dari halaman apartemen.";
}

/** Toast setelah switch aktif diubah. */
export function toggleFacilityMessage(name: string, isActive: boolean): string {
  return isActive ? `${name} tampil lagi di halaman apartemen` : `${name} disembunyikan dari halaman apartemen`;
}

/** Galat PostgREST karena kolom belum ada (42703 saat select, PGRST204 saat insert/update). */
export function isMissingColumnError(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}
