import { describe, expect, it } from "vitest";
import { toSearchIndex } from "@/lib/search-index";
import { AMENITY, sampleCatalog } from "@/lib/test-fixtures";
import { EMPTY_FILTER, sewaHref, type SewaFilter } from "@/lib/validation/filters";
import type { LocationWithTypes } from "@/types/domain";
import {
  amenityFacets,
  applyBudget,
  applyTypeOption,
  budgetOptions,
  clampRange,
  clearFilters,
  filterChips,
  formatRupiahInput,
  guestDisplay,
  guestValue,
  headingText,
  isCommittable,
  isSameFilter,
  lokasiOptions,
  normalizeFilter,
  parseRupiahInput,
  rangeFromValues,
  sanitizeFilter,
  sliderBounds,
  sortLabel,
  stepGuests,
  toggleAmenity,
  toSearchLocations,
  typeOptions,
  visibleFacets,
  withLokasi,
  type SearchLocation,
} from "./filter-model";

const catalog = sampleCatalog();
const index = toSearchIndex(catalog);

// Sama dengan sampleCatalog: 3 Bedroom di Vida View dan 1 Bedroom tidak punya unit.
const locations: SearchLocation[] = [
  {
    slug: "vida-view",
    shortName: "Vida View",
    types: [
      { slug: "studio", name: "Studio", category: "studio" },
      { slug: "studio-plus", name: "Studio Plus", category: "studio" },
      { slug: "2-bedroom-corner", name: "2 Bedroom Corner", category: "2br" },
      { slug: "3-bedroom", name: "3 Bedroom", category: "3br" },
    ],
  },
  {
    slug: "delft-cpi",
    shortName: "Delft CPI",
    types: [
      { slug: "studio", name: "Studio", category: "studio" },
      { slug: "studio-corner", name: "Studio Corner", category: "studio" },
      { slug: "3-bedroom", name: "3 Bedroom", category: "3br" },
    ],
  },
];

const f = (overrides: Partial<SewaFilter> = {}): SewaFilter => ({ ...EMPTY_FILTER, ...overrides });
const labels = (items: { label: string }[]) => items.map((item) => item.label);

describe("toSearchLocations", () => {
  it("sorts apartments and room types by sort_order and keeps only what the client needs", () => {
    const base = {
      name: "x",
      hasTowers: true,
      area: null,
      tagline: null,
      description: null,
      address: null,
      gmapsUrl: null,
      latitude: null,
      longitude: null,
      imageUrl: null,
      unitCount: 1,
      availableCount: 1,
      minPrice: null,
      maxPrice: null,
    };
    const type = { defaultMaxGuests: null, unitCount: 0, availableCount: 0, minPrice: null };
    const rows: LocationWithTypes[] = [
      { ...base, id: 2, slug: "delft-cpi", shortName: "Delft CPI", sortOrder: 2, roomTypes: [] },
      {
        ...base,
        id: 1,
        slug: "vida-view",
        shortName: "Vida View",
        sortOrder: 1,
        roomTypes: [
          { ...type, id: 12, slug: "studio-plus", name: "Studio Plus", category: "studio", sortOrder: 2 },
          { ...type, id: 11, slug: "studio", name: "Studio", category: "studio", sortOrder: 1 },
        ],
      },
    ];
    expect(toSearchLocations(rows)).toEqual([
      {
        slug: "vida-view",
        shortName: "Vida View",
        types: [
          { slug: "studio", name: "Studio", category: "studio" },
          { slug: "studio-plus", name: "Studio Plus", category: "studio" },
        ],
      },
      { slug: "delft-cpi", shortName: "Delft CPI", types: [] },
    ]);
  });
});

