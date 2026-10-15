import { describe, expect, it } from "vitest";
import {
  chipCounts,
  deleteDescription,
  filterAmenities,
  matchesAmenity,
  needsIcon,
  nextSortOrder,
  sortAmenities,
  toAmenityRow,
  usageCount,
  usageLabel,
  type AdminAmenityRow,
} from "./amenity-model";

const row = (over: Partial<AdminAmenityRow>): AdminAmenityRow => ({
  id: 1,
  name: "AC",
  icon: "air-vent",
  sortOrder: 1,
  isActive: true,
  usage: 0,
  ...over,
});

const rows: AdminAmenityRow[] = [
  row({ id: 1, name: "AC", icon: "air-vent", sortOrder: 1, usage: 40 }),
  row({ id: 2, name: "WiFi High Speed", icon: "check", sortOrder: 50, usage: 12 }),
  row({ id: 3, name: "Smart TV", icon: "tv", sortOrder: 3, isActive: false }),
  row({ id: 4, name: "Water heater", icon: "ikon-lama-tak-dikenal", sortOrder: 50, usage: 5 }),
];

describe("usageCount / toAmenityRow", () => {
  it("reads the PostgREST embedded count", () => {
    expect(usageCount([{ count: 7 }])).toBe(7);
    expect(usageCount([{ count: "3" }])).toBe(3);
    expect(usageCount([])).toBe(0);
    expect(usageCount(null)).toBe(0);
    expect(usageCount([{ count: -1 }])).toBe(0);
  });

  it("maps a raw row", () => {
    expect(
      toAmenityRow({ id: 9, name: "Dapur", icon: null, sort_order: 4, is_active: true, unit_amenities: [{ count: 2 }] }),
    ).toEqual({ id: 9, name: "Dapur", icon: "", sortOrder: 4, isActive: true, usage: 2 });
  });
});

describe("needsIcon", () => {
  it("flags check, empty and unknown icon names", () => {
    expect(needsIcon("check")).toBe(true);
    expect(needsIcon("")).toBe(true);
    expect(needsIcon(null)).toBe(true);
    expect(needsIcon("tidak-ada")).toBe(true);
    expect(needsIcon("air-vent")).toBe(false);
    // Alias lama yang dikenal registry tidak dianggap kosong.
    expect(needsIcon("ac")).toBe(false);
  });
});

describe("search and chips", () => {
  it("matches every token, ignoring case, spaces and punctuation", () => {
    expect(matchesAmenity({ name: "WiFi High Speed" }, "wifi")).toBe(true);
    expect(matchesAmenity({ name: "WiFi High Speed" }, "wi-fi speed")).toBe(true);
    expect(matchesAmenity({ name: "WiFi High Speed" }, "wifi tv")).toBe(false);
    expect(matchesAmenity({ name: "Smart TV" }, "  ")).toBe(true);
  });

  it("filters by chip", () => {
    expect(filterAmenities(rows, "", "tanpa-ikon").map((r) => r.id)).toEqual([2, 4]);
    expect(filterAmenities(rows, "", "nonaktif").map((r) => r.id)).toEqual([3]);
    expect(filterAmenities(rows, "w", "semua").map((r) => r.id)).toEqual([2, 4]);
  });

  it("counts chips within the current search", () => {
    expect(chipCounts(rows, "")).toEqual({ semua: 4, "tanpa-ikon": 2, nonaktif: 1 });
    expect(chipCounts(rows, "tv")).toEqual({ semua: 1, "tanpa-ikon": 0, nonaktif: 1 });
  });
});

describe("ordering", () => {
  it("sorts by sort order then name", () => {
    expect(sortAmenities(rows).map((r) => r.id)).toEqual([1, 3, 4, 2]);
  });

  it("uses max + 1 for a new amenity", () => {
    expect(nextSortOrder(rows)).toBe(51);
    expect(nextSortOrder([])).toBe(1);
  });
});

describe("labels", () => {
  it("formats usage and delete text", () => {
    expect(usageLabel(3)).toBe("Dipakai 3 unit");
    expect(usageLabel(0)).toBe("Dipakai 0 unit");
    expect(deleteDescription(12)).toBe("Dihapus dari 12 unit.");
  });
});
