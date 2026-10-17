import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { AMENITY, makeUnit, sampleCatalog } from "@/lib/test-fixtures";
import { toChatKnowledge } from "./knowledge";
import { makeLocations, SAMPLE_FACILITIES, SAMPLE_FAQS, SAMPLE_LANDMARKS, sampleKnowledge } from "./test-knowledge";
import { indexKnowledge } from "./types";

describe("toChatKnowledge", () => {
  const k = sampleKnowledge();

  it("memadatkan unit dengan field pendek dan harga promo", () => {
    const unit = k.units.find((item) => item.slug === "unit-1")!;
    expect(unit).toMatchObject({ name: "Studio AT 26X", l: "vida-view", t: "studio", c: "studio", p: 280000, np: 300000, promo: true, g: 3, av: true, tower: "Ashton", floor: 26 });
    expect(unit.a).toEqual([1, 2, 3]);
    expect(unit.photo).toContain("units/a.jpg");
    const plain = k.units.find((item) => item.slug === "unit-4")!;
    expect(plain.promo).toBe(false);
    expect(plain.av).toBe(false);
  });

  it("menyertakan apartemen dengan tipe kamar dan hitungan", () => {
    const vida = k.locations.find((location) => location.slug === "vida-view")!;
    expect(vida.unitCount).toBe(4);
    expect(vida.availableCount).toBe(3);
    expect(vida.roomTypes.map((type) => [type.slug, type.unitCount, type.availableCount, type.minPrice])).toEqual([
      ["studio", 2, 2, 250000],
      ["2-bedroom-corner", 1, 1, 750000],
      ["studio-plus", 1, 0, null],
    ]);
  });

  it("membersihkan markdown FAQ dan mengurai peraturan", () => {
    expect(k.faqs[0].a).toBe("Usia minimal 18 tahun dan membawa KTP atau identitas lain.");
    expect(k.settings.houseRules.length).toBe(DEFAULT_SETTINGS.houseRules.split("\n").filter(Boolean).length);
    expect(k.settings.houseRules[0]).toBe("Dilarang merokok di dalam unit. Merokok hanya di balkon.");
    expect(k.settings.checkinTime).toBe("14.00 WITA");
    expect(k.landmarks[0].icon).toBe("shopping-bag");
    expect(k.facilities[0].desc).toBe("Kolam renang lantai 5, buka 06.00 sampai 21.00.");
  });

  it("membuang unit dari apartemen yang tidak terdaftar", () => {
    const catalog = [...sampleCatalog(), makeUnit({ id: 99, locationSlug: "baru", locationId: 9 })];
    const knowledge = toChatKnowledge({
      catalog,
      locations: makeLocations(sampleCatalog()),
      amenities: Object.values(AMENITY),
      facilities: SAMPLE_FACILITIES,
      landmarks: SAMPLE_LANDMARKS,
      faqs: SAMPLE_FAQS,
      settings: DEFAULT_SETTINGS,
    });
    expect(knowledge.units.some((unit) => unit.id === 99)).toBe(false);
  });

  it("tetap ringkas untuk 60 unit", () => {
    const catalog = Array.from({ length: 60 }, (_, i) => makeUnit({ id: 1000 + i, name: `Studio Uji ${1000 + i}`, tower: "Ashton", floorNumber: 10 + i, viewType: "Kota", sizeSqm: 24 }));
    const knowledge = toChatKnowledge({
      catalog,
      locations: makeLocations(catalog),
      amenities: Object.values(AMENITY),
      facilities: SAMPLE_FACILITIES,
      landmarks: SAMPLE_LANDMARKS,
      faqs: SAMPLE_FAQS,
      settings: DEFAULT_SETTINGS,
    });
    expect(JSON.stringify(knowledge).length).toBeLessThan(40_000);
  });

  it("indexKnowledge mencari per slug dan id", () => {
    const idx = indexKnowledge(k);
    expect(idx.unitBySlug.get("unit-5")?.name).toBe("Studio Delft 0812");
    expect(idx.locationById.get(2)?.slug).toBe("delft-cpi");
    expect(idx.amenityById.get(7)?.name).toBe("Kitchen Set");
  });
});