describe("sanitizeFilter / normalizeFilter", () => {
  const amenityIds = [1, 2, 3, 7, 9];

  it("drops an unknown apartment together with its type", () => {
    expect(sanitizeFilter(f({ lokasi: "gedung-lain", tipe: "studio" }), locations, amenityIds)).toMatchObject({
      lokasi: null,
      tipe: null,
    });
  });

  it("drops a type that does not belong to the apartment", () => {
    expect(sanitizeFilter(f({ lokasi: "delft-cpi", tipe: "studio-plus" }), locations, amenityIds).tipe).toBeNull();
    expect(sanitizeFilter(f({ lokasi: "delft-cpi", tipe: "studio-corner" }), locations, amenityIds).tipe).toBe(
      "studio-corner",
    );
  });

  it("drops unknown amenity ids, keeps the page, and lets a type win over a category", () => {
    const clean = sanitizeFilter(
      f({ lokasi: "vida-view", tipe: "studio", kategori: "2br", fasilitas: [1, 404], hal: 3 }),
      locations,
      amenityIds,
    );
    expect(clean).toMatchObject({ kategori: null, fasilitas: [1], hal: 3 });
  });

  it("keeps apartment + category without type (valid URL from PRD 5.4)", () => {
    expect(sanitizeFilter(f({ lokasi: "delft-cpi", kategori: "studio" }), locations, amenityIds)).toMatchObject({
      lokasi: "delft-cpi",
      kategori: "studio",
    });
  });

  it("treats 1 guest as no filter, swaps reversed prices and resets the page", () => {
    expect(normalizeFilter(f({ tamu: 1, min: 500000, max: 300000, hal: 4 }), locations)).toMatchObject({
      tamu: null,
      min: 300000,
      max: 500000,
      hal: 1,
    });
    expect(normalizeFilter(f({ max: 0 }), locations).max).toBeNull();
  });
});

describe("withLokasi", () => {
  it("resets type and category when picking an apartment (same as the hero)", () => {
    expect(withLokasi(f({ lokasi: "vida-view", tipe: "studio" }), "delft-cpi", locations)).toMatchObject({
      lokasi: "delft-cpi",
      tipe: null,
      kategori: null,
    });
    expect(withLokasi(f({ kategori: "2br" }), "vida-view", locations).kategori).toBeNull();
  });

  it("turns the chosen type into its category when switching to all apartments", () => {
    expect(withLokasi(f({ lokasi: "vida-view", tipe: "2-bedroom-corner" }), null, locations)).toMatchObject({
      lokasi: null,
      tipe: null,
      kategori: "2br",
    });
  });

  it("returns the same filter when nothing changes", () => {
    const filter = f({ lokasi: "vida-view" });
    expect(withLokasi(filter, "vida-view", locations)).toBe(filter);
  });
});

describe("filterChips", () => {
  const amenities = [
    { id: 1, name: "AC" },
    { id: 7, name: "Kitchen Set" },
  ];

  it("labels every active filter in a fixed order", () => {
    const filter = f({
      lokasi: "vida-view",
      tipe: "studio",
      min: 300000,
      max: 500000,
      tamu: 4,
      fasilitas: [1, 7],
      penuh: true,
    });
    expect(labels(filterChips(filter, locations, amenities))).toEqual([
      "Vida View",
      "Studio",
      "Rp300rb – Rp500rb",
      "Min. 4 tamu",
      "AC",
      "Kitchen Set",
      "Termasuk unit penuh",
    ]);
  });

  it("removing a chip only clears that filter and resets the page", () => {
    const filter = f({ lokasi: "vida-view", tipe: "studio", fasilitas: [1, 7], max: 300000, hal: 2 });
    const chips = filterChips(filter, locations, amenities);
    const byId = (id: string) => chips.find((chip) => chip.id === id)!.next;

    // Apartemen dihapus: tipe Studio diteruskan sebagai kategori.
    expect(byId("lokasi")).toMatchObject({ lokasi: null, tipe: null, kategori: "studio", hal: 1 });
    expect(byId("tipe")).toMatchObject({ lokasi: "vida-view", tipe: null, hal: 1 });
    expect(byId("harga")).toMatchObject({ min: null, max: null, fasilitas: [1, 7] });
    expect(byId("fasilitas-1").fasilitas).toEqual([7]);
  });

  it("shows category, custom budget and no chips for an empty filter", () => {
    expect(labels(filterChips(f({ kategori: "2br", min: 1000000 }), locations, []))).toEqual([
      "2 Bedroom",
      "Di atas Rp1jt",
    ]);
    expect(labels(filterChips(f({ min: 350000, max: 650000 }), locations, []))).toEqual(["Rp350rb – Rp650rb"]);
    expect(filterChips(EMPTY_FILTER, locations, [])).toEqual([]);
  });
});

