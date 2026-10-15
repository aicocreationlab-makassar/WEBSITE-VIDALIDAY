import { describe, expect, it } from "vitest";
import {
  GMAPS_MESSAGES,
  applySortUpdates,
  categoryLabel,
  fieldMessage,
  gmapsDecision,
  guessRoomCategory,
  isLocationImagePath,
  locationDeleteState,
  locationInUseMessage,
  locationVisibility,
  mapPreviewPlace,
  newLocationSchema,
  nextSortOrder,
  normalizeCategory,
  parseNumberInput,
  planReorder,
  roomTypeDeleteState,
  roomTypeFormValues,
  roomTypeInUseMessage,
  sortBySortOrder,
  suggestShortName,
  toLocationCards,
  toLocationDetail,
  toRoomTypeRows,
  unitCountLabel,
  visibilityNote,
  type RawLocationFull,
  type RawRoomType,
  type SortItem,
} from "./location-model";

const order = (items: SortItem[]) => sortBySortOrder(items).map((i) => i.id);

describe("planReorder", () => {
  const items: SortItem[] = [
    { id: 1, sortOrder: 1 },
    { id: 2, sortOrder: 2 },
    { id: 3, sortOrder: 3 },
  ];

  it("swaps sort_order with the neighbour", () => {
    expect(planReorder(items, 2, "up")).toEqual([
      { id: 2, sortOrder: 1 },
      { id: 1, sortOrder: 2 },
    ]);
    expect(planReorder(items, 2, "down")).toEqual([
      { id: 2, sortOrder: 3 },
      { id: 3, sortOrder: 2 },
    ]);
  });

  it("returns null at the edges or for unknown ids", () => {
    expect(planReorder(items, 1, "up")).toBeNull();
    expect(planReorder(items, 3, "down")).toBeNull();
    expect(planReorder(items, 99, "up")).toBeNull();
    expect(planReorder([], 1, "up")).toBeNull();
  });

  it("works on unsorted input (sorted by sort_order, then id)", () => {
    const shuffled: SortItem[] = [
      { id: 3, sortOrder: 30 },
      { id: 1, sortOrder: 10 },
      { id: 2, sortOrder: 20 },
    ];
    const plan = planReorder(shuffled, 3, "up")!;
    expect(plan).toEqual([
      { id: 3, sortOrder: 20 },
      { id: 2, sortOrder: 30 },
    ]);
    expect(order(applySortUpdates(shuffled, plan))).toEqual([1, 3, 2]);
  });

  it("renumbers when neighbours share the same sort_order (legacy data)", () => {
    const tied: SortItem[] = [
      { id: 1, sortOrder: 0 },
      { id: 2, sortOrder: 0 },
      { id: 3, sortOrder: 0 },
    ];
    const plan = planReorder(tied, 3, "up")!;
    expect(order(applySortUpdates(tied, plan))).toEqual([1, 3, 2]);
    expect(plan).toEqual([
      { id: 1, sortOrder: 1 },
      { id: 3, sortOrder: 2 },
      { id: 2, sortOrder: 3 },
    ]);
  });

  it("renumbers when a plain swap would collide with a third item", () => {
    // C (id 3) di atas, A dan B sama-sama 2: tukar C↔A menaruh C sejajar B dan id 2 < 3 → salah.
    const items2: SortItem[] = [
      { id: 3, sortOrder: 1 },
      { id: 1, sortOrder: 2 },
      { id: 2, sortOrder: 2 },
    ];
    const plan = planReorder(items2, 3, "down")!;
    expect(order(applySortUpdates(items2, plan))).toEqual([1, 3, 2]);
    // Hanya baris yang berubah yang ditulis.
    expect(plan.every((u) => items2.find((i) => i.id === u.id)!.sortOrder !== u.sortOrder)).toBe(true);
  });

  it("always produces the intended order for every move", () => {
    const data: SortItem[] = [
      { id: 5, sortOrder: 0 },
      { id: 2, sortOrder: 3 },
      { id: 9, sortOrder: 3 },
      { id: 1, sortOrder: 7 },
      { id: 4, sortOrder: 7 },
    ];
    const base = order(data);
    base.forEach((id, index) => {
      for (const direction of ["up", "down"] as const) {
        const plan = planReorder(data, id, direction);
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= base.length) {
          expect(plan).toBeNull();
          continue;
        }
        const expected = [...base];
        [expected[index], expected[target]] = [expected[target], expected[index]];
        expect(order(applySortUpdates(data, plan!))).toEqual(expected);
      }
    });
  });
});

