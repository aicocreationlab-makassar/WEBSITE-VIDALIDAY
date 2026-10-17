// Logika murni form tambah/ubah unit (PRD 7.4): nilai awal, slug otomatis, kapasitas dari tipe kamar,
// pratinjau harga, petunjuk dinamis, daftar "Perlu dicek", dan pemetaan ke baris DB.
// Dipakai komponen klien dan Server Action (lib/actions/admin/units-form.ts), ada unit test.

import { pricePreviewText } from "@/components/admin/units/list/unit-list-model";
import { HEALTH_LABELS, healthFlags } from "@/lib/admin/data-health";
import type { HealthFlag } from "@/lib/admin/unit-query";
import type { AdminAmenityOption, AdminLocationOption } from "@/lib/data/admin/units";
import { formatRupiah } from "@/lib/format";
import { isExternalUrl, isStockPhoto, normalizeStoragePath } from "@/lib/media";
import { discountPercent, isUsableCustomBadge } from "@/lib/pricing";
import { slugify, unitSlug } from "@/lib/slug";
import type { UnitData, UnitInput } from "@/lib/validation/admin";
import { youtubeId, youtubeThumbnail } from "@/lib/youtube";
import type { Database } from "@/types/database";

export type UnitFormMode = "create" | "edit";
export type RoomTypeOption = AdminLocationOption["roomTypes"][number];

/** Nilai form; harga normal boleh kosong selama mengisi (zod menolak saat simpan). */
export type UnitFormValues = Omit<UnitInput, "normalPrice"> & { normalPrice?: number };

/** Field form yang bisa diberi pesan error dari server. */
export const UNIT_FORM_FIELDS = [
  "locationId",
  "roomTypeId",
  "name",
  "slug",
  "tower",
  "floorNumber",
  "viewType",
  "sizeSqm",
  "maxGuests",
  "normalPrice",
  "promoPrice",
  "isPromoActive",
  "promoBadge",
  "weeklyPrice",
  "monthlyPrice",
  "amenityIds",
  "photos",
  "youtubeUrl",
  "description",
  "isPublished",
  "isAvailable",
  "isFeatured",
] as const satisfies readonly (keyof UnitInput)[];

export type UnitFormField = (typeof UNIT_FORM_FIELDS)[number];

export const UNIT_DEFAULT_GUESTS = 2;
export const NIGHTLY_PERIOD = "Malam";
export const DESCRIPTION_MIN = 150;
export const DESCRIPTION_MAX_SUGGESTED = 400;
export const DESCRIPTION_LIMIT = 2000;

export type Note = { tone: "muted" | "warning" | "success"; text: string };

// ---------------------------------------------------------------------------
// Apartemen & tipe kamar
// ---------------------------------------------------------------------------

export function findLocation(locations: AdminLocationOption[], id: number | null | undefined): AdminLocationOption | null {
  if (!id) return null;
  return locations.find((location) => location.id === id) ?? null;
}

export function findRoomType(location: AdminLocationOption | null, id: number | null | undefined): RoomTypeOption | null {
  if (!location || !id) return null;
  return location.roomTypes.find((type) => type.id === id) ?? null;
}

/** "Delft CPI" atau "Delft CPI (nonaktif)". */
export function locationLabel(location: Pick<AdminLocationOption, "name" | "isActive">): string {
  return location.isActive ? location.name : `${location.name} (nonaktif)`;
}

/** Tipe kamar yang bisa dipilih: yang aktif, ditambah tipe nonaktif yang sedang terpilih. */
export function roomTypeOptions(
  location: AdminLocationOption | null,
  selectedId: number | null | undefined,
): { id: number; label: string }[] {
  if (!location) return [];
  return location.roomTypes
    .filter((type) => type.isActive || type.id === selectedId)
    .map((type) => ({ id: type.id, label: type.isActive ? type.name : `${type.name} (nonaktif)` }));
}

/** Tipe kamar aktif satu-satunya di apartemen (dipilih otomatis), atau null. */
export function soleActiveRoomType(location: AdminLocationOption | null): RoomTypeOption | null {
  if (!location) return null;
  const active = location.roomTypes.filter((type) => type.isActive);
  return active.length === 1 ? active[0] : null;
}