describe("amenityFacets / visibleFacets / toggleAmenity", () => {
  const amenities = Object.values(AMENITY);

  it("keeps amenities used by at least 2 published units, sorted by sort_order", () => {
    const facets = amenityFacets(catalog, amenities);
    expect(facets.map((facet) => facet.name)).toEqual(["AC", "WiFi", "Smart TV"]);
    expect(facets[0]).toMatchObject({ id: 1, icon: "air-vent", unitCount: 7 });
  });

  it("always includes a selected amenity, even when rare", () => {
    expect(amenityFacets(catalog, amenities, [7]).map((facet) => facet.id)).toEqual([1, 2, 3, 7]);
  });

  it("shows the first 10 plus selected ones before Lihat semua", () => {
    const facets = Array.from({ length: 14 }, (_, i) => ({ id: i + 1 }));
    expect(visibleFacets(facets, [13], false)).toMatchObject({ hidden: 3 });
    expect(visibleFacets(facets, [13], false).visible.map((facet) => facet.id)).toContain(13);
    expect(visibleFacets(facets, [], true)).toMatchObject({ hidden: 0 });
    expect(visibleFacets(facets.slice(0, 10), [], false).hidden).toBe(0);
  });

  it("toggles an amenity and keeps ids sorted", () => {
    expect(toggleAmenity(f({ fasilitas: [7] }), 2).fasilitas).toEqual([2, 7]);
    expect(toggleAmenity(f({ fasilitas: [2, 7], hal: 2 }), 2)).toMatchObject({ fasilitas: [7], hal: 1 });
  });
});

describe("chip options with live counts", () => {
  it("counts apartments with the other filters applied", () => {
    const options = lokasiOptions(index, EMPTY_FILTER, locations);
    expect(options.map((o) => [o.label, o.count, o.selected])).toEqual([
      ["Semua", 6, true],
      ["Vida View", 3, false],
      ["Delft CPI", 3, false],
    ]);
    const cheap = lokasiOptions(index, f({ min: 1000000 }), locations);
    expect(cheap.find((o) => o.value === "vida-view")).toMatchObject({ count: 0, disabled: true });
    expect(cheap[0]).toMatchObject({ value: null, disabled: false });
  });

  it("shows categories with units when all apartments are selected", () => {
    const options = typeOptions(index, EMPTY_FILTER, locations);
    expect(options.map((o) => [o.value, o.label, o.count])).toEqual([
      [null, "Semua tipe", 6],
      ["k:studio", "Studio", 4],
      ["k:2br", "2 Bedroom", 1],
      ["k:3br", "3 Bedroom", 1],
    ]);
  });

  it("shows the apartment's room types; types without available units are disabled", () => {
    const options = typeOptions(index, f({ lokasi: "vida-view" }), locations);
    expect(options.map((o) => [o.label, o.count, o.disabled])).toEqual([
      ["Semua tipe", 3, false],
      ["Studio", 2, false],
      ["Studio Plus", 0, true],
      ["2 Bedroom Corner", 1, false],
      ["3 Bedroom", 0, true],
    ]);
    // Unit penuh ikut dihitung kalau switch aktif.
    expect(typeOptions(index, f({ lokasi: "vida-view", penuh: true }), locations)[2]).toMatchObject({
      count: 1,
      disabled: false,
    });
  });

  it("keeps a selected option enabled even when it has 0 results", () => {
    const options = typeOptions(index, f({ lokasi: "vida-view", tipe: "studio-plus" }), locations);
    expect(options.find((o) => o.value === "t:studio-plus")).toMatchObject({ selected: true, disabled: false });
  });

  it("shows apartment + category from the URL as an active option", () => {
    const options = typeOptions(index, f({ lokasi: "delft-cpi", kategori: "studio" }), locations);
    expect(options[1]).toMatchObject({ value: "k:studio", label: "Semua Studio", count: 2, selected: true });
  });

  it("applies type and category options", () => {
    expect(applyTypeOption(f({ lokasi: "vida-view", kategori: "studio" }), "t:studio")).toMatchObject({
      tipe: "studio",
      kategori: null,
    });
    expect(applyTypeOption(f(), "k:2br")).toMatchObject({ tipe: null, kategori: "2br" });
    expect(applyTypeOption(f({ tipe: "studio", lokasi: "vida-view" }), null)).toMatchObject({
      tipe: null,
      kategori: null,
    });
  });

  it("counts budget presets for the selected apartment", () => {
    const all = budgetOptions(index, EMPTY_FILTER);
    expect(all.map((o) => [o.label, o.count])).toEqual([
      ["Semua harga", 6],
      ["Di bawah Rp300rb", 3],
      ["Rp300rb – Rp500rb", 1],
      ["Rp500rb – Rp1jt", 1],
      ["Di atas Rp1jt", 1],
    ]);
    expect(all[0]).toMatchObject({ value: null, selected: true });

    const vida = budgetOptions(index, f({ lokasi: "vida-view", min: 300000, max: 500000 }));
    expect(vida.map((o) => [o.count, o.selected, o.disabled])).toEqual([
      [3, false, false],
      [2, false, false],
      [0, true, false],
      [1, false, false],
      [0, false, true],
    ]);
    expect(applyBudget(f({ hal: 3 }), { min: null, max: 300000 })).toMatchObject({ min: null, max: 300000, hal: 1 });
  });
});

