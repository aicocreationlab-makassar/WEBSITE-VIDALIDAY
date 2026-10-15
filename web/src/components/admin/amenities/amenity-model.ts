// Model daftar fasilitas kamar admin (PRD 7.6). Fungsi murni, ada unit test.

import { normalizeSearch } from "@/lib/admin/unit-query";
import { resolveIconName } from "@/lib/icons";

export type AdminAmenityRow = {
  id: number;
  name: string;
  /** Nama ikon tersimpan di DB (apa adanya). */
  icon: string;
  sortOrder: number;
  isActive: boolean;
  /** Jumlah unit yang memakai fasilitas ini (unit_amenities). */
  usage: number;
};

export type AmenityChip = "semua" | "tanpa-ikon" | "nonaktif";

export const AMENITY_CHIPS: { value: AmenityChip; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "tanpa-ikon", label: "Ikon belum dipilih" },
  { value: "nonaktif", label: "Nonaktif" },
];

/** Baris mentah dari `amenities` + embed `unit_amenities(count)`. */
export type RawAmenity = {
  id: number;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  unit_amenities?: unknown;
};

/** `unit_amenities(count)` dari PostgREST berbentuk `[{ count: n }]`. */
export function usageCount(embed: unknown): number {
  if (!Array.isArray(embed) || embed.length === 0) return 0;
  const first: unknown = embed[0];
  if (first && typeof first === "object" && "count" in first) {
    const n = Number((first as { count: unknown }).count);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  // Bentuk lain (daftar baris relasi) dihitung panjangnya.
  return embed.length;
}

export function toAmenityRow(raw: RawAmenity): AdminAmenityRow {
  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon ?? "",
    sortOrder: raw.sort_order,
    isActive: raw.is_active,
    usage: usageCount(raw.unit_amenities),
  };
}

/** Urutan tampil: sort_order, lalu nama (sama dengan form unit). */
export function sortAmenities(rows: AdminAmenityRow[]): AdminAmenityRow[] {
  return [...rows].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "id", { sensitivity: "base" }) || a.id - b.id,
  );
}

/**
 * Ikon belum dipilih: tersimpan "check" (hasil backfill data lama), kosong, atau nama yang
 * tidak dikenal registry (situs lalu menebak ikon dari nama).
 */
export function needsIcon(icon: string | null | undefined): boolean {
  return resolveIconName(icon, "check") === "check";
}

/** Setiap kata pencarian harus ada di nama (abaikan huruf besar, spasi, tanda baca). */
export function matchesAmenity(row: Pick<AdminAmenityRow, "name">, query: string): boolean {
  const tokens = query.split(/\s+/).map(normalizeSearch).filter(Boolean);
  if (!tokens.length) return true;
  const name = normalizeSearch(row.name);
  return tokens.every((token) => name.includes(token));
}

export function matchesChip(row: AdminAmenityRow, chip: AmenityChip): boolean {
  if (chip === "tanpa-ikon") return needsIcon(row.icon);
  if (chip === "nonaktif") return !row.isActive;
  return true;
}

export function filterAmenities(rows: AdminAmenityRow[], query: string, chip: AmenityChip): AdminAmenityRow[] {
  return rows.filter((row) => matchesAmenity(row, query) && matchesChip(row, chip));
}

/** Jumlah per chip, dihitung dari hasil pencarian saat ini. */
export function chipCounts(rows: AdminAmenityRow[], query: string): Record<AmenityChip, number> {
  const base = rows.filter((row) => matchesAmenity(row, query));
  return {
    semua: base.length,
    "tanpa-ikon": base.filter((row) => matchesChip(row, "tanpa-ikon")).length,
    nonaktif: base.filter((row) => matchesChip(row, "nonaktif")).length,
  };
}

/** Urutan untuk fasilitas baru: max + 1 (perilaku admin lama, tanpa bug count + 1). */
export function nextSortOrder(rows: Pick<AdminAmenityRow, "sortOrder">[]): number {
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), 0) + 1;
}

/** "Dipakai 3 unit" (juga "Dipakai 0 unit", supaya kolom konsisten). */
export function usageLabel(usage: number): string {
  return `Dipakai ${usage} unit`;
}

/** Teks konfirmasi hapus: relasi unit_amenities ikut terhapus (cascade). */
export function deleteDescription(usage: number): string {
  return `Dihapus dari ${usage} unit.`;
}