/**
 * Kapasitas baru setelah tipe kamar dipilih: kapasitas bawaan tipe, selama admin belum mengubah
 * kapasitas sendiri. null = biarkan nilai sekarang.
 */
export function guestsForRoomType(
  type: RoomTypeOption | null,
  current: number | null | undefined,
  touched: boolean,
): number | null {
  if (touched || !type?.defaultMaxGuests) return null;
  return type.defaultMaxGuests === current ? null : type.defaultMaxGuests;
}

/** Petunjuk kapasitas dibanding kapasitas bawaan tipe (sama dengan penanda "tamu-janggal"). */
export function guestsNote(maxGuests: number | null | undefined, type: RoomTypeOption | null): Note | null {
  const preset = type?.defaultMaxGuests;
  if (!type || !preset) return { tone: "muted", text: "1 sampai 30 tamu." };
  if (maxGuests === preset) return { tone: "muted", text: `Sesuai kapasitas bawaan ${type.name}.` };
  if (maxGuests != null && maxGuests < preset - 2) {
    return { tone: "warning", text: `Jauh di bawah kapasitas bawaan ${type.name} (${preset} tamu). Periksa lagi.` };
  }
  return { tone: "muted", text: `Kapasitas bawaan ${type.name}: ${preset} tamu.` };
}

// ---------------------------------------------------------------------------
// Nilai awal unit baru
// ---------------------------------------------------------------------------

/** Apartemen awal: dari ?lokasi= kalau ada, atau satu-satunya apartemen. */
export function initialLocation(
  locations: AdminLocationOption[],
  presetId?: number | null,
): AdminLocationOption | null {
  const preset = findLocation(locations, presetId);
  if (preset) return preset;
  return locations.length === 1 ? locations[0] : null;
}

/** Nilai awal form unit baru: tampil + tersedia, promo mati, kapasitas dari tipe kamar. */
export function newUnitDefaults(locations: AdminLocationOption[], presetLocationId?: number | null): UnitFormValues {
  const location = initialLocation(locations, presetLocationId);
  const type = soleActiveRoomType(location);
  return {
    locationId: location?.id ?? 0,
    roomTypeId: type?.id ?? 0,
    name: "",
    slug: "",
    tower: "",
    floorNumber: null,
    viewType: "",
    sizeSqm: null,
    maxGuests: type?.defaultMaxGuests ?? UNIT_DEFAULT_GUESTS,
    normalPrice: undefined,
    promoPrice: null,
    isPromoActive: false,
    promoBadge: "",
    weeklyPrice: null,
    monthlyPrice: null,
    amenityIds: [],
    photos: [],
    youtubeUrl: "",
    description: "",
    isPublished: true,
    isAvailable: true,
    isFeatured: false,
  };
}

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------

/** Slug otomatis dari nama + apartemen, mis. "studio-at-26x-vida-view". */
export function autoSlug(name: string | null | undefined, locationSlug: string | null | undefined): string {
  const base = name?.trim();
  return base ? unitSlug(base, locationSlug ?? null) : "";
}

/** Selama diketik: huruf kecil, spasi jadi tanda hubung, karakter lain dibuang. */
export function typingSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

/**
 * Saat kolom slug ditinggalkan: rapikan; kalau kosong kembali ke slug otomatis.
 * synced = slug sama dengan slug otomatis (form unit baru lanjut mengikuti nama).
 */
export function settleSlug(raw: string, auto: string): { slug: string; synced: boolean } {
  const slug = slugify(raw) || auto;
  return { slug, synced: slug === auto };
}

export function slugAddress(slug: string | null | undefined): string {
  return `Alamat halaman: vidaliday.com/unit/${slug?.trim() || "…"}`;
}

// ---------------------------------------------------------------------------
// Harga
// ---------------------------------------------------------------------------

type PriceValues = {
  normalPrice?: number | null;
  promoPrice?: number | null;
  isPromoActive?: boolean;
  promoBadge?: string | null;
};

