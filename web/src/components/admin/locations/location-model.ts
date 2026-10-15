// Model admin apartemen & tipe kamar (PRD 7.5). Fungsi murni (tanpa React/Supabase), ada unit test.
// Dipakai komponen klien, Server Action (pesan, rencana urutan), dan lib/data/admin/locations.ts.

import { z } from "zod";
import { parseGmapsCoordinates, isShortGmapsLink } from "@/lib/gmaps";
import { isStockPhoto, locationImageUrl } from "@/lib/media";
import { slugify } from "@/lib/slug";
import { ROOM_CATEGORY_VALUES, locationSchema, type LocationInput, type RoomTypeInput } from "@/lib/validation/admin";
import { ROOM_CATEGORIES } from "@/types/domain";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

export type RoomCategoryValue = (typeof ROOM_CATEGORY_VALUES)[number];

/** Kartu di daftar apartemen. */
export type AdminLocationCard = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  area: string | null;
  /** Foto yang dipakai situs (foto unggahan atau foto gedung bawaan), null kalau tidak ada. */
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  unitCount: number;
  publishedUnitCount: number;
  roomTypeCount: number;
};

export type AdminRoomTypeRow = {
  id: number;
  locationId: number;
  name: string;
  slug: string;
  category: RoomCategoryValue;
  defaultMaxGuests: number | null;
  sortOrder: number;
  isActive: boolean;
  /** Jumlah unit (termasuk draft) yang memakai tipe ini. */
  unitCount: number;
};

/** Data halaman ubah apartemen. */
export type AdminLocationDetail = {
  id: number;
  slug: string;
  name: string;
  isActive: boolean;
  /** Nilai awal form (LocationInput). */
  values: LocationInput;
  /** Ada foto gedung bawaan untuk slug ini (dipakai situs kalau foto kosong). */
  hasFallbackImage: boolean;
  unitCount: number;
  publishedUnitCount: number;
  /** Unit di apartemen ini yang belum punya tipe kamar. */
  unitsWithoutType: number;
  roomTypes: AdminRoomTypeRow[];
};

// Baris mentah dari Supabase (kolom yang dipilih di lib/data/admin/locations.ts).
export type RawLocation = {
  id: number;
  slug: string;
  name: string;
  short_name: string | null;
  area: string | null;
  hero_image: string | null;
  sort_order: number;
  is_active: boolean;
};

export type RawLocationFull = RawLocation & {
  address: string | null;
  gmaps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  tagline: string | null;
  description: string | null;
};

export type RawRoomType = {
  id: number;
  location_id: number;
  name: string;
  slug: string;
  category: string;
  default_max_guests: number | null;
  sort_order: number;
  is_active: boolean;
};

export type RawUnitRef = { location_id: number; room_type_id: number | null; is_published: boolean };

// ---------------------------------------------------------------------------
// Skema form tambah apartemen (sub-skema dari locationSchema, dipakai klien & server)
// ---------------------------------------------------------------------------

export const newLocationSchema = locationSchema.pick({ name: true, shortName: true, slug: true });
export type NewLocationInput = z.input<typeof newLocationSchema>;
export type NewLocationData = z.output<typeof newLocationSchema>;

export const SHORT_NAME_MAX = 16;
export const LOCATION_NAME_MAX = 120;
export const ROOM_TYPE_NAME_MAX = 60;

// ---------------------------------------------------------------------------
// Pesan (dipakai UI dan Server Action supaya sama persis)
// ---------------------------------------------------------------------------

export const LOCATION_SLUG_TAKEN = "Slug sudah dipakai apartemen lain.";
export const ROOM_TYPE_SLUG_TAKEN = "Slug tipe sudah dipakai di apartemen ini.";
export const NEW_LOCATION_NOTE = "Aktifkan setelah tipe kamar dan unit siap.";

export function locationInUseMessage(unitCount: number | null): string {
  return unitCount && unitCount > 0
    ? `Apartemen masih punya ${unitCount} unit. Nonaktifkan saja?`
    : "Apartemen masih punya unit. Nonaktifkan saja?";
}

export function roomTypeInUseMessage(unitCount: number | null): string {
  return unitCount && unitCount > 0
    ? `${unitCount} unit memakai tipe ini. Nonaktifkan saja?`
    : "Tipe ini masih dipakai unit. Nonaktifkan saja?";
}

export type DeleteState = {
  canDelete: boolean;
  /** Penjelasan kenapa tidak bisa dihapus (null kalau bisa). */
  message: string | null;
  /** Tawarkan tombol "Nonaktifkan" sebagai gantinya. */
  offerDeactivate: boolean;
};

