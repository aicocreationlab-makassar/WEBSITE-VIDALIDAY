// JSON-LD profil apartemen /apartemen/[slug] (PRD 6.7, 6.9): ApartmentComplex + FAQPage + BreadcrumbList.
// Fungsi murni, ada test di apartment-jsonld.test.ts.

import { normalizeWhatsapp, stripMarkdown } from "@/lib/format";
import { mapExternalUrl } from "@/lib/gmaps";
import { isStockPhoto } from "@/lib/media";
import { absoluteUrl, buildFaqPageJsonLd } from "@/lib/seo/home-jsonld";
import type { JsonLdObject } from "@/lib/seo/json-ld";
import { unitHref } from "@/lib/unit-display";
import type { CatalogUnit, Facility, Faq, LocationWithTypes } from "@/types/domain";

const SCHEMA_CONTEXT = "https://schema.org";

export type ApartmentJsonLdLocation = Pick<
  LocationWithTypes,
  | "slug"
  | "name"
  | "shortName"
  | "tagline"
  | "description"
  | "address"
  | "gmapsUrl"
  | "latitude"
  | "longitude"
  | "imageUrl"
  | "unitCount"
  | "availableCount"
>;

export type ApartmentJsonLdInput = {
  location: ApartmentJsonLdLocation;
  /** Dari getSiteUrl(), tanpa garis miring di akhir. */
  siteUrl: string;
  /** Fasilitas gedung apartemen ini (sudah disaring per lokasi). */
  facilities?: Pick<Facility, "name" | "imageUrl">[];
  /** FAQ yang tampil di halaman. Kosong → FAQPage tidak dibuat. */
  faqs?: Pick<Faq, "question" | "answer">[];
  /** Unit published apartemen ini (ItemList + AggregateOffer). */
  units?: Pick<CatalogUnit, "slug" | "name" | "effectivePrice" | "isAvailable">[];
  whatsappNumber?: string | null;
};

function trimBase(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, "");
}

/** "/apartemen/vida-view" */
export function apartmentPath(slug: string): string {
  return `/apartemen/${encodeURIComponent(slug)}`;
}

export function apartmentPageUrl(siteUrl: string, slug: string): string {
  return absoluteUrl(trimBase(siteUrl), apartmentPath(slug));
}

/** Teks polos satu baris dari teks DB (tanpa penanda markdown), dipotong rapi di batas kata. Kosong → null. */
export function plainSummary(text: string | null | undefined, max = 300): string | null {
  if (!text) return null;
  const flat = stripMarkdown(text).replace(/\s+/g, " ").trim();
  if (!flat) return null;
  if (flat.length <= max) return flat;
  // Sisakan satu karakter untuk "…"; potong di spasi terakhir kecuali potongan sudah jatuh di batas kata.
  const cut = flat.slice(0, max - 1);
  const atBoundary = /[\s,.;:!?]/.test(flat.charAt(max - 1));
  const lastSpace = cut.lastIndexOf(" ");
  const base = atBoundary || lastSpace <= max * 0.6 ? cut : cut.slice(0, lastSpace);
  return `${base.replace(/[\s,.;:–—-]+$/, "")}…`;
}

export function buildApartmentComplexJsonLd({ location, siteUrl, facilities = [], whatsappNumber }: ApartmentJsonLdInput): JsonLdObject {
  const base = trimBase(siteUrl);
  const url = apartmentPageUrl(base, location.slug);
  const phone = whatsappNumber ? normalizeWhatsapp(whatsappNumber) : "";
  const description = plainSummary(location.description) ?? plainSummary(location.tagline);
  const images = [
    ...new Set(
      [location.imageUrl, ...facilities.map((facility) => facility.imageUrl)]
        .filter((image): image is string => Boolean(image && image.trim()) && !isStockPhoto(image))
        .map((image) => absoluteUrl(base, image)),
    ),
  ];
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
  const amenities = [...new Set(facilities.map((facility) => facility.name.trim()).filter(Boolean))];

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "ApartmentComplex",
    "@id": `${url}#apartemen`,
    name: location.name,
    ...(location.shortName && location.shortName !== location.name ? { alternateName: location.shortName } : {}),
    url,
    ...(description ? { description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(phone ? { telephone: `+${phone}` } : {}),
    address,
    ...(geo ? { geo } : {}),
    hasMap: mapExternalUrl({
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      gmapsUrl: location.gmapsUrl,
    }),
    ...(location.unitCount > 0
      ? {
          numberOfAccommodationUnits: { "@type": "QuantitativeValue", value: location.unitCount },
          numberOfAvailableAccommodationUnits: { "@type": "QuantitativeValue", value: location.availableCount },
        }
      : {}),
    ...(amenities.length
      ? {
          amenityFeature: amenities.map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
        }
      : {}),
  };
}

/** Beranda → apartemen (nama pendek, sama dengan breadcrumb detail unit). */
export function buildApartmentBreadcrumbJsonLd({ location, siteUrl }: ApartmentJsonLdInput): JsonLdObject {
  const base = trimBase(siteUrl);
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: absoluteUrl(base, "/") },
      { "@type": "ListItem", position: 2, name: location.shortName, item: apartmentPageUrl(base, location.slug) },
    ],
  };
}

/** Rentang harga unit tersedia (AggregateOffer); tanpa unit tersedia → null. */
export function buildApartmentOffersJsonLd({ location, siteUrl, units = [] }: ApartmentJsonLdInput): JsonLdObject | null {
  const prices = units.filter((unit) => unit.isAvailable && unit.effectivePrice > 0).map((unit) => unit.effectivePrice);
  if (!prices.length) return null;
  const base = trimBase(siteUrl);
  const url = apartmentPageUrl(base, location.slug);
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "AggregateOffer",
    "@id": `${url}#offers`,
    url,
    priceCurrency: "IDR",
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    offerCount: prices.length,
    availability: "https://schema.org/InStock",
    itemOffered: { "@id": `${url}#apartemen` },
  };
}

/** Daftar unit published apartemen ini (ItemList); tanpa unit → null. */
export function buildApartmentUnitListJsonLd({ location, siteUrl, units = [] }: ApartmentJsonLdInput): JsonLdObject | null {
  if (!units.length) return null;
  const base = trimBase(siteUrl);
  const url = apartmentPageUrl(base, location.slug);
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "ItemList",
    "@id": `${url}#units`,
    name: `Unit di ${location.shortName}`,
    numberOfItems: units.length,
    itemListElement: units.map((unit, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: unit.name,
      url: absoluteUrl(base, unitHref(unit.slug)),
    })),
  };
}

/** Semua JSON-LD profil apartemen, urut: ApartmentComplex, AggregateOffer?, ItemList?, FAQPage?, BreadcrumbList. */
export function buildApartmentPageJsonLd(input: ApartmentJsonLdInput): JsonLdObject[] {
  const offers = buildApartmentOffersJsonLd(input);
  const list = buildApartmentUnitListJsonLd(input);
  const faqPage = buildFaqPageJsonLd(input.faqs ?? []);
  return [
    buildApartmentComplexJsonLd(input),
    ...(offers ? [offers] : []),
    ...(list ? [list] : []),
    ...(faqPage ? [faqPage] : []),
    buildApartmentBreadcrumbJsonLd(input),
  ];
}