describe("nextSortOrder", () => {
  it("is max + 1, or 1 for an empty list", () => {
    expect(nextSortOrder([])).toBe(1);
    expect(nextSortOrder([{ sortOrder: 4 }, { sortOrder: 2 }])).toBe(5);
  });
});

describe("gmapsDecision", () => {
  it("fills coordinates from @lat,lng and !3d!4d links", () => {
    expect(gmapsDecision("https://www.google.com/maps/place/Vida+View/@-5.1476651,119.4327314,17z")).toEqual({
      kind: "filled",
      lat: -5.1476651,
      lng: 119.4327314,
    });
    expect(
      gmapsDecision("https://www.google.com/maps/place/X/@-5.1,119.4,17z/data=!3m1!4b1!4m6!3m5!3d-5.1476651!4d119.4327314"),
    ).toEqual({ kind: "filled", lat: -5.1476651, lng: 119.4327314 });
    expect(gmapsDecision("https://maps.google.com/?q=-5.14,119.43")).toEqual({ kind: "filled", lat: -5.14, lng: 119.43 });
  });

  it("flags short links that cannot be read", () => {
    expect(gmapsDecision("https://maps.app.goo.gl/AbCdEf123")).toEqual({ kind: "short" });
    expect(gmapsDecision("https://goo.gl/maps/xyz")).toEqual({ kind: "short" });
  });

  it("reports links without coordinates, and stays idle for empty or non-links", () => {
    expect(gmapsDecision("https://www.google.com/maps/place/Vida+View+Makassar")).toEqual({ kind: "not-found" });
    expect(gmapsDecision("")).toEqual({ kind: "idle" });
    expect(gmapsDecision("   ")).toEqual({ kind: "idle" });
    expect(gmapsDecision(null)).toEqual({ kind: "idle" });
    expect(gmapsDecision("vida view makassar")).toEqual({ kind: "idle" });
  });

  it("has the agreed messages", () => {
    expect(GMAPS_MESSAGES.filled).toBe("Koordinat diambil dari link.");
    expect(GMAPS_MESSAGES.short).toBe(
      "Link pendek tidak bisa dibaca otomatis. Buka link di browser lalu salin alamat lengkapnya, atau isi koordinat manual.",
    );
  });
});

describe("mapPreviewPlace", () => {
  it("prefers coordinates", () => {
    expect(mapPreviewPlace({ name: "Vida View", address: "", latitude: -5.1, longitude: 119.4 })).toEqual({
      name: "Vida View",
      address: null,
      latitude: -5.1,
      longitude: 119.4,
    });
  });

  it("falls back to name + address", () => {
    expect(mapPreviewPlace({ name: " Delft ", address: "Jl. Metro", latitude: null, longitude: null })).toEqual({
      name: "Delft",
      address: "Jl. Metro",
      latitude: null,
      longitude: null,
    });
  });

  it("returns null when there is not enough to show a map", () => {
    expect(mapPreviewPlace({ name: "Delft", address: "", latitude: null, longitude: 119 })).toBeNull();
    expect(mapPreviewPlace({ name: "", address: "Jl. Metro", latitude: null, longitude: null })).toBeNull();
    expect(mapPreviewPlace({ name: "X", address: "", latitude: Number.NaN, longitude: 1 })).toBeNull();
    expect(mapPreviewPlace({ name: "X", address: "", latitude: 0, longitude: 0 })).toBeNull();
    expect(mapPreviewPlace({ name: "X", address: "", latitude: 95, longitude: 1 })).toBeNull();
  });
});