/** Apartemen hanya bisa dihapus kalau tidak punya unit (DB juga menolak: FK restrict). */
export function locationDeleteState(unitCount: number, isActive: boolean): DeleteState {
  if (unitCount <= 0) return { canDelete: true, message: null, offerDeactivate: false };
  if (isActive) return { canDelete: false, message: locationInUseMessage(unitCount), offerDeactivate: true };
  return {
    canDelete: false,
    message: `Apartemen masih punya ${unitCount} unit dan sudah nonaktif, jadi tidak tampil di situs. Untuk menghapusnya, hapus atau pindahkan unitnya dulu.`,
    offerDeactivate: false,
  };
}

/** Tipe kamar hanya bisa dihapus kalau tidak dipakai unit (DB juga menolak: FK restrict). */
export function roomTypeDeleteState(unitCount: number, isActive: boolean): DeleteState {
  if (unitCount <= 0) return { canDelete: true, message: null, offerDeactivate: false };
  if (isActive) return { canDelete: false, message: roomTypeInUseMessage(unitCount), offerDeactivate: true };
  return {
    canDelete: false,
    message: `${unitCount} unit memakai tipe ini. Tipe ini sudah nonaktif; ganti tipe kamar unitnya dulu kalau ingin menghapusnya.`,
    offerDeactivate: false,
  };
}

/** Pesan galat per field yang skemanya tidak punya pesan Bahasa Indonesia (angka). */
const FIELD_MESSAGES: Record<string, string> = {
  latitude: "Latitude berupa angka antara -90 dan 90, mis. -5.1477.",
  longitude: "Longitude berupa angka antara -180 dan 180, mis. 119.4327.",
  sortOrder: "Isi urutan dengan angka bulat 0 sampai 100.000.",
  defaultMaxGuests: "Kapasitas 1 sampai 30 tamu.",
  category: "Pilih kategori.",
  heroImage: "Foto tidak valid. Unggah ulang fotonya.",
};

export function fieldMessage(field: string, message: string): string {
  return FIELD_MESSAGES[field] ?? message;
}

/** Nilai input angka → angka untuk zod: kosong = null, koma desimal diterima, teks lain = NaN (ditolak zod). */
export function parseNumberInput(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const text = String(value).trim().replace(",", ".");
  if (!text) return null;
  return Number(text);
}

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

export function unitCountLabel(count: number): string {
  return `${count} unit`;
}

export function roomTypeCountLabel(count: number): string {
  return `${count} tipe kamar`;
}

export function categoryLabel(value: string): string {
  return ROOM_CATEGORIES.find((c) => c.value === value)?.label ?? "Lainnya";
}

export function normalizeCategory(value: string | null | undefined): RoomCategoryValue {
  return (ROOM_CATEGORY_VALUES as readonly string[]).includes(value ?? "") ? (value as RoomCategoryValue) : "other";
}

export type LocationVisibility = "tampil" | "tanpa-unit" | "nonaktif";

/** Apartemen tampil di beranda, menu, filter, dan sitemap kalau aktif DAN punya unit yang tampil (PRD 7.5). */
export function locationVisibility(isActive: boolean, publishedUnitCount: number): LocationVisibility {
  if (!isActive) return "nonaktif";
  return publishedUnitCount > 0 ? "tampil" : "tanpa-unit";
}

export function visibilityNote(visibility: LocationVisibility): string {
  switch (visibility) {
    case "tampil":
      return "Tampil di beranda, menu, dan pencarian.";
    case "tanpa-unit":
      return "Aktif, tapi belum tampil di situs: belum ada unit yang tampil.";
    case "nonaktif":
      return "Nonaktif: tidak tampil di situs.";
  }
}

// ---------------------------------------------------------------------------
// Isian otomatis
// ---------------------------------------------------------------------------

/** Saran nama singkat (label tab hero, maks 16): potong per kata. */
export function suggestShortName(name: string, max = SHORT_NAME_MAX): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  let out = "";
  for (const word of clean.split(" ")) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > max) break;
    out = next;
  }
  return out || clean.slice(0, max).trim();
}

/** Tebak kategori dari nama tipe: "Studio Corner" → studio, "2BR" / "2 Bedroom" → 2br. */
export function guessRoomCategory(name: string): RoomCategoryValue {
  const text = name.toLowerCase();
  if (/studio/.test(text)) return "studio";
  const match = /(?:^|[^0-9])([123])\s*-?\s*(?:br\b|bed|bedroom|kamar|kt\b)/.exec(text);
  if (match) return `${match[1]}br` as RoomCategoryValue;
  return "other";
}

