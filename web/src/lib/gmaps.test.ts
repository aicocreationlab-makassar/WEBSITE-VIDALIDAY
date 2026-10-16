import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";
import { isShortGmapsLink, mapEmbedUrl, mapExternalUrl, parseGmapsCoordinates } from "./gmaps";
import { slugify, uniqueSlug, unitSlug } from "./slug";

describe("parseGmapsCoordinates", () => {
  it.each([
    ["https://www.google.com/maps/place/Vida+View/@-5.1567,119.4456,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-5.15671!4d119.44789", { lat: -5.15671, lng: 119.44789 }],
    ["https://www.google.com/maps/@-5.1567,119.4456,15z", { lat: -5.1567, lng: 119.4456 }],
    ["https://maps.google.com/?q=-5.135,119.405", { lat: -5.135, lng: 119.405 }],
    ["https://www.google.com/maps/search/?api=1&query=-5.135%2C119.405", { lat: -5.135, lng: 119.405 }],
  ])("reads %s", (url, expected) => {
    expect(parseGmapsCoordinates(url)).toEqual(expected);
  });

  it("returns null for query-style and short links", () => {
    expect(parseGmapsCoordinates("https://maps.google.com/?q=Delft+Apartment+CPI+Makassar")).toBeNull();
    expect(parseGmapsCoordinates("https://maps.app.goo.gl/fkvUg2jpHedbgXXC9")).toBeNull();
    expect(isShortGmapsLink("https://maps.app.goo.gl/fkvUg2jpHedbgXXC9")).toBe(true);
  });

  it("builds embed and external URLs", () => {
    const place = { name: "Apartemen Vida View", address: "Jl. Topaz Raya, Makassar", latitude: null, longitude: null };
    expect(mapEmbedUrl(place)).toBe(
      "https://www.google.com/maps?q=Apartemen%20Vida%20View%2C%20Jl.%20Topaz%20Raya%2C%20Makassar&z=16&output=embed",
    );
    expect(mapEmbedUrl({ ...place, latitude: -5.1, longitude: 119.4 })).toContain("q=-5.1%2C119.4");
    expect(mapExternalUrl({ ...place, gmapsUrl: "https://maps.app.goo.gl/x" })).toBe("https://maps.app.goo.gl/x");
    expect(mapExternalUrl(place)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Apartemen%20Vida%20View%2C%20Jl.%20Topaz%20Raya%2C%20Makassar",
    );
  });
});

describe("slug", () => {
  it("slugifies names", () => {
    expect(slugify("Studio AT 26X")).toBe("studio-at-26x");
    expect(slugify("2 Bedroom / Corner")).toBe("2-bedroom-corner");
    expect(slugify("Kafe & Resto")).toBe("kafe-dan-resto");
  });

  it("makes unique slugs and unit slugs with the apartment", () => {
    expect(uniqueSlug("Studio AT 26X", ["studio-at-26x", "studio-at-26x-2"])).toBe("studio-at-26x-3");
    expect(unitSlug("Studio AT 26X", "vida-view")).toBe("studio-at-26x-vida-view");
    expect(unitSlug("Studio Vida View 12", "vida-view")).toBe("studio-vida-view-12");
  });
});

describe("csv", () => {
  it("quotes, escapes and guards against formulas", () => {
    expect(csvCell('Halo, "admin"')).toBe('"Halo, ""admin"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    // Excel berlocale Indonesia memisah sel dengan titik koma.
    expect(csvCell("Budi;=1+1;")).toBe('"Budi;=1+1;"');
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(null)).toBe("");
  });

  it("starts with a UTF-8 BOM and uses CRLF", () => {
    const csv = toCsv(["Kode", "Nama"], [["VDL-1", "Budi"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toBe("﻿Kode,Nama\r\nVDL-1,Budi\r\n");
  });
});
