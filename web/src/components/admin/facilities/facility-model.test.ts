import { describe, expect, it } from "vitest";
import {
  applyFacilityOrder,
  deleteFacilityDescription,
  EMPTY_FACILITY_FILTER,
  facilityFilterQuery,
  facilityPhotoUrl,
  filterFacilities,
  groupCountLabel,
  groupFacilities,
  hasActiveFilter,
  isAcceptableFacilityImage,
  isFacilityUploadPath,
  isMissingColumnError,
  isNarrowed,
  matchesFacilityQuery,
  nextFacilitySortOrder,
  orderEdges,
  parseFacilityFilter,
  planFacilityReorder,
  replacedImagePath,
  sameImage,
  sanitizeFilter,
  sortFacilities,
  statusCounts,
  toFacilityRow,
  toggleFacilityMessage,
  type AdminFacilityRow,
  type FacilityFilter,
  type FacilityLocation,
} from "./facility-model";

const UUID = "0b7f3c2e-4a1d-4c8e-9f00-1234567890ab";

const locations: FacilityLocation[] = [
  { id: 2, name: "Vida View", isActive: true },
  { id: 1, name: "Delft CPI", isActive: true },
  { id: 3, name: "Apartemen Baru", isActive: false },
];

const row = (over: Partial<AdminFacilityRow>): AdminFacilityRow => ({
  id: 1,
  locationId: 2,
  name: "Kolam renang",
  description: null,
  icon: "waves",
  image: null,
  imageUrl: null,
  sortOrder: 1,
  isActive: true,
  ...over,
});

const rows: AdminFacilityRow[] = [
  row({ id: 1, locationId: 2, name: "Kolam renang", description: "Infinity pool lantai 5", sortOrder: 2 }),
  row({ id: 2, locationId: 2, name: "Gym", icon: "dumbbell", sortOrder: 1 }),
  row({ id: 3, locationId: 2, name: "Taman", icon: "", sortOrder: 3, isActive: false }),
  row({ id: 4, locationId: 1, name: "Keamanan 24 jam", icon: "shield-check", sortOrder: 1 }),
  row({ id: 5, locationId: 1, name: "Kolam anak", icon: "waves", sortOrder: 1 }),
];

const filter = (over: Partial<FacilityFilter>): FacilityFilter => ({ ...EMPTY_FACILITY_FILTER, ...over });