export function suggestSlug(name: string): string {
  return slugify(name);
}

// ---------------------------------------------------------------------------
// Urutan (naik/turun): tukar dengan tetangga, nomor ulang kalau nilai urutan sama
// ---------------------------------------------------------------------------

export type SortItem = { id: number; sortOrder: number };

/** Urutan tampil: sort_order lalu id (sama dengan query admin dan publik). */
export function sortBySortOrder<T extends SortItem>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

/**
 * Rencana perubahan sort_order untuk memindah satu item naik/turun satu posisi.
 * Utamakan menukar nilai dengan tetangga (2 baris). Kalau tukar tidak menghasilkan urutan yang
 * dimaksud (nilai sama dengan item lain, data lama), beri nomor ulang 1..n dan kembalikan yang berubah.
 * null = item tidak ada atau sudah di ujung.
 */
export function planReorder(items: readonly SortItem[], id: number, direction: "up" | "down"): SortItem[] | null {
  const sorted = sortBySortOrder(items);
  const index = sorted.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= sorted.length) return null;

  const intended = [...sorted];
  [intended[index], intended[target]] = [intended[target], intended[index]];
  const intendedIds = intended.map((item) => item.id).join(",");

  const a = sorted[index];
  const b = sorted[target];
  const swap: SortItem[] = [
    { id: a.id, sortOrder: b.sortOrder },
    { id: b.id, sortOrder: a.sortOrder },
  ];
  const swapped = sorted.map((item) => swap.find((s) => s.id === item.id) ?? item);
  if (a.sortOrder !== b.sortOrder && sortBySortOrder(swapped).map((item) => item.id).join(",") === intendedIds) {
    return swap;
  }

  const current = new Map(sorted.map((item) => [item.id, item.sortOrder]));
  return intended
    .map((item, position) => ({ id: item.id, sortOrder: position + 1 }))
    .filter((item) => current.get(item.id) !== item.sortOrder);
}

/** Terapkan rencana ke daftar (untuk tampilan optimistis), lalu urutkan. */
export function applySortUpdates<T extends SortItem>(items: readonly T[], updates: readonly SortItem[]): T[] {
  const byId = new Map(updates.map((u) => [u.id, u.sortOrder]));
  return sortBySortOrder(items.map((item) => (byId.has(item.id) ? { ...item, sortOrder: byId.get(item.id)! } : item)));
}

