import { describe, expect, it } from "vitest";
import { activeFilterCount, EMPTY_FILTER, filterToSearchParams, parseSewaFilter, sewaHref } from "./filters";

describe("parseSewaFilter", () => {
  it("reads every documented parameter", () => {
    const filter = parseSewaFilter({
      lokasi: "vida-view",
      tipe: "2-bedroom-corner",
      kategori: "2br",
      min: "300000",
      max: "500000",
      tamu: "4",
      fasilitas: "5,1,5",
      penuh: "1",
      urut: "termurah",
      hal: "2",
    });
    expect(filter).toEqual({
      lokasi: "vida-view",
      tipe: "2-bedroom-corner",
      kategori: "2br",
      min: 300000,
      max: 500000,
      tamu: 4,
      fasilitas: [1, 5],
      penuh: true,
      urut: "termurah",
      hal: 2,
    });
  });

  it("ignores invalid parameters without throwing", () => {
    expect(
      parseSewaFilter({
        lokasi: "Vida View!",
        tipe: "studio",
        kategori: "penthouse",
        min: "-5",
        max: "abc",
        tamu: "99",
        fasilitas: "x,,0",
        penuh: "ya",
        urut: "acak",
        hal: "0",
      }),
    ).toEqual(EMPTY_FILTER);
  });

  it("drops tipe without lokasi and swaps a reversed price range", () => {
    const filter = parseSewaFilter(new URLSearchParams("tipe=studio&min=500000&max=300000"));
    expect(filter.tipe).toBeNull();
    expect([filter.min, filter.max]).toEqual([300000, 500000]);
  });

  it("takes the first value of repeated params", () => {
    expect(parseSewaFilter({ lokasi: ["delft-cpi", "vida-view"] }).lokasi).toBe("delft-cpi");
  });
});

describe("filter URLs", () => {
  it("omits defaults and keeps a stable order", () => {
    expect(sewaHref({ ...EMPTY_FILTER })).toBe("/sewa");
    expect(
      filterToSearchParams({ ...EMPTY_FILTER, lokasi: "vida-view", tipe: "studio", max: 300000, fasilitas: [5, 1] }).toString(),
    ).toBe("lokasi=vida-view&tipe=studio&max=300000&fasilitas=1%2C5");
  });

  it("round-trips through parse", () => {
    const filter = { ...EMPTY_FILTER, lokasi: "delft-cpi", min: 500000, tamu: 2, urut: "diskon" as const, hal: 3 };
    expect(parseSewaFilter(filterToSearchParams(filter))).toEqual(filter);
  });

  it("counts active filter groups", () => {
    expect(activeFilterCount(EMPTY_FILTER)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTER, lokasi: "x", min: 1, max: 2, fasilitas: [1, 2] })).toBe(3);
  });
});
