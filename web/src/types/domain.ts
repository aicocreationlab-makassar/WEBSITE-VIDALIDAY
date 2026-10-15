// Tipe domain yang dipakai halaman publik dan admin. Diisi oleh lib/data/* dari baris DB.
// Semua nilai polos (bisa diserialisasi) supaya aman dikembalikan dari fungsi "use cache".

import type { IconName } from "@/lib/icons";

export type RoomCategory = "studio" | "1br" | "2br" | "3br" | "other";

export const ROOM_CATEGORIES: { value: RoomCategory; label: string }[] = [
  { value: "studio", label: "Studio" },
  { value: "1br", label: "1 Bedroom" },
  { value: "2br", label: "2 Bedroom" },
  { value: "3br", label: "3 Bedroom" },
  { value: "other", label: "Lainnya" },
];

export type Amenity = {
  id: number;
  name: string;
  /** Nama ikon yang sudah di-resolve (alias + tebakan dari nama). */
  icon: IconName;
  sortOrder: number;
  isActive: boolean;
};

/** Unit di katalog publik (published, apartemen aktif). Cukup untuk kartu, filter, dan rekomendasi. */
export type CatalogUnit = {
  id: number;
  slug: string;
  name: string;
  locationId: number;
  locationSlug: string;
  locationName: string;
  locationShortName: string;
  locationArea: string | null;
  roomTypeId: number | null;
  roomTypeSlug: string | null;
  roomTypeName: string | null;
  category: RoomCategory;
  tower: string | null;
  floorNumber: number | null;
  viewType: string | null;
  sizeSqm: number | null;
  maxGuests: number;
  normalPrice: number;
  promoPrice: number;
  isPromoActive: boolean;
  promoBadge: string | null;
  effectivePrice: number;
  weeklyPrice: number | null;
  monthlyPrice: number | null;
  isFeatured: boolean;
  isAvailable: boolean;
  sortOrder: number;
  /** URL foto siap tampil: sampul dulu, tanpa foto stok. */
  photos: string[];
  /** Fasilitas kamar aktif, urut sort_order. */
  amenities: Amenity[];
  createdAt: string;
  updatedAt: string;
};

export type UnitLocation = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  area: string | null;
  address: string | null;
  gmapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  tagline: string | null;
};

/** Detail unit untuk /unit/[slug]. */
export type UnitDetail = CatalogUnit & {
  description: string | null;
  youtubeUrl: string | null;
  location: UnitLocation;
};

export type RoomTypeSummary = {
  id: number;
  slug: string;
  name: string;
  category: RoomCategory;
  defaultMaxGuests: number | null;
  sortOrder: number;
  /** Unit published di tipe ini. */
  unitCount: number;
  /** Unit published dan tersedia. */
  availableCount: number;
  /** Harga efektif terendah dari unit tersedia; null kalau tidak ada. */
  minPrice: number | null;
};

export type LocationWithTypes = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  area: string | null;
  tagline: string | null;
  description: string | null;
  address: string | null;
  gmapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Foto gedung siap tampil (Storage, atau foto bawaan per slug); null kalau tidak ada. */
  imageUrl: string | null;
  sortOrder: number;
  unitCount: number;
  availableCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  roomTypes: RoomTypeSummary[];
};

/** Baris ringkas untuk menghitung jumlah unit di klien (hero, budget, sheet filter). */
export type SearchIndexRow = {
  id: number;
  /** slug apartemen */
  l: string;
  /** slug tipe kamar */
  t: string | null;
  /** kategori */
  c: RoomCategory;
  /** harga efektif per malam */
  p: number;
  /** kapasitas maksimal */
  g: number;
  /** id fasilitas kamar */
  a: number[];
  /** tersedia */
  av: boolean;
};

export type Faq = {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
};

export type Landmark = {
  id: number;
  locationId: number;
  name: string;
  distanceTime: string;
  notes: string | null;
  icon: IconName;
  sortOrder: number;
};

export type Facility = {
  id: number;
  locationId: number;
  name: string;
  description: string | null;
  icon: IconName;
  imageUrl: string | null;
  sortOrder: number;
};

/** Jumlah permintaan sewa per unit (30 hari), untuk urutan "Rekomendasi" dan rekomendasi. */
export type Popularity = Record<number, number>;
