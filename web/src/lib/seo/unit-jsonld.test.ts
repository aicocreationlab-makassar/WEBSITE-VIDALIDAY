import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { AMENITY, makeUnit } from "@/lib/test-fixtures";
import type { UnitDetail } from "@/types/domain";
import {
  buildApartmentJsonLd,
  buildUnitBreadcrumbJsonLd,
  buildUnitJsonLd,
  buildUnitOfferJsonLd,
  unitPageUrl,
} from "./unit-jsonld";

const SITE = "https://vidaliday.com/";

function detail(overrides: Partial<UnitDetail> = {}): UnitDetail {
  return {
    ...makeUnit({
      id: 1,
      slug: "studio-at-26x",
      name: "Studio AT 26X",
      tower: "Ashton",
      floorNumber: 26,
      sizeSqm: 24,
      amenities: [AMENITY.ac, AMENITY.wifi],
      photos: ["https://abc.supabase.co/storage/v1/object/public/media/units/a.jpg", "/images/b.jpg"],
    }),
    description: "**Unit baru** dekat mall.\n\nCocok untuk keluarga.",
    youtubeUrl: null,
    location: {
      id: 1,
      slug: "vida-view",
      name: "Apartemen Vida View",
      shortName: "Vida View",
      area: "Panakkukang",
      address: "Jl. Boulevard Raya",
      gmapsUrl: null,
      latitude: -5.15,
      longitude: 119.45,
      tagline: null,
    },
    ...overrides,
  };
}

describe("unit JSON-LD", () => {
  it("builds the Apartment node", () => {
    const node = buildApartmentJsonLd({ unit: detail(), siteUrl: SITE });
    expect(node["@type"]).toBe("Apartment");
    expect(node["@id"]).toBe("https://vidaliday.com/unit/studio-at-26x#apartment");
    expect(node.url).toBe("https://vidaliday.com/unit/studio-at-26x");
    expect(node.description).toBe("Unit baru dekat mall. Cocok untuk keluarga.");
    expect(node.image).toEqual([
      "https://abc.supabase.co/storage/v1/object/public/media/units/a.jpg",
      "https://vidaliday.com/images/b.jpg",
    ]);
    expect(node.numberOfRooms).toBe(1);
    expect(node).not.toHaveProperty("numberOfBedrooms");
    expect(node.occupancy).toEqual({ "@type": "QuantitativeValue", minValue: 1, maxValue: 3 });
    expect(node.floorSize).toEqual({ "@type": "QuantitativeValue", value: 24, unitCode: "MTK" });
    expect(node.floorLevel).toBe("26");
    expect(node.geo).toEqual({ "@type": "GeoCoordinates", latitude: -5.15, longitude: 119.45 });
    expect(node.containedInPlace).toMatchObject({
      "@type": "ApartmentComplex",
      name: "Apartemen Vida View",
      url: "https://vidaliday.com/apartemen/vida-view",
    });
    expect(node.amenityFeature).toEqual([
      { "@type": "LocationFeatureSpecification", name: "AC", value: true },
      { "@type": "LocationFeatureSpecification", name: "WiFi", value: true },
    ]);
  });

  it("omits unknown values", () => {
    const node = buildApartmentJsonLd({
      unit: detail({
        category: "other",
        sizeSqm: null,
        floorNumber: null,
        description: null,
        photos: [],
        amenities: [],
        location: { ...detail().location, latitude: null, longitude: null, address: null },
      }),
      siteUrl: SITE,
    });
    for (const key of ["numberOfRooms", "floorSize", "floorLevel", "description", "image", "amenityFeature", "geo"]) {
      expect(node).not.toHaveProperty(key);
    }
    expect(node.address).not.toHaveProperty("streetAddress");
  });

  it("counts bedrooms for BR categories", () => {
    const node = buildApartmentJsonLd({ unit: detail({ category: "2br" }), siteUrl: SITE });
    expect(node.numberOfRooms).toBe(2);
    expect(node.numberOfBedrooms).toBe(2);
  });

  it("builds the Offer in IDR with availability", () => {
    const offer = buildUnitOfferJsonLd({ unit: detail(), siteUrl: SITE });
    expect(offer).toMatchObject({
      "@type": "Offer",
      price: 280000,
      priceCurrency: "IDR",
      availability: "https://schema.org/InStock",
      url: "https://vidaliday.com/unit/studio-at-26x",
      itemOffered: { "@id": "https://vidaliday.com/unit/studio-at-26x#apartment" },
    });
    expect(buildUnitOfferJsonLd({ unit: detail({ isAvailable: false }), siteUrl: SITE })?.availability).toBe(
      "https://schema.org/OutOfStock",
    );
    expect(buildUnitOfferJsonLd({ unit: detail({ effectivePrice: 0 }), siteUrl: SITE })).toBeNull();
  });

  it("builds the breadcrumb Beranda > apartemen > unit", () => {
    const crumbs = buildUnitBreadcrumbJsonLd({ unit: detail(), siteUrl: SITE });
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Beranda", item: "https://vidaliday.com/" },
      { "@type": "ListItem", position: 2, name: "Vida View", item: "https://vidaliday.com/apartemen/vida-view" },
      { "@type": "ListItem", position: 3, name: "Studio AT 26X", item: "https://vidaliday.com/unit/studio-at-26x" },
    ]);
  });

  it("returns all nodes and serializes safely", () => {
    const all = buildUnitJsonLd({ unit: detail({ name: "Unit </script>" }), siteUrl: SITE });
    expect(all.map((node) => node["@type"])).toEqual(["Apartment", "Offer", "BreadcrumbList"]);
    expect(serializeJsonLd(all)).not.toContain("</script>");
    expect(buildUnitJsonLd({ unit: detail({ effectivePrice: 0 }), siteUrl: SITE })).toHaveLength(2);
    expect(unitPageUrl("https://vidaliday.com", "a b")).toBe("https://vidaliday.com/unit/a%20b");
  });
});
