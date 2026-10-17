// Knowledge contoh untuk unit test bot chat (bukan data produksi): sampleCatalog() + apartemen,
// fasilitas, landmark, FAQ, dan pengaturan bawaan.

import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { AMENITY, sampleCatalog } from "@/lib/test-fixtures";
import type { CatalogUnit, Facility, Faq, Landmark, LocationWithTypes, RoomTypeSummary } from "@/types/domain";
import { toChatKnowledge } from "./knowledge";
import { indexKnowledge, type ChatKnowledge, type KnowledgeIndex } from "./types";

type LocationSeed = Pick<LocationWithTypes, "id" | "slug" | "name" | "shortName" | "area" | "address" | "latitude" | "longitude" | "gmapsUrl" | "hasTowers">;

const LOCATION_SEEDS: LocationSeed[] = [
  {
    id: 1,
    slug: "vida-view",
    name: "Apartemen Vida View",
    shortName: "Vida View",
    area: "Panakkukang",
    address: "Jl. Topaz Raya, Masale, Panakkukang, Makassar",
    latitude: -5.1546322,
    longitude: 119.4404006,
    gmapsUrl: null,
    hasTowers: true,
  },
  {
    id: 2,
    slug: "delft-cpi",
    name: "Apartemen Delft CPI",
    shortName: "Delft CPI",
    area: "Center Point of Indonesia",
    address: "Jl. Metro Tanjung Bunga, CitraLand City CPI, Makassar",
    latitude: -5.144628657051978,
    longitude: 119.39411188027171,
    gmapsUrl: "https://www.google.com/maps/place/APARTEMEN+DELFT+BY+VIDALIDAY/",
    hasTowers: false,
  },
];

/** Apartemen + tipe kamar diturunkan dari katalog contoh (hitungan sama dengan mapLocations). */
export function makeLocations(catalog: CatalogUnit[] = sampleCatalog()): LocationWithTypes[] {
  return LOCATION_SEEDS.map((seed, index) => {
    const units = catalog.filter((unit) => unit.locationSlug === seed.slug);
    const available = units.filter((unit) => unit.isAvailable);
    const typeIds = [...new Set(units.map((unit) => unit.roomTypeId).filter((id): id is number => id !== null))];
    const roomTypes: RoomTypeSummary[] = typeIds.map((typeId, sortOrder) => {
      const typeUnits = units.filter((unit) => unit.roomTypeId === typeId);
      const typeAvailable = typeUnits.filter((unit) => unit.isAvailable);
      const first = typeUnits[0];
      return {
        id: typeId,
        slug: first.roomTypeSlug ?? `tipe-${typeId}`,
        name: first.roomTypeName ?? `Tipe ${typeId}`,
        category: first.category,
        defaultMaxGuests: first.maxGuests,
        sortOrder,
        unitCount: typeUnits.length,
        availableCount: typeAvailable.length,
        minPrice: typeAvailable.length ? Math.min(...typeAvailable.map((unit) => unit.effectivePrice)) : null,
      };
    });
    const prices = available.map((unit) => unit.effectivePrice);
    return {
      ...seed,
      tagline: null,
      description: null,
      imageUrl: null,
      sortOrder: index + 1,
      unitCount: units.length,
      availableCount: available.length,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      roomTypes,
    };
  });
}

export const SAMPLE_FACILITIES: Facility[] = [
  { id: 1, locationId: 1, name: "Infinity Pool", description: "Kolam renang lantai 5, buka 06.00 sampai 21.00.", icon: "waves", imageUrl: null, sortOrder: 1 },
  { id: 2, locationId: 1, name: "Fitness Center", description: null, icon: "dumbbell", imageUrl: null, sortOrder: 2 },
  { id: 3, locationId: 1, name: "Parkir Luas", description: "Parkir mobil dan motor.", icon: "square-parking", imageUrl: null, sortOrder: 3 },
  { id: 4, locationId: 2, name: "Kolam Renang", description: "Kolam dewasa dan anak.", icon: "waves", imageUrl: null, sortOrder: 1 },
  { id: 5, locationId: 2, name: "Minimarket", description: null, icon: "store", imageUrl: null, sortOrder: 2 },
  { id: 6, locationId: 2, name: "Keamanan 24 Jam", description: null, icon: "shield-check", imageUrl: null, sortOrder: 3 },
];

export const SAMPLE_LANDMARKS: Landmark[] = [
  { id: 1, locationId: 1, name: "Mall Panakkukang", distanceTime: "5 menit", notes: null, icon: "shopping-bag", sortOrder: 1 },
  { id: 2, locationId: 1, name: "Bandara Sultan Hasanuddin", distanceTime: "30 menit", notes: "lewat tol", icon: "plane", sortOrder: 2 },
  { id: 3, locationId: 2, name: "Trans Studio Mall", distanceTime: "7 menit", notes: null, icon: "shopping-bag", sortOrder: 1 },
  { id: 4, locationId: 2, name: "Pantai Losari", distanceTime: "10 menit", notes: null, icon: "tree-palm", sortOrder: 2 },
  { id: 5, locationId: 2, name: "RS Siloam Makassar", distanceTime: "8 menit", notes: null, icon: "hospital", sortOrder: 3 },
];

export const SAMPLE_FAQS: Faq[] = [
  { id: 1, question: "Apa saja syarat check-in unit di apartemen?", answer: "Usia minimal 18 tahun dan membawa **KTP** atau identitas lain.", sortOrder: 1 },
  { id: 2, question: "Bagaimana tata cara pemesanan dan pembayaran sewa apartemen?", answer: "Pesan lewat tombol Sewa sekarang, lalu admin mengirim detail pembayaran.", sortOrder: 2 },
  { id: 3, question: "Apakah ada deposit?", answer: "Deposit dikonfirmasi admin saat pemesanan.", sortOrder: 3 },
];

export function sampleKnowledge(): ChatKnowledge {
  const catalog = sampleCatalog();
  return toChatKnowledge({
    catalog,
    locations: makeLocations(catalog),
    amenities: Object.values(AMENITY),
    facilities: SAMPLE_FACILITIES,
    landmarks: SAMPLE_LANDMARKS,
    faqs: SAMPLE_FAQS,
    settings: DEFAULT_SETTINGS,
  });
}

export function sampleIndex(k: ChatKnowledge = sampleKnowledge()): KnowledgeIndex {
  return indexKnowledge(k);
}
