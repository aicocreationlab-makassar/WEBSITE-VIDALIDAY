// Fungsi murni halaman profil apartemen /apartemen/[slug] (PRD 6.7). Ada test di apartment-model.test.ts.

import { formatRupiah } from "@/lib/format";
import { plainSummary } from "@/lib/seo/apartment-jsonld";
import { sewaHref } from "@/lib/validation/filters";
import type { CatalogUnit, LocationWithTypes } from "@/types/domain";

const MAX_META_DESCRIPTION = 160;

/** "Apartemen Vida View" → "Vida View" (judul PRD sudah memuat kata "Apartemen"). */
export function bareApartmentName(name: string): string {
  const trimmed = name.trim();
  const bare = trimmed.replace(/^(apartemen|apartment|apt\.?)\s+/i, "").trim();
  return bare || trimmed;
}

/** PRD 6.7: "Sewa Apartemen {nama} Makassar Harian & Bulanan | VIDALIDAY" (dipakai sebagai title absolut). */
export function apartmentMetaTitle(name: string): string {
  const bare = bareApartmentName(name);
  const city = /\bmakassar\b/i.test(bare) ? "" : " Makassar";
  return `Sewa Apartemen ${bare}${city} Harian & Bulanan | VIDALIDAY`;
}

function sentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

type MetaFields = Pick<
  LocationWithTypes,
  "shortName" | "area" | "tagline" | "description" | "availableCount" | "minPrice"
>;

/** Deskripsi meta dari tagline/deskripsi dan harga terendah, maks. ±160 karakter. */
export function apartmentMetaDescription(location: MetaFields): string {
  const closing = "Sewa harian, mingguan, atau bulanan via WhatsApp.";
  const stock =
    location.availableCount > 0 && location.minPrice !== null
      ? `${location.availableCount} unit tersedia mulai ${formatRupiah(location.minPrice)}/malam.`
      : `Lihat semua unit di ${location.shortName}.`;
  const fallbackLead = `Apartemen ${location.shortName} di ${location.area ?? "Makassar"}`;
  const fixed = `${stock} ${closing}`;

  // Sisa ruang untuk kalimat pembuka (spasi + titik yang mungkin ditambah); kalau terlalu sempit,
  // kalimat penutup dibuang.
  const room = MAX_META_DESCRIPTION - fixed.length - 2;
  const source = location.tagline || location.description || fallbackLead;
  if (room >= 40) {
    const lead = plainSummary(source, room) ?? fallbackLead;
    return `${sentence(lead)} ${fixed}`;
  }
  const lead = plainSummary(source, MAX_META_DESCRIPTION - stock.length - 2) ?? fallbackLead;
  return `${sentence(lead)} ${stock}`;
}

export type RoomTypeCardData = {
  id: number;
  name: string;
  href: string;
  /** Kapasitas maksimal: default tipe kamar, kalau kosong kapasitas terbesar unitnya. */
  capacity: number | null;
  minPrice: number | null;
  unitCount: number;
  availableCount: number;
  /** Foto unit wakil (tersedia dan termurah dulu); null → tile ikon. */
  photo: string | null;
};

/**
 * Kartu "Tipe kamar": hanya tipe yang punya unit published, urut sort_order.
 * Tipe yang semua unitnya penuh tetap tampil dan menautkan ke /sewa dengan unit penuh ikut terlihat.
 */
export function roomTypeCards(location: LocationWithTypes, catalog: CatalogUnit[]): RoomTypeCardData[] {
  return location.roomTypes
    .filter((type) => type.unitCount > 0)
    .map((type) => {
      const units = catalog
        .filter((unit) => unit.locationId === location.id && unit.roomTypeId === type.id)
        .sort(
          (a, b) =>
            Number(b.isAvailable) - Number(a.isAvailable) ||
            Number(b.photos.length > 0) - Number(a.photos.length > 0) ||
            Number(b.isFeatured) - Number(a.isFeatured) ||
            a.effectivePrice - b.effectivePrice ||
            a.id - b.id,
        );
      const unitCapacity = units.reduce((max, unit) => Math.max(max, unit.maxGuests), 0);
      const capacity = type.defaultMaxGuests && type.defaultMaxGuests > 0 ? type.defaultMaxGuests : unitCapacity || null;
      return {
        id: type.id,
        name: type.name,
        href: sewaHref({ lokasi: location.slug, tipe: type.slug, penuh: type.availableCount === 0 }),
        capacity,
        minPrice: type.minPrice,
        unitCount: type.unitCount,
        availableCount: type.availableCount,
        photo: units.find((unit) => unit.photos.length > 0)?.photos[0] ?? null,
      };
    });
}
