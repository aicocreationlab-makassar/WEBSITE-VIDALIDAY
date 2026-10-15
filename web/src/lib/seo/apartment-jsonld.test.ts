import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import {
  apartmentPageUrl,
  buildApartmentBreadcrumbJsonLd,
  buildApartmentComplexJsonLd,
  buildApartmentPageJsonLd,
  plainSummary,
  type ApartmentJsonLdLocation,
} from "./apartment-jsonld";

const SITE = "https://vidaliday.com/";

function location(overrides: Partial<ApartmentJsonLdLocation> = {}): ApartmentJsonLdLocation {
  return {
    slug: "vida-view",
    name: "Apartemen Vida View",
    shortName: "Vida View",
    tagline: "Apartemen dengan kolam renang di Panakkukang",
    description: "**Vida View** berada di pusat kota.\n\nDekat mall dan kuliner.",
    address: "Jl. Boulevard Raya No. 1",
    gmapsUrl: null,
    latitude: -5.15,
    longitude: 119.45,
    imageUrl: "/images/locations/vida-view.jpg",
    unitCount: 24,
    availableCount: 20,
    ...overrides,
  };
}

const FACILITIES = [
  { name: "Kolam renang", imageUrl: "https://abc.supabase.co/storage/v1/object/public/media/facilities/pool.webp" },
  { name: "Gym", imageUrl: null },
  { name: "Taman", imageUrl: "https://images.unsplash.com/photo-123" },
];

describe("apartment JSON-LD", () => {
  it("builds the ApartmentComplex node", () => {
    const node = buildApartmentComplexJsonLd({ location: location(), siteUrl: SITE, facilities: FACILITIES });
    expect(node["@type"]).toBe("ApartmentComplex");
    expect(node["@id"]).toBe("https://vidaliday.com/apartemen/vida-view#apartemen");
    expect(node.url).toBe("https://vidaliday.com/apartemen/vida-view");
    expect(node.name).toBe("Apartemen Vida View");
    expect(node.alternateName).toBe("Vida View");
    expect(node.description).toBe("Vida View berada di pusat kota. Dekat mall dan kuliner.");
    // Foto stok Unsplash tidak ikut; path situs jadi URL absolut.
    expect(node.image).toEqual([
      "https://vidaliday.com/images/locations/vida-view.jpg",
      "https://abc.supabase.co/storage/v1/object/public/media/facilities/pool.webp",
    ]);
    expect(node.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "Jl. Boulevard Raya No. 1",
      addressLocality: "Makassar",
      addressRegion: "Sulawesi Selatan",
      addressCountry: "ID",
    });
    expect(node.geo).toEqual({ "@type": "GeoCoordinates", latitude: -5.15, longitude: 119.45 });
    expect(node.hasMap).toBe("https://www.google.com/maps/search/?api=1&query=-5.15%2C119.45");
    expect(node.numberOfAccommodationUnits).toEqual({ "@type": "QuantitativeValue", value: 24 });
    expect(node.numberOfAvailableAccommodationUnits).toEqual({ "@type": "QuantitativeValue", value: 20 });
    expect(node.amenityFeature).toEqual([
      { "@type": "LocationFeatureSpecification", name: "Kolam renang", value: true },
      { "@type": "LocationFeatureSpecification", name: "Gym", value: true },
      { "@type": "LocationFeatureSpecification", name: "Taman", value: true },
    ]);
  });

  it("omits unknown values and falls back to the tagline", () => {
    const node = buildApartmentComplexJsonLd({
      location: location({
        shortName: "Apartemen Vida View",
        description: null,
        address: null,
        latitude: null,
        longitude: null,
        imageUrl: null,
        unitCount: 0,
        availableCount: 0,
        gmapsUrl: "https://maps.google.com/?q=vida",
      }),
      siteUrl: SITE,
    });
    for (const key of ["alternateName", "image", "geo", "numberOfAccommodationUnits", "amenityFeature"]) {
      expect(node).not.toHaveProperty(key);
    }
    expect(node.description).toBe("Apartemen dengan kolam renang di Panakkukang");
    expect(node.address).not.toHaveProperty("streetAddress");
    expect(node.hasMap).toBe("https://maps.google.com/?q=vida");
  });

  it("builds the breadcrumb Beranda > apartemen", () => {
    const crumbs = buildApartmentBreadcrumbJsonLd({ location: location(), siteUrl: SITE });
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Beranda", item: "https://vidaliday.com/" },
      { "@type": "ListItem", position: 2, name: "Vida View", item: "https://vidaliday.com/apartemen/vida-view" },
    ]);
  });

  it("returns all nodes in order and serializes safely", () => {
    const faqs = [{ question: "Bisa *harian*?", answer: "Bisa, minimal 1 malam." }];
    const all = buildApartmentPageJsonLd({ location: location({ name: "Vida </script>" }), siteUrl: SITE, faqs });
    expect(all.map((node) => node["@type"])).toEqual(["ApartmentComplex", "FAQPage", "BreadcrumbList"]);
    expect(all[1].mainEntity).toEqual([
      { "@type": "Question", name: "Bisa harian?", acceptedAnswer: { "@type": "Answer", text: "Bisa, minimal 1 malam." } },
    ]);
    expect(serializeJsonLd(all)).not.toContain("</script>");
    expect(buildApartmentPageJsonLd({ location: location(), siteUrl: SITE }).map((node) => node["@type"])).toEqual([
      "ApartmentComplex",
      "BreadcrumbList",
    ]);
    expect(apartmentPageUrl("https://vidaliday.com", "a b")).toBe("https://vidaliday.com/apartemen/a%20b");
  });

  it("summarizes text on a word boundary", () => {
    expect(plainSummary(null)).toBeNull();
    expect(plainSummary("  **  ")).toBeNull();
    expect(plainSummary("Satu  dua\n\ntiga")).toBe("Satu dua tiga");
    expect(plainSummary("Apartemen nyaman dekat pantai, cocok untuk keluarga", 30)).toBe("Apartemen nyaman dekat pantai…");
  });
});