describe("price range helpers", () => {
  const bounds = { min: 250000, max: 750000 };

  it("derives slider bounds from available units of the apartment", () => {
    expect(sliderBounds(index, "vida-view")).toEqual(bounds);
    expect(sliderBounds(index, "tidak-ada")).toBeNull();
  });

  it("clamps, fills and swaps slider values", () => {
    expect(clampRange({ min: null, max: null }, bounds)).toEqual(bounds);
    expect(clampRange({ min: 900000, max: 100000 }, bounds)).toEqual(bounds);
    expect(clampRange({ min: 600000, max: 300000 }, bounds)).toEqual({ min: 300000, max: 600000 });
  });

  it("treats values on the bounds as open ends", () => {
    expect(rangeFromValues({ min: 250000, max: 500000 }, bounds)).toEqual({ min: null, max: 500000 });
    expect(rangeFromValues({ min: 300000, max: 750000 }, bounds)).toEqual({ min: 300000, max: null });
    expect(rangeFromValues({ min: 100000, max: 2000000 }, bounds)).toEqual({ min: null, max: null });
  });

  it("only commits typed values inside the bounds", () => {
    expect(isCommittable(null, bounds)).toBe(true);
    expect(isCommittable(35000, bounds)).toBe(false);
    expect(isCommittable(350000, bounds)).toBe(true);
    expect(isCommittable(3500000, bounds)).toBe(false);
  });

  it("parses and formats Rupiah input", () => {
    expect(parseRupiahInput("Rp350.000")).toBe(350000);
    expect(parseRupiahInput("abc")).toBeNull();
    expect(parseRupiahInput("9999999999999")).toBe(100_000_000);
    expect(formatRupiahInput(350000)).toBe("Rp350.000");
    expect(formatRupiahInput(null)).toBe("");
  });
});

describe("guest stepper", () => {
  it("steps between 1 (no filter) and 10+", () => {
    expect(guestValue(null)).toBe(1);
    expect(stepGuests(null, 1)).toBe(2);
    expect(stepGuests(2, -1)).toBeNull();
    expect(stepGuests(null, -1)).toBeNull();
    expect(stepGuests(10, 1)).toBe(10);
    expect(stepGuests(14, -1)).toBe(9);
    expect(guestDisplay(null)).toBe("1");
    expect(guestDisplay(10)).toBe("10+");
    expect(guestDisplay(14)).toBe("10+");
  });
});

describe("labels and comparisons", () => {
  it("builds the results heading", () => {
    expect(headingText(24, f({ lokasi: "vida-view" }), locations)).toBe("24 unit di Vida View");
    expect(headingText(24, f(), locations)).toBe("24 unit di semua apartemen");
  });

  it("labels the sort option", () => {
    expect(sortLabel("termurah")).toBe("Harga terendah");
    expect(sortLabel("rekomendasi")).toBe("Rekomendasi");
  });

  it("compares filters by URL, ignoring the page", () => {
    expect(isSameFilter(f({ lokasi: "vida-view", hal: 3 }), f({ lokasi: "vida-view" }))).toBe(true);
    expect(isSameFilter(f({ urut: "termurah" }), f())).toBe(false);
  });

  it("clears filters but keeps the sort", () => {
    const cleared = clearFilters(f({ lokasi: "vida-view", urut: "diskon", hal: 2 }));
    expect(sewaHref(cleared)).toBe("/sewa?urut=diskon");
  });
});