/** "Tamu melihat: Rp280.000/malam, coret Rp300.000, Hemat 7%" (sama dengan kartu publik). */
export function unitPricePreview(values: PriceValues): string {
  return pricePreviewText(
    {
      normalPrice: values.normalPrice ?? null,
      promoPrice: values.promoPrice ?? null,
      isPromoActive: Boolean(values.isPromoActive),
    },
    values.promoBadge?.trim() || null,
  );
}

/** Petunjuk harga promo selama mengisi. */
export function promoPriceNote(values: PriceValues): Note | null {
  const normal = values.normalPrice ?? 0;
  const promo = values.promoPrice ?? 0;
  if (!values.isPromoActive) return { tone: "muted", text: "Dipakai saat promo aktif." };
  if (!promo) return { tone: "warning", text: "Isi harga promo supaya promo berlaku." };
  if (normal > 0 && promo >= normal) return { tone: "warning", text: "Harus lebih murah dari harga normal." };
  if (normal > 0) {
    const percent = discountPercent({ normal_price: normal, promo_price: promo, is_promo_active: true });
    return { tone: "success", text: `Diskon ${percent}% dari harga normal.` };
  }
  return null;
}

/** Label promo yang tidak akan tampil di situs (aturan isUsableCustomBadge). */
export function promoBadgeNote(label: string | null | undefined): string | null {
  const text = label?.trim();
  if (!text) return null;
  if (/\d+\s*%/.test(text)) {
    return "Label berisi angka persen tidak ditampilkan. Kosongkan supaya situs menghitung Hemat X% otomatis.";
  }
  if (!isUsableCustomBadge(text)) return "Label ini tidak ditampilkan di situs. Tulis label lain atau kosongkan.";
  return null;
}

/** Harga mingguan/bulanan → setara per malam (rumus estimasi: total × malam / 7 atau / 30). */
export function rateNote(total: number | null | undefined, nights: 7 | 30, nightly: number): Note {
  const usage = nights === 7 ? "Opsional. Dipakai untuk menginap 7 malam atau lebih." : "Opsional. Dipakai untuk menginap 30 malam atau lebih.";
  if (!total) return { tone: "muted", text: usage };
  const perNight = Math.round(total / nights);
  const text = `Setara ${formatRupiah(perNight)} per malam.`;
  if (nightly > 0 && perNight >= nightly) {
    return { tone: "warning", text: `${text} Tidak lebih murah dari harga per malam.` };
  }
  return { tone: "muted", text };
}

// ---------------------------------------------------------------------------
// Fasilitas kamar
// ---------------------------------------------------------------------------

/** Chip yang ditampilkan: fasilitas aktif, ditambah yang nonaktif tapi sudah/sedang dipilih. */
export function amenityChoices(
  amenities: AdminAmenityOption[],
  initialIds: readonly number[],
  selectedIds: readonly number[],
): AdminAmenityOption[] {
  const keep = new Set([...initialIds, ...selectedIds]);
  return amenities.filter((amenity) => amenity.isActive || keep.has(amenity.id));
}