describe("delete eligibility", () => {
  it("allows deleting an apartment without units", () => {
    expect(locationDeleteState(0, true)).toEqual({ canDelete: true, message: null, offerDeactivate: false });
  });

  it("offers deactivation when an active apartment still has units", () => {
    expect(locationDeleteState(3, true)).toEqual({
      canDelete: false,
      message: "Apartemen masih punya 3 unit. Nonaktifkan saja?",
      offerDeactivate: true,
    });
  });

  it("explains when an inactive apartment still has units", () => {
    const state = locationDeleteState(2, false);
    expect(state.canDelete).toBe(false);
    expect(state.offerDeactivate).toBe(false);
    expect(state.message).toContain("2 unit");
  });

  it("room types follow the same rule", () => {
    expect(roomTypeDeleteState(0, true).canDelete).toBe(true);
    expect(roomTypeDeleteState(4, true)).toEqual({
      canDelete: false,
      message: "4 unit memakai tipe ini. Nonaktifkan saja?",
      offerDeactivate: true,
    });
    expect(roomTypeDeleteState(4, false).offerDeactivate).toBe(false);
  });

  it("has a generic message when the count is unknown (DB restrict)", () => {
    expect(locationInUseMessage(null)).toBe("Apartemen masih punya unit. Nonaktifkan saja?");
    expect(roomTypeInUseMessage(0)).toBe("Tipe ini masih dipakai unit. Nonaktifkan saja?");
  });
});

describe("autofill helpers", () => {
  it("suggests a short name within 16 characters, cut per word", () => {
    expect(suggestShortName("Vida View")).toBe("Vida View");
    expect(suggestShortName("Vida View Apartemen Makassar")).toBe("Vida View");
    expect(suggestShortName("  Delft   CPI  ")).toBe("Delft CPI");
    expect(suggestShortName("Supercalifragilistic Tower")).toBe("Supercalifragili");
    expect(suggestShortName("")).toBe("");
  });

  it("guesses the room category from the type name", () => {
    expect(guessRoomCategory("Studio Corner")).toBe("studio");
    expect(guessRoomCategory("2BR Corner")).toBe("2br");
    expect(guessRoomCategory("1 Bedroom")).toBe("1br");
    expect(guessRoomCategory("Tipe 3 kamar")).toBe("3br");
    expect(guessRoomCategory("Loft")).toBe("other");
    expect(guessRoomCategory("Lantai 12 BR")).toBe("other");
  });

  it("parses number inputs for zod", () => {
    expect(parseNumberInput("")).toBeNull();
    expect(parseNumberInput("  ")).toBeNull();
    expect(parseNumberInput(undefined)).toBeNull();
    expect(parseNumberInput("-5,1476")).toBe(-5.1476);
    expect(parseNumberInput("119.43")).toBe(119.43);
    expect(parseNumberInput(7)).toBe(7);
    expect(parseNumberInput("abc")).toBeNaN();
  });
});

describe("labels", () => {
  it("formats counts and categories", () => {
    expect(unitCountLabel(0)).toBe("0 unit");
    expect(unitCountLabel(12)).toBe("12 unit");
    expect(categoryLabel("2br")).toBe("2 Bedroom");
    expect(categoryLabel("aneh")).toBe("Lainnya");
    expect(normalizeCategory("1br")).toBe("1br");
    expect(normalizeCategory("penthouse")).toBe("other");
    expect(normalizeCategory(null)).toBe("other");
  });

  it("explains public visibility (active AND has a published unit)", () => {
    expect(locationVisibility(true, 2)).toBe("tampil");
    expect(locationVisibility(true, 0)).toBe("tanpa-unit");
    expect(locationVisibility(false, 5)).toBe("nonaktif");
    expect(visibilityNote("tanpa-unit")).toContain("belum ada unit yang tampil");
  });

  it("maps numeric zod errors to Indonesian messages", () => {
    expect(fieldMessage("latitude", "Invalid input")).toContain("Latitude");
    expect(fieldMessage("sortOrder", "Too big")).toBe("Isi urutan dengan angka bulat 0 sampai 100.000.");
    expect(fieldMessage("name", "Nama minimal 2 karakter.")).toBe("Nama minimal 2 karakter.");
  });
});

describe("newLocationSchema", () => {
  it("accepts name, short name and slug", () => {
    const parsed = newLocationSchema.safeParse({ name: "Grand Sulawesi", shortName: "Grand Sulawesi", slug: "grand-sulawesi" });
    expect(parsed.success).toBe(true);
  });

  it("rejects a short name over 16 characters and a bad slug", () => {
    const parsed = newLocationSchema.safeParse({ name: "Grand", shortName: "Grand Sulawesi Tower", slug: "Grand Sulawesi" });
    expect(parsed.success).toBe(false);
    const fields = parsed.error!.issues.map((i) => i.path.join("."));
    expect(fields).toEqual(expect.arrayContaining(["shortName", "slug"]));
  });
});

