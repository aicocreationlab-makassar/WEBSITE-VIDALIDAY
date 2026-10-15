// Data contoh untuk unit test (bukan data produksi).

import type { Amenity, CatalogUnit } from "@/types/domain";

export const AMENITY: Record<string, Amenity> = {
  ac: { id: 1, name: "AC", icon: "air-vent", sortOrder: 1, isActive: true },
  wifi: { id: 2, name: "WiFi", icon: "wifi", sortOrder: 2, isActive: true },
  tv: { id: 3, name: "Smart TV", icon: "tv", sortOrder: 3, isActive: true },
  kitchen: { id: 7, name: "Kitchen Set", icon: "cooking-pot", sortOrder: 7, isActive: true },
  balkon: { id: 9, name: "Balkon", icon: "fence", sortOrder: 9, isActive: true },
};

let nextId = 100;

export function makeUnit(overrides: Partial<CatalogUnit> = {}): CatalogUnit {
  const id = overrides.id ?? nextId++;
  const base: CatalogUnit = {
    id,
    slug: `unit-${id}`,
    name: `Unit ${id}`,
    locationId: 1,
    locationSlug: "vida-view",
    locationName: "Apartemen Vida View",
    locationShortName: "Vida View",
    locationArea: "Panakkukang",
    roomTypeId: 11,
    roomTypeSlug: "studio",
    roomTypeName: "Studio",
    category: "studio",
    tower: null,
    floorNumber: null,
    viewType: null,
    sizeSqm: null,
    maxGuests: 3,
    normalPrice: 300000,
    promoPrice: 280000,
    isPromoActive: true,
    promoBadge: null,
    effectivePrice: 280000,
    weeklyPrice: null,
    monthlyPrice: null,
    isFeatured: false,
    isAvailable: true,
    sortOrder: 0,
    photos: ["https://abc.supabase.co/storage/v1/object/public/media/units/a.jpg"],
    amenities: [AMENITY.ac, AMENITY.wifi, AMENITY.tv],
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  };
  const unit = { ...base, ...overrides };
  if (overrides.effectivePrice === undefined && (overrides.promoPrice !== undefined || overrides.normalPrice !== undefined || overrides.isPromoActive !== undefined)) {
    unit.effectivePrice = unit.isPromoActive && unit.promoPrice > 0 ? unit.promoPrice : unit.normalPrice;
  }
  return unit;
}

const DELFT = {
  locationId: 2,
  locationSlug: "delft-cpi",
  locationName: "Apartemen Delft CPI",
  locationShortName: "Delft CPI",
  locationArea: "Center Point of Indonesia",
};

/** Katalog kecil: 4 unit Vida View, 3 unit Delft CPI. */
export function sampleCatalog(): CatalogUnit[] {
  return [
    makeUnit({ id: 1, name: "Studio AT 26X", tower: "Ashton", floorNumber: 26, viewType: "Kolam", isFeatured: true }),
    makeUnit({ id: 2, name: "Studio AT 17S", normalPrice: 260000, promoPrice: 250000, viewType: "Kolam" }),
    makeUnit({
      id: 3,
      name: "2BR Corner BV 19V",
      roomTypeId: 14,
      roomTypeSlug: "2-bedroom-corner",
      roomTypeName: "2 Bedroom Corner",
      category: "2br",
      maxGuests: 7,
      normalPrice: 900000,
      promoPrice: 750000,
      amenities: [AMENITY.ac, AMENITY.wifi, AMENITY.tv, AMENITY.kitchen],
    }),
    makeUnit({
      id: 4,
      name: "Studio Plus BV 10",
      roomTypeId: 12,
      roomTypeSlug: "studio-plus",
      roomTypeName: "Studio Plus",
      maxGuests: 5,
      normalPrice: 400000,
      promoPrice: 0,
      isPromoActive: false,
      isAvailable: false,
    }),
    makeUnit({
      id: 5,
      ...DELFT,
      name: "Studio Delft 0812",
      roomTypeId: 21,
      roomTypeSlug: "studio",
      roomTypeName: "Studio",
      normalPrice: 320000,
      promoPrice: 290000,
      viewType: "Laut",
      createdAt: "2026-10-10T00:00:00Z",
    }),
    makeUnit({
      id: 6,
      ...DELFT,
      name: "Studio Corner Delft 1501",
      roomTypeId: 22,
      roomTypeSlug: "studio-corner",
      roomTypeName: "Studio Corner",
      maxGuests: 5,
      normalPrice: 450000,
      promoPrice: 380000,
      amenities: [AMENITY.ac, AMENITY.wifi, AMENITY.balkon],
    }),
    makeUnit({
      id: 7,
      ...DELFT,
      name: "3BR Delft 2201",
      roomTypeId: 24,
      roomTypeSlug: "3-bedroom",
      roomTypeName: "3 Bedroom",
      category: "3br",
      maxGuests: 10,
      normalPrice: 1500000,
      promoPrice: 1200000,
      photos: [],
    }),
  ];
}
