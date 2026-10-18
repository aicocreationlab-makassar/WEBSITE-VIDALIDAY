// Canonical dan judul /sewa menurut filter (PRD 6.9): halaman tanpa filter dan per apartemen diindeks;
// apartemen + tipe mengarah ke landing tipe (canonical, tanpa noindex); kombinasi lain noindex,follow tanpa
// canonical (Google menyarankan tidak menggabungkan noindex dengan canonical ke URL lain). Fungsi murni, ada test.

import { roomTypeHref } from "@/lib/unit-display";
import { sewaHref, type SewaFilter } from "@/lib/validation/filters";
import type { LocationWithTypes } from "@/types/domain";

/** `canonical` null = tidak ditulis (halaman noindex). */
export type SewaSeo = { title: string; canonical: string | null; index: boolean };

export const SEWA_TITLE = "Cari Unit Apartemen Harian di Makassar";
export const SEWA_DESCRIPTION =
  "Bandingkan unit apartemen harian di Makassar: pilih apartemen, tipe kamar, budget per malam, dan fasilitas, lalu sewa langsung via WhatsApp.";

type SeoLocation = Pick<LocationWithTypes, "slug" | "shortName" | "roomTypes">;

function hasOtherFilters(filter: SewaFilter): boolean {
  return Boolean(
    filter.kategori ||
      filter.min !== null ||
      filter.max !== null ||
      filter.tamu !== null ||
      filter.fasilitas.length ||
      filter.penuh ||
      filter.urut !== "rekomendasi" ||
      filter.hal > 1,
  );
}

export function sewaSeo(filter: SewaFilter, locations: SeoLocation[]): SewaSeo {
  const location = filter.lokasi ? (locations.find((item) => item.slug === filter.lokasi) ?? null) : null;
  const others = hasOtherFilters(filter);

  if (!filter.lokasi && !others) return { title: SEWA_TITLE, canonical: "/sewa", index: true };

  if (location && filter.tipe) {
    const type = location.roomTypes.find((item) => item.slug === filter.tipe && item.unitCount > 0);
    if (type) {
      // Halaman landing tipe adalah versi kanonik dari daftar unit tipe ini: sinyal digabung ke landing.
      return { title: `Unit ${type.name} di ${location.shortName}`, canonical: roomTypeHref(location.slug, type.slug), index: true };
    }
  }

  if (location && !filter.tipe && !others) {
    return {
      title: `Sewa Apartemen ${location.shortName} Makassar: Semua Unit`,
      canonical: sewaHref({ lokasi: location.slug }),
      index: true,
    };
  }

  return { title: location ? `Unit di ${location.shortName}` : SEWA_TITLE, canonical: null, index: false };
}