describe("toFacilityRow", () => {
  it("maps raw columns and trims text", () => {
    expect(
      toFacilityRow({
        id: 9,
        location_id: 1,
        name: "  Gym ",
        icon: null,
        description: "  ",
        image: " ",
        sort_order: 4,
        is_active: false,
      }),
    ).toEqual({
      id: 9,
      locationId: 1,
      name: "Gym",
      description: null,
      icon: "",
      image: null,
      imageUrl: null,
      sortOrder: 4,
      isActive: false,
    });
  });

  it("defaults sort order and active flag when migration columns are missing", () => {
    const mapped = toFacilityRow({ id: 1, location_id: 1, name: "Lobi", icon: "door-open", description: null, image: null });
    expect(mapped.sortOrder).toBe(0);
    expect(mapped.isActive).toBe(true);
  });

  it("treats stock photos as no photo but keeps the stored value", () => {
    const stock = "https://images.unsplash.com/photo-123";
    const mapped = toFacilityRow({ id: 1, location_id: 1, name: "Gym", icon: null, description: null, image: stock });
    expect(mapped.image).toBe(stock);
    expect(mapped.imageUrl).toBeNull();
    expect(facilityPhotoUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(facilityPhotoUrl(null)).toBeNull();
  });
});

describe("sortFacilities", () => {
  it("orders by apartment order, then sort order, then id", () => {
    expect(sortFacilities(rows, locations).map((r) => r.id)).toEqual([2, 1, 3, 4, 5]);
  });

  it("puts facilities of unknown apartments last", () => {
    const extra = row({ id: 99, locationId: 77, sortOrder: 0 });
    expect(sortFacilities([extra, ...rows], locations).at(-1)?.id).toBe(99);
  });
});

describe("URL filter", () => {
  it("parses and sanitises params", () => {
    expect(parseFacilityFilter(new URLSearchParams("lokasi=2&q=%20gym%20&status=aktif"))).toEqual({
      lokasi: 2,
      q: "gym",
      status: "aktif",
    });
    expect(parseFacilityFilter({ lokasi: "abc", status: "semua", q: ["kolam", "x"] })).toEqual({
      lokasi: null,
      q: "kolam",
      status: "semua",
    });
    expect(parseFacilityFilter({ lokasi: "-1", status: "lain" })).toEqual(EMPTY_FACILITY_FILTER);
  });

  it("builds a query string without defaults", () => {
    expect(facilityFilterQuery(EMPTY_FACILITY_FILTER)).toBe("");
    expect(facilityFilterQuery(filter({ lokasi: 1, q: "kolam renang", status: "nonaktif" }))).toBe(
      "lokasi=1&q=kolam+renang&status=nonaktif",
    );
  });

  it("round-trips", () => {
    const value = filter({ lokasi: 3, q: "gym", status: "aktif" });
    expect(parseFacilityFilter(new URLSearchParams(facilityFilterQuery(value)))).toEqual(value);
  });

  it("knows when the list is narrowed", () => {
    expect(isNarrowed(filter({ lokasi: 2 }))).toBe(false);
    expect(hasActiveFilter(filter({ lokasi: 2 }))).toBe(true);
    expect(isNarrowed(filter({ q: "gym" }))).toBe(true);
    expect(isNarrowed(filter({ status: "nonaktif" }))).toBe(true);
    expect(hasActiveFilter(EMPTY_FACILITY_FILTER)).toBe(false);
  });

  it("drops an apartment that no longer exists", () => {
    expect(sanitizeFilter(filter({ lokasi: 42, q: "x" }), locations)).toEqual(filter({ q: "x" }));
    expect(sanitizeFilter(filter({ lokasi: 1 }), locations)).toEqual(filter({ lokasi: 1 }));
  });
});

describe("search and status", () => {
  it("matches every token in name, description, or apartment name", () => {
    expect(matchesFacilityQuery(rows[0], "infinity", "Vida View")).toBe(true);
    expect(matchesFacilityQuery(rows[0], "KOLAM vida", "Vida View")).toBe(true);
    expect(matchesFacilityQuery(rows[0], "kolam delft", "Vida View")).toBe(false);
    expect(matchesFacilityQuery(rows[0], "   ")).toBe(true);
  });

  it("filters by apartment, query, and status", () => {
    expect(filterFacilities(rows, filter({ lokasi: 1 }), locations).map((r) => r.id)).toEqual([4, 5]);
    expect(filterFacilities(rows, filter({ q: "kolam" }), locations).map((r) => r.id)).toEqual([1, 5]);
    expect(filterFacilities(rows, filter({ q: "delft" }), locations).map((r) => r.id)).toEqual([4, 5]);
    expect(filterFacilities(rows, filter({ status: "nonaktif" }), locations).map((r) => r.id)).toEqual([3]);
  });

  it("counts chips from apartment + search", () => {
    expect(statusCounts(rows, EMPTY_FACILITY_FILTER, locations)).toEqual({ semua: 5, aktif: 4, nonaktif: 1 });
    expect(statusCounts(rows, filter({ lokasi: 2, status: "aktif" }), locations)).toEqual({ semua: 3, aktif: 2, nonaktif: 1 });
    expect(statusCounts(rows, filter({ q: "kolam" }), locations)).toEqual({ semua: 2, aktif: 2, nonaktif: 0 });
  });
});

describe("groupFacilities", () => {
  it("keeps empty apartments when not narrowed (guiding empty state)", () => {
    const groups = groupFacilities(rows, EMPTY_FACILITY_FILTER, locations);
    expect(groups.map((g) => [g.location.id, g.items.map((r) => r.id), g.total])).toEqual([
      [2, [2, 1, 3], 3],
      [1, [4, 5], 2],
      [3, [], 0],
    ]);
  });

  it("hides empty groups when searching or filtering status", () => {
    const groups = groupFacilities(rows, filter({ q: "kolam" }), locations);
    expect(groups.map((g) => [g.location.id, g.items.map((r) => r.id), g.total])).toEqual([
      [2, [1], 3],
      [1, [5], 2],
    ]);
  });

  it("shows only the selected apartment", () => {
    expect(groupFacilities(rows, filter({ lokasi: 3 }), locations).map((g) => g.location.id)).toEqual([3]);
  });

  it("labels the count", () => {
    expect(groupCountLabel({ items: [rows[0]], total: 3 }, true)).toBe("1 dari 3 fasilitas");
    expect(groupCountLabel({ items: [rows[0]], total: 1 }, true)).toBe("1 fasilitas");
    expect(groupCountLabel({ items: [], total: 0 }, false)).toBe("0 fasilitas");
  });
});

describe("reorder within the same apartment", () => {
  it("marks first and last per apartment", () => {
    const edges = orderEdges(rows);
    expect(edges.get(2)).toEqual({ isFirst: true, isLast: false });
    expect(edges.get(1)).toEqual({ isFirst: false, isLast: false });
    expect(edges.get(3)).toEqual({ isFirst: false, isLast: true });
    expect(edges.get(4)).toEqual({ isFirst: true, isLast: false });
    expect(edges.get(5)).toEqual({ isFirst: false, isLast: true });
  });

  it("swaps with the neighbour in the same apartment only", () => {
    expect(planFacilityReorder(rows, 1, "up")).toEqual([
      { id: 1, sortOrder: 1 },
      { id: 2, sortOrder: 2 },
    ]);
    expect(planFacilityReorder(rows, 2, "up")).toBeNull();
    expect(planFacilityReorder(rows, 3, "down")).toBeNull();
    expect(planFacilityReorder(rows, 404, "down")).toBeNull();
  });

  it("renumbers when neighbours share a sort order", () => {
    // id 4 dan 5 sama-sama 1 (data lama): nomor ulang 1..n.
    expect(planFacilityReorder(rows, 5, "up")).toEqual([{ id: 4, sortOrder: 2 }]);
  });

  it("applies a plan optimistically", () => {
    const next = applyFacilityOrder(rows, [
      { id: 1, sortOrder: 1 },
      { id: 2, sortOrder: 2 },
    ]);
    expect(sortFacilities(next, locations).map((r) => r.id)).toEqual([1, 2, 3, 4, 5]);
    expect(next.find((r) => r.id === 4)).toBe(rows.find((r) => r.id === 4));
  });

  it("suggests max + 1 within the apartment", () => {
    expect(nextFacilitySortOrder(rows, 2)).toBe(4);
    expect(nextFacilitySortOrder(rows, 2, 3)).toBe(3);
    expect(nextFacilitySortOrder(rows, 3)).toBe(1);
    expect(nextFacilitySortOrder(rows, null)).toBe(1);
  });
});

describe("photo rules", () => {
  it("recognises fresh uploads only", () => {
    expect(isFacilityUploadPath(`facilities/${UUID}.webp`)).toBe(true);
    expect(isFacilityUploadPath(`units/${UUID}.webp`)).toBe(false);
    expect(isFacilityUploadPath(`facilities/../${UUID}.webp`)).toBe(false);
    expect(isFacilityUploadPath("facilities/kolam.jpg")).toBe(false);
    expect(isFacilityUploadPath(null)).toBe(false);
  });

  it("compares stored values loosely", () => {
    expect(sameImage("/storage/facilities/a.jpg", "facilities/a.jpg")).toBe(true);
    expect(sameImage(null, "")).toBe(true);
    expect(sameImage("facilities/a.jpg", null)).toBe(false);
  });

  it("accepts empty, unchanged, or facilities/ paths", () => {
    expect(isAcceptableFacilityImage(null, "facilities/a.jpg")).toBe(true);
    expect(isAcceptableFacilityImage("https://images.unsplash.com/x", "https://images.unsplash.com/x")).toBe(true);
    expect(isAcceptableFacilityImage(`facilities/${UUID}.webp`, null)).toBe(true);
    expect(isAcceptableFacilityImage("https://evil.example.com/x.jpg", null)).toBe(false);
    expect(isAcceptableFacilityImage("settings/logo.webp", null)).toBe(false);
    expect(isAcceptableFacilityImage("facilities/../settings/logo.webp", null)).toBe(false);
  });

  it("returns the old bucket path to delete after replace or remove", () => {
    expect(replacedImagePath("/storage/facilities/old.jpg", `facilities/${UUID}.webp`)).toBe("facilities/old.jpg");
    expect(replacedImagePath("facilities/old.jpg", null)).toBe("facilities/old.jpg");
    expect(replacedImagePath("facilities/old.jpg", "storage/facilities/old.jpg")).toBeNull();
    expect(replacedImagePath("https://images.unsplash.com/x", null)).toBeNull();
    expect(replacedImagePath(null, `facilities/${UUID}.webp`)).toBeNull();
  });
});

describe("copy and errors", () => {
  it("describes delete and toggle", () => {
    expect(deleteFacilityDescription({ image: "facilities/a.jpg" })).toBe("Foto ikut terhapus.");
    expect(deleteFacilityDescription({ image: null })).toBe("Fasilitas ini hilang dari halaman apartemen.");
    expect(toggleFacilityMessage("Gym", false)).toBe("Gym disembunyikan dari halaman apartemen");
    expect(toggleFacilityMessage("Gym", true)).toBe("Gym tampil lagi di halaman apartemen");
  });

  it("detects a missing migration", () => {
    expect(isMissingColumnError({ code: "42703" })).toBe(true);
    expect(isMissingColumnError({ code: "PGRST204" })).toBe(true);
    expect(isMissingColumnError({ code: "42501" })).toBe(false);
    expect(isMissingColumnError(null)).toBe(false);
  });
});