export function toggleId(ids: readonly number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

/** Nama fasilitas (urutan tabel amenities) untuk kolom lama `facilities_list`. */
export function amenityNamesFor(ids: readonly number[], amenities: Pick<AdminAmenityOption, "id" | "name">[]): string[] {
  const wanted = new Set(ids);
  return amenities.filter((amenity) => wanted.has(amenity.id)).map((amenity) => amenity.name);
}

// ---------------------------------------------------------------------------
// Foto, video, deskripsi
// ---------------------------------------------------------------------------

/** Nilai foto yang boleh disimpan: URL http(s) atau path bucket (tanpa "..", ":", atau backslash). */
export function isAllowedPhotoValue(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  if (isExternalUrl(text)) {
    try {
      const url = new URL(text);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }
  const path = normalizeStoragePath(text);
  if (!path || [...path].some((char) => char === "\\" || char === ":" || char.charCodeAt(0) < 32)) return false;
  return !path.split("/").some((segment) => segment === ".." || segment === ".");
}

/** Foto unik (urutan dipertahankan, foto pertama = sampul). */
export function uniquePhotos(photos: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of photos) {
    const value = raw.trim();
    const key = isExternalUrl(value) ? value : normalizeStoragePath(value);
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export type YoutubePreview = { id: string; thumbnail: string; watchUrl: string };

export function youtubePreview(url: string | null | undefined): YoutubePreview | null {
  const id = youtubeId(url);
  if (!id) return null;
  return { id, thumbnail: youtubeThumbnail(id), watchUrl: `https://www.youtube.com/watch?v=${id}` };
}

/** Petunjuk link YouTube selama mengisi (pesan galat resmi tetap dari zod saat simpan). */
export function youtubeNote(url: string | null | undefined): Note {
  if (!url?.trim()) return { tone: "muted", text: "Opsional. Kalau diisi, tombol video tur muncul di halaman unit." };
  if (youtubeId(url)) return { tone: "success", text: "Link YouTube dikenali." };
  return { tone: "warning", text: "Link belum dikenali. Contoh: https://youtu.be/abc123XYZ00" };
}

export function descriptionNote(length: number): Note {
  const base = `Saran ${DESCRIPTION_MIN}–${DESCRIPTION_MAX_SUGGESTED} karakter.`;
  if (length === 0) return { tone: "muted", text: base };
  if (length < DESCRIPTION_MIN) return { tone: "muted", text: `${base} Kurang ${DESCRIPTION_MIN - length} karakter lagi.` };
  if (length <= DESCRIPTION_MAX_SUGGESTED) return { tone: "success", text: `${base} Panjangnya sudah pas.` };
  return { tone: "muted", text: `${base} Boleh lebih panjang, tapi tamu jarang membaca sampai habis.` };
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export function statusNotes(input: {
  isPublished: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  photoCount: number;
  location: Pick<AdminLocationOption, "name" | "isActive"> | null;
}): string[] {
  const notes: string[] = [];
  if (input.isPublished && input.location && !input.location.isActive) {
    notes.push(`Apartemen ${input.location.name} nonaktif, jadi unit ini belum tampil di situs.`);
  }
  if (input.isFeatured && input.photoCount === 0) {
    notes.push("Unit unggulan baru tampil di beranda kalau punya foto.");
  }
  if (input.isFeatured && !input.isAvailable) {
    notes.push("Unit penuh tidak ditampilkan sebagai unggulan di beranda.");
  }
  return notes;
}

// ---------------------------------------------------------------------------
// Penanda "Perlu dicek" (sama dengan daftar unit)
// ---------------------------------------------------------------------------

export const HEALTH_SECTION: Record<HealthFlag, string> = {
  "tanpa-tipe": "info-dasar",
  "tanpa-tower-lantai": "info-dasar",
  "tamu-janggal": "info-dasar",
  "label-promo-lama": "harga",
  "harga-promo-janggal": "harga",
  "periode-bukan-harian": "harga",
  "tanpa-foto": "foto",
};

type HealthValues = Pick<
  UnitFormValues,
  "tower" | "floorNumber" | "maxGuests" | "isPromoActive" | "promoPrice" | "normalPrice" | "photos" | "roomTypeId"
>;

/** Penanda kesehatan data dari nilai form (promo_badge dan rental_period diberikan terpisah). */
export function formHealthFlags(
  values: HealthValues,
  context: {
    typeDefaultGuests: number | null;
    promoBadge: string | null;
    rentalPeriod: string | null;
    /** Apartemen terpilih punya beberapa tower (bawaan true). */
    hasTowers?: boolean;
  },
): HealthFlag[] {
  const photos = (values.photos ?? []).filter((photo) => !isStockPhoto(photo));
  return healthFlags(
    {
      tower: values.tower?.trim() || null,
      has_towers: context.hasTowers ?? true,
      floor_number: values.floorNumber ?? null,
      max_guests: values.maxGuests ?? 0,
      promo_badge: context.promoBadge?.trim() || null,
      is_promo_active: values.isPromoActive,
      promo_price: values.promoPrice ?? 0,
      normal_price: values.normalPrice ?? 0,
      main_image: photos[0] ?? null,
      gallery_images: photos.slice(1),
      rental_period: context.rentalPeriod,
      room_type_id: values.roomTypeId || null,
    },
    context.typeDefaultGuests,
  );
}

export type HealthItem = { flag: HealthFlag; label: string; section: string; resolved: boolean };

/** Daftar cek: penanda saat halaman dibuka, dicentang kalau sudah beres di form (berlaku setelah disimpan). */
export function healthChecklist(initial: readonly HealthFlag[], live: readonly HealthFlag[]): HealthItem[] {
  return initial.map((flag) => ({
    flag,
    label: HEALTH_LABELS[flag],
    section: HEALTH_SECTION[flag],
    resolved: !live.includes(flag),
  }));
}

// ---------------------------------------------------------------------------
// Error server → field form
// ---------------------------------------------------------------------------

/** { "photos.3": "...", slug: "..." } → [["photos", "..."], ["slug", "..."]] (hanya field yang dikenal). */
export function formFieldErrors(fieldErrors: Record<string, string> | undefined): [UnitFormField, string][] {
  const out = new Map<UnitFormField, string>();
  for (const [key, message] of Object.entries(fieldErrors ?? {})) {
    const field = key.split(".")[0] as UnitFormField;
    if ((UNIT_FORM_FIELDS as readonly string[]).includes(field) && !out.has(field)) out.set(field, message);
  }
  return [...out];
}

// ---------------------------------------------------------------------------
// Baris DB
// ---------------------------------------------------------------------------

export type UnitRowWrite = Database["public"]["Tables"]["units"]["Insert"];

/**
 * Data form tervalidasi → kolom tabel units. Kolom lama ikut diisi untuk kompatibilitas:
 * room_type = nama tipe kamar, facilities_list = nama fasilitas, rental_period = "Malam"
 * (semua harga di form adalah harga per malam).
 */
export function buildUnitRow(
  data: UnitData,
  extra: { roomTypeName: string; amenityNames: string[]; photos: string[] },
  now: string,
): UnitRowWrite {
  return {
    location_id: data.locationId,
    room_type_id: data.roomTypeId,
    room_type: extra.roomTypeName,
    name: data.name,
    slug: data.slug,
    tower: data.tower,
    floor_number: data.floorNumber,
    view_type: data.viewType,
    size_sqm: data.sizeSqm,
    max_guests: data.maxGuests,
    normal_price: data.normalPrice,
    promo_price: data.promoPrice ?? 0,
    is_promo_active: data.isPromoActive,
    promo_badge: data.promoBadge,
    weekly_price: data.weeklyPrice,
    monthly_price: data.monthlyPrice,
    youtube_video_url: data.youtubeUrl,
    description: data.description,
    is_published: data.isPublished,
    is_available: data.isAvailable,
    is_featured: data.isFeatured,
    main_image: extra.photos[0] ?? null,
    gallery_images: extra.photos.slice(1),
    facilities_list: extra.amenityNames,
    rental_period: NIGHTLY_PERIOD,
    updated_at: now,
  };
}

// ---------------------------------------------------------------------------
// Input angka
// ---------------------------------------------------------------------------

/** Teks angka selama diketik: hanya digit (dan satu koma/titik desimal kalau diizinkan). */
export function sanitizeNumberText(text: string, decimal = false): string {
  if (!decimal) return text.replace(/\D/g, "").slice(0, 6);
  const cleaned = text.replace(/[^\d.,]/g, "").replace(/\./g, ",");
  const [whole, ...rest] = cleaned.split(",");
  const fraction = rest.join("").slice(0, 2);
  return rest.length ? `${whole.slice(0, 6)},${fraction}` : whole.slice(0, 6);
}

/** "24,5" → 24.5; kosong → null. */
export function parseNumberText(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!normalized || normalized === ".") return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** 24.5 → "24,5"; null → "". */
export function formatNumberText(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value).replace(".", ",");
}
