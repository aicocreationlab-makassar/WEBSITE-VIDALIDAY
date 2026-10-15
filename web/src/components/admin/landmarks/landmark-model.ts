// Model daftar landmark admin (PRD 7.7). Fungsi murni (tanpa React/Supabase), ada unit test.
// Dipakai komponen klien, Server Action, dan lib/data/admin/content.ts.

import { sortBySortOrder } from "@/components/admin/locations/location-model";
import { normalizeSearch } from "@/lib/admin/unit-query";
import { isKnownIconName, resolveLandmarkIcon, type IconName } from "@/lib/icons";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

export type AdminLandmarkRow = {
  id: number;
  locationId: number;
  name: string;
  distanceTime: string;
  notes: string | null;
  /** Ikon tersimpan apa adanya (null/tidak dikenal = situs menebak dari nama). */
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
};

/** Baris mentah tabel `landmarks`. */
export type RawLandmark = {
  id: number;
  location_id: number;
  name: string;
  distance_time: string;
  notes: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
};

/** Apartemen untuk tab/pilihan (urut sort_order, termasuk yang nonaktif). */
export type LandmarkLocation = { id: number; name: string; shortName: string; isActive: boolean };

export type StatusChip = "semua" | "aktif" | "nonaktif";

export const STATUS_CHIPS: { value: StatusChip; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "aktif", label: "Aktif" },
  { value: "nonaktif", label: "Nonaktif" },
];

/** Nilai `?lokasi=` untuk semua apartemen. */
export const ALL_LOCATIONS = "semua";
export type LocationScope = number | typeof ALL_LOCATIONS;

export type LandmarkGroup = { location: LandmarkLocation; rows: AdminLandmarkRow[] };

// ---------------------------------------------------------------------------
// Pemetaan & urutan
// ---------------------------------------------------------------------------

export function toLandmarkRow(raw: RawLandmark): AdminLandmarkRow {
  return {
    id: raw.id,
    locationId: raw.location_id,
    name: raw.name,
    distanceTime: raw.distance_time,
    notes: raw.notes?.trim() ? raw.notes : null,
    icon: raw.icon,
    sortOrder: raw.sort_order,
    isActive: raw.is_active,
  };
}

/** Urutan tampil: sort_order lalu id (sama dengan halaman publik). */
export function sortLandmarks<T extends AdminLandmarkRow>(rows: readonly T[]): T[] {
  return sortBySortOrder(rows);
}

// ---------------------------------------------------------------------------
// Apartemen terpilih (?lokasi=)
// ---------------------------------------------------------------------------

/**
 * `?lokasi=` → apartemen yang ditampilkan. Kosong atau id yang tidak ada → apartemen pertama
 * (perilaku admin lama). "semua" → semua apartemen. Belum ada apartemen → "semua".
 */
export function parseLocationScope(
  value: string | string[] | null | undefined,
  locations: readonly Pick<LandmarkLocation, "id">[],
): LocationScope {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim().toLowerCase() ?? "";
  if (raw === ALL_LOCATIONS || locations.length === 0) return ALL_LOCATIONS;
  const id = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (locations.some((location) => location.id === id)) return id;
  return locations[0].id;
}

