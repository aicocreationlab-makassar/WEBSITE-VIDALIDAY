import { describe, expect, it } from "vitest";
import { AMENITY } from "./test-fixtures";
import { cardAmenities, formatUnitPlace, formatUnitSpot, roomTypeHref, unitHref } from "./unit-display";

describe("roomTypeHref", () => {
  it("builds the landing path with encoded slugs", () => {
    expect(roomTypeHref("vida-view", "studio")).toBe("/apartemen/vida-view/studio");
    expect(roomTypeHref("a b", "2 br")).toBe("/apartemen/a%20b/2%20br");
  });
});

const base = { locationShortName: "Vida View", locationArea: "Panakkukang", tower: null, floorNumber: null };

describe("formatUnitPlace", () => {
  it("never renders broken fragments", () => {
    expect(formatUnitPlace({ ...base, tower: "Ashton", floorNumber: 26 })).toBe("Vida View · Tower Ashton lt. 26");
    expect(formatUnitPlace({ ...base, tower: "Tower Brentsville", floorNumber: null })).toBe("Vida View · Tower Brentsville");
    expect(formatUnitPlace({ ...base, floorNumber: 26 })).toBe("Vida View · Lantai 26");
    expect(formatUnitPlace(base)).toBe("Vida View · Panakkukang");
    expect(formatUnitPlace({ ...base, locationArea: null })).toBe("Vida View");
    expect(formatUnitSpot({ tower: "  ", floorNumber: null })).toBeNull();
  });

  it("builds unit links and picks card amenities", () => {
    expect(unitHref("studio at 26x")).toBe("/unit/studio%20at%2026x");
    const generic = { ...AMENITY.ac, id: 50, name: "Sesuatu", icon: "check" as const };
    expect(cardAmenities([generic, AMENITY.ac, AMENITY.wifi, AMENITY.tv]).map((a) => a.id)).toEqual([1, 2, 3]);
    expect(cardAmenities([generic, AMENITY.ac]).map((a) => a.id)).toEqual([1, 50]);
  });
});
