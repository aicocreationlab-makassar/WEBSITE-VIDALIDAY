// JSON-LD halaman landing tipe kamar /apartemen/[slug]/[tipe]: BreadcrumbList, ItemList unit,
// AggregateOffer (kalau ada unit tersedia), FAQPage. Fungsi murni, ada test.

import { landingPath, type LandingData } from "@/components/public/landing/landing-model";
import { apartmentPageUrl } from "@/lib/seo/apartment-jsonld";
import { absoluteUrl, buildFaqPageJsonLd } from "@/lib/seo/home-jsonld";
import type { JsonLdObject } from "@/lib/seo/json-ld";
import { unitPageUrl } from "@/lib/seo/unit-jsonld";
import type { Faq } from "@/types/domain";

const SCHEMA_CONTEXT = "https://schema.org";

export type LandingJsonLdInput = {
  data: LandingData;
  siteUrl: string;
  faqs?: Pick<Faq, "question" | "answer">[];
};

export function landingPageUrl(siteUrl: string, data: LandingData): string {
  return absoluteUrl(siteUrl.replace(/\/+$/, ""), landingPath(data));
}

export function buildLandingBreadcrumbJsonLd({ data, siteUrl }: LandingJsonLdInput): JsonLdObject {
  const base = siteUrl.replace(/\/+$/, "");
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: absoluteUrl(base, "/") },
      { "@type": "ListItem", position: 2, name: data.location.shortName, item: apartmentPageUrl(base, data.location.slug) },
      { "@type": "ListItem", position: 3, name: data.type.name, item: landingPageUrl(base, data) },
    ],
  };
}

export function buildLandingUnitListJsonLd({ data, siteUrl }: LandingJsonLdInput): JsonLdObject {
  const base = siteUrl.replace(/\/+$/, "");
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "ItemList",
    "@id": `${landingPageUrl(base, data)}#units`,
    name: `Unit ${data.type.name} di ${data.location.shortName}`,
    numberOfItems: data.units.length,
    itemListElement: data.units.map((unit, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: unit.name,
      url: unitPageUrl(base, unit.slug),
    })),
  };
}

/** Rentang harga unit tersedia; semua penuh → null (script tidak dirender). */
export function buildLandingOffersJsonLd({ data, siteUrl }: LandingJsonLdInput): JsonLdObject | null {
  if (data.allFull || !data.priceFrom) return null;
  const base = siteUrl.replace(/\/+$/, "");
  const url = landingPageUrl(base, data);
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "AggregateOffer",
    "@id": `${url}#offers`,
    url,
    priceCurrency: "IDR",
    lowPrice: data.priceFrom,
    highPrice: data.priceTo ?? data.priceFrom,
    offerCount: data.type.availableCount,
    availability: "https://schema.org/InStock",
    itemOffered: {
      "@type": "Apartment",
      name: `${data.type.name} di ${data.location.shortName}`,
      containedInPlace: { "@id": `${apartmentPageUrl(base, data.location.slug)}#apartemen` },
    },
  };
}

/** Urut: BreadcrumbList, ItemList, AggregateOffer (kalau ada), FAQPage (kalau ada). */
export function buildLandingJsonLd(input: LandingJsonLdInput): JsonLdObject[] {
  const offers = buildLandingOffersJsonLd(input);
  const faqPage = buildFaqPageJsonLd(input.faqs ?? []);
  return [
    buildLandingBreadcrumbJsonLd(input),
    buildLandingUnitListJsonLd(input),
    ...(offers ? [offers] : []),
    ...(faqPage ? [faqPage] : []),
  ];
}
