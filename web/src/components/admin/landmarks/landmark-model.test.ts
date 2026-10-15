import { describe, expect, it } from "vitest";
import {
  ALL_LOCATIONS,
  countByLocation,
  defaultLocationId,
  filterLandmarks,
  groupByLocation,
  initialLandmarkIcon,
  isFiltering,
  isIconGuessed,
  landmarkDeleteDescription,
  matchesLandmark,
  nextSortOrder,
  parseLocationScope,
  statusCounts,
  toLandmarkRow,
  type AdminLandmarkRow,
  type LandmarkLocation,
} from "./landmark-model";

const row = (over: Partial<AdminLandmarkRow>): AdminLandmarkRow => ({
  id: 1,
  locationId: 10,
  name: "Mall Panakkukang",
  distanceTime: "5 menit",
  notes: null,
  icon: null,
  sortOrder: 1,
  isActive: true,
  ...over,
});

const locations: LandmarkLocation[] = [
  { id: 10, name: "Vida View Apartemen", shortName: "Vida View", isActive: true },
  { id: 20, name: "Delft CPI", shortName: "Delft", isActive: true },
  { id: 30, name: "Apartemen Lama", shortName: "Lama", isActive: false },
];

const rows: AdminLandmarkRow[] = [
  row({ id: 1, locationId: 10, name: "Mall Panakkukang", distanceTime: "5 menit", sortOrder: 2 }),
  row({ id: 2, locationId: 10, name: "RS Siloam", distanceTime: "10 menit berkendara", sortOrder: 1, isActive: false }),
  row({ id: 3, locationId: 20, name: "Pantai Losari", distanceTime: "3 menit", notes: "Jalan kaki lewat CPI", sortOrder: 1 }),
  row({ id: 4, locationId: 10, name: "Bandara Sultan Hasanuddin", distanceTime: "25 menit (via tol)", sortOrder: 2 }),
];

describe("toLandmarkRow", () => {
  it("maps snake_case columns and drops blank notes", () => {
    expect(
      toLandmarkRow({
        id: 7,
        location_id: 3,
        name: "Masjid 99 Kubah",
        distance_time: "1 menit",
        notes: "  ",
        icon: "landmark",
        sort_order: 4,
        is_active: false,
      }),
    ).toEqual({
      id: 7,
      locationId: 3,
      name: "Masjid 99 Kubah",
      distanceTime: "1 menit",
      notes: null,
      icon: "landmark",
      sortOrder: 4,
      isActive: false,
    });
  });
});

describe("parseLocationScope", () => {
  it("defaults to the first apartment", () => {
    expect(parseLocationScope(undefined, locations)).toBe(10);
    expect(parseLocationScope("", locations)).toBe(10);
  });
  it("accepts a known id and 'semua'", () => {
    expect(parseLocationScope("20", locations)).toBe(20);
    expect(parseLocationScope(["30", "10"], locations)).toBe(30);
    expect(parseLocationScope("Semua", locations)).toBe(ALL_LOCATIONS);
  });
  it("falls back to the first apartment for unknown or malformed ids", () => {
    expect(parseLocationScope("999", locations)).toBe(10);
    expect(parseLocationScope("10abc", locations)).toBe(10);
    expect(parseLocationScope("-20", locations)).toBe(10);
  });
  it("uses 'semua' when there are no apartments", () => {
    expect(parseLocationScope("10", [])).toBe(ALL_LOCATIONS);
  });
});

describe("defaultLocationId", () => {
  it("uses the open apartment, else the first one", () => {
    expect(defaultLocationId(20, locations)).toBe(20);
    expect(defaultLocationId(ALL_LOCATIONS, locations)).toBe(10);
    expect(defaultLocationId(ALL_LOCATIONS, [])).toBeNull();
  });
});

