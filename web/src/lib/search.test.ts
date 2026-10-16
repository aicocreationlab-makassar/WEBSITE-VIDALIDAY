import { describe, expect, it } from "vitest";
import { budgetLabel, BUDGET_PRESETS } from "./budget";
import { tagsFor } from "./cache-tags";
import { searchUnits, sortUnits } from "./search";
import { countMatches, priceBounds, toSearchIndex } from "./search-index";
import { sampleCatalog } from "./test-fixtures";
import { EMPTY_FILTER } from "./validation/filters";

const catalog = sampleCatalog();
const ids = (units: { id: number }[]) => units.map((u) => u.id);

describe("searchUnits", () => {
  it("hides full units by default and filters by apartment", () => {
    const result = searchUnits(catalog, { ...EMPTY_FILTER, lokasi: "vida-view" });
    expect(result.total).toBe(3);
    expect(ids(result.items)).not.toContain(4);
  });

  it("shows full units at the bottom when penuh=1", () => {
    const result = searchUnits(catalog, { ...EMPTY_FILTER, lokasi: "vida-view", penuh: true });
    expect(ids(result.items).at(-1)).toBe(4);
  });

  it("filters type within an apartment, category across apartments, price, guests and amenities", () => {
    expect(ids(searchUnits(catalog, { ...EMPTY_FILTER, lokasi: "delft-cpi", tipe: "studio-corner" }).items)).toEqual([6]);
    expect(ids(searchUnits(catalog, { ...EMPTY_FILTER, kategori: "studio", urut: "termurah" }).items)).toEqual([2, 1, 5, 6]);
    expect(ids(searchUnits(catalog, { ...EMPTY_FILTER, min: 280000, max: 290000, urut: "termurah" }).items)).toEqual([1, 5]);
    expect(ids(searchUnits(catalog, { ...EMPTY_FILTER, tamu: 6 }).items).sort()).toEqual([3, 7]);
    expect(ids(searchUnits(catalog, { ...EMPTY_FILTER, fasilitas: [7] }).items)).toEqual([3]);
  });

  it("sorts by recommendation: featured, then popularity, then price", () => {
    const sorted = sortUnits(catalog.filter((u) => u.isAvailable), "rekomendasi", { 6: 4, 5: 1 });
    expect(ids(sorted)).toEqual([1, 6, 5, 2, 3, 7]);
  });

  it("sorts by discount and newest", () => {
    expect(ids(sortUnits(catalog, "diskon")).slice(0, 2)).toEqual([7, 3]);
    expect(ids(sortUnits(catalog, "terbaru"))[0]).toBe(5);
  });

  it("paginates 12 per page and renders hal x 12 items", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...catalog[0], id: 1000 + i, slug: `x-${i}` }));
    const page1 = searchUnits(many, EMPTY_FILTER);
    expect([page1.items.length, page1.hasMore]).toEqual([12, true]);
    const page3 = searchUnits(many, { ...EMPTY_FILTER, hal: 3 });
    expect([page3.items.length, page3.hasMore]).toEqual([30, false]);
  });

  it("suggests 3 nearest units when nothing matches (relax price first)", () => {
    const result = searchUnits(catalog, { ...EMPTY_FILTER, lokasi: "vida-view", tipe: "studio", max: 100000 });
    expect(result.total).toBe(0);
    expect(ids(result.suggestions)).toEqual([2, 1]);
  });
});

describe("client index", () => {
  const index = toSearchIndex(catalog);

  it("counts the same as the server search", () => {
    const filter = { ...EMPTY_FILTER, kategori: "studio" as const, max: 400000 };
    expect(countMatches(index, filter)).toBe(searchUnits(catalog, filter).total);
  });

  it("computes slider bounds in Rp50.000 steps from available units", () => {
    expect(priceBounds(index, "vida-view")).toEqual({ min: 250000, max: 750000 });
    expect(priceBounds(index, "tidak-ada")).toBeNull();
  });
});

describe("budget labels", () => {
  it("labels presets and custom ranges", () => {
    expect(budgetLabel({ min: 300000, max: 500000 })).toBe("Rp300rb – Rp500rb");
    expect(budgetLabel({ min: 350000, max: 600000 })).toBe("Rp350rb – Rp600rb");
    expect(budgetLabel({ min: 1500000, max: null })).toBe("Mulai Rp1,5jt");
    expect(budgetLabel({ min: null, max: null })).toBe("Semua harga");
    expect(BUDGET_PRESETS).toHaveLength(5);
  });
});

describe("cache tags", () => {
  it("invalidates the unit list and both slugs on rename", () => {
    expect(tagsFor({ kind: "unit", slugs: ["lama", "baru", null] })).toEqual(["units", "unit:lama", "unit:baru"]);
    expect(tagsFor({ kind: "roomType" })).toEqual(["locations", "units"]);
    expect(tagsFor({ kind: "amenity" })).toEqual(["amenities", "units"]);
  });

  it("refreshes every public tag after direct database changes", () => {
    expect(new Set(tagsFor({ kind: "all" }))).toEqual(
      new Set(["units", "locations", "amenities", "facilities", "landmarks", "faqs", "settings", "popularity"]),
    );
  });
});