/** Urutan untuk item baru: max + 1 (perilaku admin lama). */
export function nextSortOrder(items: readonly { sortOrder: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
}

// ---------------------------------------------------------------------------
// Link Google Maps → koordinat
// ---------------------------------------------------------------------------

export type GmapsDecision =
  | { kind: "idle" }
  | { kind: "filled"; lat: number; lng: number }
  | { kind: "short" }
  | { kind: "not-found" };

export const GMAPS_MESSAGES = {
  filled: "Koordinat diambil dari link.",
  short:
    "Link pendek tidak bisa dibaca otomatis. Buka link di browser lalu salin alamat lengkapnya, atau isi koordinat manual.",
  "not-found":
    "Koordinat tidak ditemukan di link ini. Isi latitude dan longitude manual, atau biarkan kosong: peta memakai nama dan alamat.",
} as const;

/** Apa yang dilakukan saat link Google Maps diubah/ditempel. */
export function gmapsDecision(url: string | null | undefined): GmapsDecision {
  const text = (url ?? "").trim();
  if (!text) return { kind: "idle" };
  const point = parseGmapsCoordinates(text);
  if (point) return { kind: "filled", lat: point.lat, lng: point.lng };
  if (isShortGmapsLink(text)) return { kind: "short" };
  if (/^https?:\/\//i.test(text)) return { kind: "not-found" };
  return { kind: "idle" };
}

function validCoordinate(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

/** Tempat untuk pratinjau peta: koordinat kalau lengkap, kalau tidak nama + alamat; null kalau belum cukup. */
export function mapPreviewPlace(values: {
  name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): { name: string; address: string | null; latitude: number | null; longitude: number | null } | null {
  const name = (values.name ?? "").trim();
  const address = (values.address ?? "").trim() || null;
  if (validCoordinate(values.latitude, 90) && validCoordinate(values.longitude, 180)) {
    if (values.latitude !== 0 || values.longitude !== 0) {
      return { name, address, latitude: values.latitude, longitude: values.longitude };
    }
  }
  if (name && address) return { name, address, latitude: null, longitude: null };
  return null;
}

// ---------------------------------------------------------------------------
// Pemetaan baris DB → model
// ---------------------------------------------------------------------------

function countBy<T>(rows: readonly T[], key: (row: T) => number | null): Map<number, number> {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const k = key(row);
    if (k === null) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

export function toLocationCards(
  locations: readonly RawLocation[],
  units: readonly Pick<RawUnitRef, "location_id" | "is_published">[],
  roomTypes: readonly Pick<RawRoomType, "location_id">[],
): AdminLocationCard[] {
  const unitCounts = countBy(units, (u) => u.location_id);
  const publishedCounts = countBy(
    units.filter((u) => u.is_published),
    (u) => u.location_id,
  );
  const typeCounts = countBy(roomTypes, (t) => t.location_id);
  const cards = locations.map((l) => ({
    id: l.id,
    slug: l.slug,
    name: l.name,
    shortName: l.short_name?.trim() || l.name,
    area: l.area?.trim() || null,
    imageUrl: locationImageUrl({ slug: l.slug, hero_image: l.hero_image }),
    isActive: l.is_active,
    sortOrder: l.sort_order,
    unitCount: unitCounts.get(l.id) ?? 0,
    publishedUnitCount: publishedCounts.get(l.id) ?? 0,
    roomTypeCount: typeCounts.get(l.id) ?? 0,
  }));
  return sortBySortOrder(cards);
}

export function toRoomTypeRows(
  roomTypes: readonly RawRoomType[],
  units: readonly Pick<RawUnitRef, "room_type_id">[],
): AdminRoomTypeRow[] {
  const counts = countBy(units, (u) => u.room_type_id);
  return sortBySortOrder(
    roomTypes.map((t) => ({
      id: t.id,
      locationId: t.location_id,
      name: t.name,
      slug: t.slug,
      category: normalizeCategory(t.category),
      defaultMaxGuests: t.default_max_guests,
      sortOrder: t.sort_order,
      isActive: t.is_active,
      unitCount: counts.get(t.id) ?? 0,
    })),
  );
}

export function toLocationDetail(
  row: RawLocationFull,
  roomTypes: readonly RawRoomType[],
  units: readonly RawUnitRef[],
): AdminLocationDetail {
  const own = units.filter((u) => u.location_id === row.id);
  const types = toRoomTypeRows(
    roomTypes.filter((t) => t.location_id === row.id),
    own,
  );
  const typeIds = new Set(types.map((t) => t.id));
  // Foto stok (Unsplash data lama) dianggap kosong, sama seperti situs publik.
  const heroImage = row.hero_image && !isStockPhoto(row.hero_image) ? row.hero_image : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isActive: row.is_active,
    hasFallbackImage: locationImageUrl({ slug: row.slug, hero_image: null }) !== null,
    unitCount: own.length,
    publishedUnitCount: own.filter((u) => u.is_published).length,
    unitsWithoutType: own.filter((u) => u.room_type_id === null || !typeIds.has(u.room_type_id)).length,
    roomTypes: types,
    values: {
      name: row.name,
      shortName: row.short_name?.trim() || suggestShortName(row.name),
      slug: row.slug,
      area: row.area ?? "",
      address: row.address ?? "",
      gmapsUrl: row.gmaps_url ?? "",
      latitude: row.latitude,
      longitude: row.longitude,
      tagline: row.tagline ?? "",
      description: row.description ?? "",
      heroImage,
      sortOrder: row.sort_order,
      isActive: row.is_active,
    },
  };
}

/** Nilai awal form tipe kamar (tambah atau ubah). */
export function roomTypeFormValues(
  locationId: number,
  roomType: AdminRoomTypeRow | null,
  defaultSortOrder: number,
): RoomTypeInput {
  return {
    locationId,
    name: roomType?.name ?? "",
    slug: roomType?.slug ?? "",
    category: roomType?.category ?? "other",
    defaultMaxGuests: roomType?.defaultMaxGuests ?? null,
    sortOrder: roomType?.sortOrder ?? defaultSortOrder,
    isActive: roomType?.isActive ?? true,
  };
}

/** Path foto apartemen yang boleh disimpan dari form: hasil unggah ke folder locations/. */
export function isLocationImagePath(value: string): boolean {
  return /^locations\/[A-Za-z0-9._-]+$/.test(value) && !value.includes("..");
}