describe("search and filters", () => {
  it("matches every word against name, distance and notes", () => {
    expect(matchesLandmark(rows[2], "losari jalan")).toBe(true);
    expect(matchesLandmark(rows[3], "via tol")).toBe(true);
    expect(matchesLandmark(rows[0], "mall rumah")).toBe(false);
    expect(matchesLandmark(rows[0], "   ")).toBe(true);
  });

  it("filters by apartment, query and status, sorted by sort_order then id", () => {
    expect(filterLandmarks(rows, { scope: 10, query: "", chip: "semua" }).map((r) => r.id)).toEqual([2, 1, 4]);
    expect(filterLandmarks(rows, { scope: 10, query: "", chip: "aktif" }).map((r) => r.id)).toEqual([1, 4]);
    expect(filterLandmarks(rows, { scope: 10, query: "", chip: "nonaktif" }).map((r) => r.id)).toEqual([2]);
    expect(filterLandmarks(rows, { scope: ALL_LOCATIONS, query: "menit", chip: "semua" }).map((r) => r.id)).toEqual([2, 3, 1, 4]);
    expect(filterLandmarks(rows, { scope: 20, query: "mall", chip: "semua" })).toEqual([]);
  });

  it("counts statuses within the apartment and query", () => {
    expect(statusCounts(rows, 10, "")).toEqual({ semua: 3, aktif: 2, nonaktif: 1 });
    expect(statusCounts(rows, ALL_LOCATIONS, "pantai")).toEqual({ semua: 1, aktif: 1, nonaktif: 0 });
  });

  it("counts landmarks per apartment", () => {
    const counts = countByLocation(rows);
    expect(counts.get(10)).toBe(3);
    expect(counts.get(20)).toBe(1);
    expect(counts.get(30)).toBeUndefined();
  });

  it("knows when reordering must be paused", () => {
    expect(isFiltering("", "semua")).toBe(false);
    expect(isFiltering("  ", "semua")).toBe(false);
    expect(isFiltering("rs", "semua")).toBe(true);
    expect(isFiltering("", "aktif")).toBe(true);
  });
});

describe("groupByLocation", () => {
  it("groups in apartment order and skips empty apartments", () => {
    const groups = groupByLocation(rows, locations);
    expect(groups.map((g) => g.location.id)).toEqual([10, 20]);
    expect(groups[0].rows.map((r) => r.id)).toEqual([2, 1, 4]);
  });

  it("keeps landmarks of an unknown apartment at the end", () => {
    const groups = groupByLocation([...rows, row({ id: 9, locationId: 99 })], locations);
    expect(groups.at(-1)?.location.id).toBe(99);
    expect(groups.at(-1)?.rows.map((r) => r.id)).toEqual([9]);
  });
});

describe("form helpers", () => {
  it("next sort order is max + 1 within the apartment", () => {
    expect(nextSortOrder(rows, 10)).toBe(3);
    expect(nextSortOrder(rows, 20)).toBe(2);
    expect(nextSortOrder(rows, 30)).toBe(1);
    expect(nextSortOrder(rows, null)).toBe(1);
  });

  it("detects guessed icons and pre-fills the icon from the name", () => {
    expect(isIconGuessed(null)).toBe(true);
    expect(isIconGuessed("ikon-lama")).toBe(true);
    expect(isIconGuessed("hospital")).toBe(false);
    expect(initialLandmarkIcon(null)).toBe("map-pin");
    expect(initialLandmarkIcon({ name: "RS Siloam", icon: null })).toBe("hospital");
    expect(initialLandmarkIcon({ name: "RS Siloam", icon: "plane" })).toBe("plane");
    expect(initialLandmarkIcon({ name: "Tempat tanpa kata kunci", icon: "" })).toBe("map-pin");
  });

  it("describes the delete impact", () => {
    expect(landmarkDeleteDescription("Vida View")).toContain("halaman Vida View");
    expect(landmarkDeleteDescription(null)).toContain("halaman apartemen");
  });
});