/** Apartemen awal untuk landmark baru: yang sedang dibuka, atau apartemen pertama. */
export function defaultLocationId(scope: LocationScope, locations: readonly Pick<LandmarkLocation, "id">[]): number | null {
  if (scope !== ALL_LOCATIONS) return scope;
  return locations[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Cari & saring
// ---------------------------------------------------------------------------

/** Setiap kata pencarian harus ada di nama, jarak, atau catatan (abaikan huruf besar dan tanda baca). */
export function matchesLandmark(row: Pick<AdminLandmarkRow, "name" | "distanceTime" | "notes">, query: string): boolean {
  const tokens = query.split(/\s+/).map(normalizeSearch).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalizeSearch([row.name, row.distanceTime, row.notes ?? ""].join(" "));
  return tokens.every((token) => haystack.includes(token));
}

export function matchesStatus(row: Pick<AdminLandmarkRow, "isActive">, chip: StatusChip): boolean {
  if (chip === "aktif") return row.isActive;
  if (chip === "nonaktif") return !row.isActive;
  return true;
}

export function inScope(row: Pick<AdminLandmarkRow, "locationId">, scope: LocationScope): boolean {
  return scope === ALL_LOCATIONS || row.locationId === scope;
}

export type LandmarkFilter = { scope: LocationScope; query: string; chip: StatusChip };

export function filterLandmarks<T extends AdminLandmarkRow>(rows: readonly T[], filter: LandmarkFilter): T[] {
  return sortLandmarks(
    rows.filter((row) => inScope(row, filter.scope) && matchesLandmark(row, filter.query) && matchesStatus(row, filter.chip)),
  );
}

/** Jumlah per chip status, dari apartemen terpilih + pencarian saat ini. */
export function statusCounts(rows: readonly AdminLandmarkRow[], scope: LocationScope, query: string): Record<StatusChip, number> {
  const base = rows.filter((row) => inScope(row, scope) && matchesLandmark(row, query));
  return {
    semua: base.length,
    aktif: base.filter((row) => row.isActive).length,
    nonaktif: base.filter((row) => !row.isActive).length,
  };
}

/** Jumlah landmark per apartemen (untuk label tab), tanpa memperhitungkan pencarian. */
export function countByLocation(rows: readonly Pick<AdminLandmarkRow, "locationId">[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const row of rows) counts.set(row.locationId, (counts.get(row.locationId) ?? 0) + 1);
  return counts;
}

/**
 * Kelompokkan baris (yang sudah disaring) per apartemen, sesuai urutan apartemen.
 * Landmark milik apartemen yang tidak ada di daftar ditaruh di akhir dengan nama cadangan.
 */
export function groupByLocation<T extends AdminLandmarkRow>(
  rows: readonly T[],
  locations: readonly LandmarkLocation[],
): { location: LandmarkLocation; rows: T[] }[] {
  const byLocation = new Map<number, T[]>();
  for (const row of rows) {
    const list = byLocation.get(row.locationId);
    if (list) list.push(row);
    else byLocation.set(row.locationId, [row]);
  }
  const groups: { location: LandmarkLocation; rows: T[] }[] = [];
  for (const location of locations) {
    const list = byLocation.get(location.id);
    if (list?.length) groups.push({ location, rows: sortLandmarks(list) });
    byLocation.delete(location.id);
  }
  for (const [id, list] of byLocation) {
    groups.push({ location: { id, name: `Apartemen #${id}`, shortName: `#${id}`, isActive: false }, rows: sortLandmarks(list) });
  }
  return groups;
}

/** Pencarian atau saringan status aktif: urutan naik/turun dimatikan supaya tidak menukar dengan baris tersembunyi. */
export function isFiltering(query: string, chip: StatusChip): boolean {
  return query.trim().length > 0 || chip !== "semua";
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

/** Urutan untuk landmark baru di satu apartemen: max + 1 (perilaku admin lama). */
export function nextSortOrder(rows: readonly Pick<AdminLandmarkRow, "locationId" | "sortOrder">[], locationId: number | null): number {
  let max = 0;
  for (const row of rows) if (row.locationId === locationId) max = Math.max(max, row.sortOrder);
  return max + 1;
}

/** Ikon belum dipilih admin (null atau nama tidak dikenal): situs menebak dari nama. */
export function isIconGuessed(icon: string | null | undefined): boolean {
  return !isKnownIconName(icon);
}

/** Ikon awal di form: ikon tersimpan, atau tebakan dari nama (baru: map-pin). */
export function initialLandmarkIcon(row: Pick<AdminLandmarkRow, "name" | "icon"> | null): IconName {
  return row ? resolveLandmarkIcon(row.name, row.icon) : "map-pin";
}

/** Teks konfirmasi hapus. */
export function landmarkDeleteDescription(locationName: string | null | undefined): string {
  const where = locationName ? `halaman ${locationName} dan detail unitnya` : "halaman apartemen dan detail unit";
  return `Landmark ini hilang dari ${where}. Tindakan ini tidak bisa dibatalkan.`;
}

export function landmarkCountLabel(count: number): string {
  return `${count} landmark`;
}