describe("isLocationImagePath", () => {
  it("only accepts uploads in the locations folder", () => {
    expect(isLocationImagePath("locations/0b1c2d3e-aaaa-bbbb-cccc-1234567890ab.webp")).toBe(true);
    expect(isLocationImagePath("units/abc.webp")).toBe(false);
    expect(isLocationImagePath("locations/../units/abc.webp")).toBe(false);
    expect(isLocationImagePath("https://example.com/a.jpg")).toBe(false);
  });
});

const rawType = (over: Partial<RawRoomType>): RawRoomType => ({
  id: 1,
  location_id: 10,
  name: "Studio",
  slug: "studio",
  category: "studio",
  default_max_guests: 2,
  sort_order: 1,
  is_active: true,
  ...over,
});

describe("mappers", () => {
  it("builds location cards with unit, published and room type counts", () => {
    const cards = toLocationCards(
      [
        { id: 2, slug: "delft-cpi", name: "Delft CPI", short_name: null, area: " ", hero_image: null, sort_order: 2, is_active: true },
        { id: 1, slug: "baru", name: "Apartemen Baru", short_name: "Baru", area: "Tamalanrea", hero_image: null, sort_order: 1, is_active: false },
      ],
      [
        { location_id: 2, is_published: true },
        { location_id: 2, is_published: false },
      ],
      [{ location_id: 2 }, { location_id: 2 }, { location_id: 1 }],
    );
    expect(cards.map((c) => c.id)).toEqual([1, 2]);
    expect(cards[1]).toMatchObject({
      shortName: "Delft CPI",
      area: null,
      unitCount: 2,
      publishedUnitCount: 1,
      roomTypeCount: 2,
      imageUrl: "/images/locations/delft-cpi.jpg",
    });
    expect(cards[0]).toMatchObject({ unitCount: 0, publishedUnitCount: 0, roomTypeCount: 1, imageUrl: null, isActive: false });
  });

  it("counts units per room type and sorts types", () => {
    const rows = toRoomTypeRows(
      [rawType({ id: 1, sort_order: 2, category: "studio" }), rawType({ id: 2, name: "2BR", slug: "2br", sort_order: 1, category: "x" })],
      [{ room_type_id: 1 }, { room_type_id: 1 }, { room_type_id: null }],
    );
    expect(rows.map((r) => [r.id, r.unitCount, r.category])).toEqual([
      [2, 0, "other"],
      [1, 2, "studio"],
    ]);
  });

  it("builds the edit form data", () => {
    const row: RawLocationFull = {
      id: 10,
      slug: "vida-view",
      name: "Vida View Apartemen",
      short_name: null,
      area: null,
      hero_image: "https://images.unsplash.com/photo-1",
      sort_order: 1,
      is_active: true,
      address: null,
      gmaps_url: null,
      latitude: -5.1,
      longitude: 119.4,
      tagline: null,
      description: null,
    };
    const detail = toLocationDetail(
      row,
      [rawType({ id: 1, location_id: 10 }), rawType({ id: 5, location_id: 11 })],
      [
        { location_id: 10, room_type_id: 1, is_published: true },
        { location_id: 10, room_type_id: null, is_published: false },
        { location_id: 10, room_type_id: 5, is_published: true },
        { location_id: 11, room_type_id: 5, is_published: true },
      ],
    );
    expect(detail.unitCount).toBe(3);
    expect(detail.publishedUnitCount).toBe(2);
    expect(detail.unitsWithoutType).toBe(2);
    expect(detail.roomTypes).toHaveLength(1);
    expect(detail.roomTypes[0].unitCount).toBe(1);
    expect(detail.hasFallbackImage).toBe(true);
    expect(detail.values).toMatchObject({
      shortName: "Vida View",
      area: "",
      gmapsUrl: "",
      heroImage: null,
      latitude: -5.1,
      sortOrder: 1,
      isActive: true,
    });
  });

  it("prepares room type form values", () => {
    expect(roomTypeFormValues(10, null, 4)).toEqual({
      locationId: 10,
      name: "",
      slug: "",
      category: "other",
      defaultMaxGuests: null,
      sortOrder: 4,
      isActive: true,
    });
  });
});
