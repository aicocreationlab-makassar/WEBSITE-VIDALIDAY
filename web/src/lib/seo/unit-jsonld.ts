// JSON-LD detail unit (PRD 6.4, 6.9): Apartment + Offer (IDR) + BreadcrumbList. Fungsi murni, ada test.
// Offer dibuat sebagai node terpisah yang menunjuk Apartment lewat @id, karena `offers`
// bukan properti tipe Place/Accommodation di schema.org.

import { stripMarkdown } from "@/lib/format";
import { absoluteUrl, BRAND_NAME } from "@/lib/seo/home-jsonld";
import type { JsonLdObject } from "@/lib/seo/json-ld";
import { unitBreadcrumbs } from "@/lib/unit-detail";
import type { RoomCategory, UnitDetail } from "@/types/domain";

const SCHEMA_CONTEXT = "https://schema.org";

/** Jumlah kamar tidur per kategori; studio = satu ruang. "other" tidak diketahui. */
const ROOMS: Partial<Record<RoomCategory, { rooms: number; bedrooms: number }>> = {
  studio: { rooms: 1, bedrooms: 0 },
  "1br": { rooms: 1, bedrooms: 1 },
  "2br": { rooms: 2, bedrooms: 2 },
  "3br": { rooms: 3, bedrooms: 3 },
};

export type UnitJsonLdInput = {
  unit: UnitDetail;
  /** Dari getSiteUrl(), tanpa garis miring di akhir. */
  siteUrl: string;
};

function trimBase(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, "");
}

export function unitPageUrl(siteUrl: string, slug: string): string {
  return absoluteUrl(trimBase(siteUrl), `/unit/${encodeURIComponent(slug)}`);
}

function summary(text: string | null, max = 300): string | null {
  if (!text) return null;
  const flat = stripMarkdown(text).replace(/\s+/g, " ").trim();
  if (!flat) return null;
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

export function buildApartmentJsonLd({ unit, siteUrl }: UnitJsonLdInput): JsonLdObject {
  const base = trimBase(siteUrl);
  const url = unitPageUrl(base, unit.slug);
  const images = [...new Set(unit.photos.map((photo) => absoluteUrl(base, photo)))];
  const rooms = ROOMS[unit.category];
  const description = summary(unit.description);
  const { location } = unit;
  const address = {
    "@type": "PostalAddress",
    ...(location.address ? { streetAddress: location.address } : {}),
    addressLocality: "Makassar",
    addressRegion: "Sulawesi Selatan",
    addressCountry: "ID",
  };
  const geo =
    location.latitude != null && location.longitude != null
      ? { "@type": "GeoCoordinates", latitude: location.latitude, longitude: location.longitude }
      : null;

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Apartment",
    "@id": `${url}#apartment`,
    name: unit.name,
    url,
    ...(description ? { description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(rooms ? { numberOfRooms: rooms.rooms } : {}),
    ...(rooms && rooms.bedrooms > 0 ? { numberOfBedrooms: rooms.bedrooms } : {}),
    occupancy: { "@type": "QuantitativeValue", minValue: 1, maxValue: unit.maxGuests },
    ...(unit.sizeSqm != null && unit.sizeSqm > 0
      ? { floorSize: { "@type": "QuantitativeValue", value: unit.sizeSqm, unitCode: "MTK" } }
      : {}),
    ...(unit.floorNumber != null ? { floorLevel: String(unit.floorNumber) } : {}),
    address,
    ...(geo ? { geo } : {}),
    containedInPlace: {
      "@type": "ApartmentComplex",
      name: location.name,
      url: absoluteUrl(base, `/apartemen/${encodeURIComponent(location.slug)}`),
      address,
    },
    ...(unit.amenities.length
      ? {
          amenityFeature: unit.amenities.map((amenity) => ({
            "@type": "LocationFeatureSpecification",
            name: amenity.name,
            value: true,
          })),
        }
      : {}),
  };
}

/** Harga per malam saat ini. Harga tidak valid (0) → null, script Offer tidak dirender. */
export function buildUnitOfferJsonLd({ unit, siteUrl }: UnitJsonLdInput): JsonLdObject | null {
  if (!Number.isFinite(unit.effectivePrice) || unit.effectivePrice <= 0) return null;
  const base = trimBase(siteUrl);
  const url = unitPageUrl(base, unit.slug);
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Offer",
    "@id": `${url}#offer`,
    url,
    name: `Sewa ${unit.name}`,
    price: unit.effectivePrice,
    priceCurrency: "IDR",
    availability: unit.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: unit.effectivePrice,
      priceCurrency: "IDR",
      unitCode: "DAY",
      unitText: "malam",
    },
    itemOffered: { "@id": `${url}#apartment` },
    seller: { "@type": "Organization", name: BRAND_NAME, url: base },
  };
}

export function buildUnitBreadcrumbJsonLd({ unit, siteUrl }: UnitJsonLdInput): JsonLdObject {
  const base = trimBase(siteUrl);
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: unitBreadcrumbs(unit).map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(base, crumb.href),
    })),
  };
}

/**
 * Semua JSON-LD detail unit, urut: Apartment, Offer (kalau harga valid), BreadcrumbList. FAQ umum yang tampil
 * di halaman unit sengaja tidak diberi FAQPage: markup FAQ yang sama cukup di beranda dan profil apartemen
 * (PRD 6.9; panduan Google: FAQ berulang di banyak URL ditandai di satu tempat saja).
 */
export function buildUnitJsonLd(input: UnitJsonLdInput): JsonLdObject[] {
  const offer = buildUnitOfferJsonLd(input);
  return [buildApartmentJsonLd(input), ...(offer ? [offer] : []), buildUnitBreadcrumbJsonLd(input)];
}
