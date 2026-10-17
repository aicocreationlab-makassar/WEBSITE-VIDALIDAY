import { describe, expect, it } from "vitest";
import { makeUnit } from "@/lib/test-fixtures";
import type { LocationWithTypes, RoomTypeSummary } from "@/types/domain";
import {
  apartmentMetaDescription,
  apartmentMetaTitle,
  bareApartmentName,
  roomTypeCards,
} from "./apartment-model";

function roomType(overrides: Partial<RoomTypeSummary> = {}): RoomTypeSummary {
  return {
    id: 11,
    slug: "studio",
    name: "Studio",
    category: "studio",
    defaultMaxGuests: 3,
    sortOrder: 1,
    unitCount: 2,
    availableCount: 2,
    minPrice: 250000,
    ...overrides,
  };
}

function location(overrides: Partial<LocationWithTypes> = {}): LocationWithTypes {
  return {
    id: 1,
    slug: "vida-view",
    name: "Apartemen Vida View",
    shortName: "Vida View",
    hasTowers: true,
    area: "Panakkukang",
    tagline: "Apartemen dengan kolam renang di jantung Panakkukang",
    description: null,
    address: null,
    gmapsUrl: null,
    latitude: null,
    longitude: null,
    imageUrl: null,
    sortOrder: 1,
    unitCount: 4,
    availableCount: 3,
    minPrice: 250000,
    maxPrice: 900000,
    roomTypes: [roomType()],
    ...overrides,
  };
}

describe("apartment meta", () => {
  it("builds the PRD title without doubling words", () => {
    expect(bareApartmentName("Apartemen Vida View")).toBe("Vida View");
    expect(bareApartmentName("Apartment Delft CPI")).toBe("Delft CPI");
    expect(bareApartmentName("Apartemen")).toBe("Apartemen");
    expect(apartmentMetaTitle("Apartemen Vida View")).toBe(
      "Sewa Apartemen Vida View Makassar Harian & Bulanan | VIDALIDAY",
    );
    expect(apartmentMetaTitle("Mall Ratu Makassar Residence")).toBe(
      "Sewa Apartemen Mall Ratu Makassar Residence Harian & Bulanan | VIDALIDAY",
    );
  });

  it("writes a description from the tagline and lowest price", () => {
    expect(apartmentMetaDescription(location())).toBe(
      "Apartemen dengan kolam renang di jantung Panakkukang. 3 unit tersedia mulai Rp250.000/malam. Sewa harian, mingguan, atau bulanan via WhatsApp.",
    );
  });

  it("falls back when there is no text or no available unit", () => {
    const description = apartmentMetaDescription(
      location({ tagline: null, description: "  ", availableCount: 0, minPrice: null }),
    );
    expect(description).toBe(
      "Apartemen Vida View di Panakkukang. Lihat semua unit di Vida View. Sewa harian, mingguan, atau bulanan via WhatsApp.",
    );
  });

  it("stays within 160 characters for long text", () => {
    const long = "Apartemen modern dengan kolam renang, gym, taman bermain anak, dan akses mudah ke mall serta kuliner terbaik di Makassar. ".repeat(3);
    const description = apartmentMetaDescription(location({ tagline: null, description: long }));
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toContain("…");
    expect(description.endsWith("Sewa harian, mingguan, atau bulanan via WhatsApp.")).toBe(true);
  });
});

describe("roomTypeCards", () => {
  const studio = roomType();
  const corner = roomType({
    id: 14,
    slug: "2-bedroom-corner",
    name: "2 Bedroom Corner",
    category: "2br",
    defaultMaxGuests: null,
    unitCount: 1,
    availableCount: 0,
    minPrice: null,
  });
  const empty = roomType({ id: 15, slug: "3br", name: "3 Bedroom", unitCount: 0, availableCount: 0, minPrice: null });
  const catalog = [
    makeUnit({ id: 1, roomTypeId: 11, effectivePrice: 300000, photos: ["https://x/a.jpg"] }),
    makeUnit({ id: 2, roomTypeId: 11, effectivePrice: 250000, photos: [] }),
    makeUnit({ id: 3, roomTypeId: 11, effectivePrice: 200000, isAvailable: false, photos: ["https://x/full.jpg"] }),
    makeUnit({ id: 4, roomTypeId: 14, maxGuests: 6, isAvailable: false, photos: ["https://x/corner.jpg"] }),
    makeUnit({ id: 5, roomTypeId: 14, locationId: 2, maxGuests: 9, photos: ["https://x/other.jpg"] }),
  ];

  it("keeps types with units and links to the type landing (and /sewa for units)", () => {
    const cards = roomTypeCards(location({ roomTypes: [studio, corner, empty] }), catalog);
    expect(cards.map((card) => card.name)).toEqual(["Studio", "2 Bedroom Corner"]);
    expect(cards[0]).toMatchObject({
      href: "/apartemen/vida-view/studio",
      unitsHref: "/sewa?lokasi=vida-view&tipe=studio",
      capacity: 3,
      minPrice: 250000,
      availableCount: 2,
      // Unit tersedia dengan foto lebih dulu daripada unit penuh atau tanpa foto.
      photo: "https://x/a.jpg",
    });
  });

  it("shows full units and falls back to unit capacity", () => {
    const [, card] = roomTypeCards(location({ roomTypes: [studio, corner] }), catalog);
    expect(card).toMatchObject({
      href: "/apartemen/vida-view/2-bedroom-corner",
      unitsHref: "/sewa?lokasi=vida-view&tipe=2-bedroom-corner&penuh=1",
      capacity: 6,
      minPrice: null,
      availableCount: 0,
      photo: "https://x/corner.jpg",
    });
  });
});
