// Pembentuk JSON-LD beranda (PRD 6.9): Organization, WebSite, LodgingBusiness (+ lokasi gedung,
// jam layanan, sameAs), FAQPage. Fungsi murni, ada test.

import { formatRupiah, normalizeWhatsapp, stripMarkdown, toDisplayLegalName } from "@/lib/format";
import { openingHoursSpecification } from "@/lib/seo/hours";
import type { JsonLdObject } from "@/lib/seo/json-ld";
import type { Faq } from "@/types/domain";

export const BRAND_NAME = "VIDALIDAY";
export const LOGO_PATH = "/images/logo-vidaliday.jpg";

const SCHEMA_CONTEXT = "https://schema.org";
const ABSOLUTE = /^https?:\/\//i;

/** Path situs ("/images/a.jpg") → URL absolut; URL penuh dipakai apa adanya. */
export function absoluteUrl(siteUrl: string, pathOrUrl: string): string {
  const value = pathOrUrl.trim();
  if (ABSOLUTE.test(value)) return value;
  const base = siteUrl.replace(/\/+$/, "");
  return `${base}/${value.replace(/^\/+/, "")}`;
}

/** Harga per malam terendah sampai tertinggi: "Rp250.000 - Rp1.500.000". Tanpa harga valid → null. */
export function priceRangeOf(prices: number[]): string | null {
  const valid = prices.filter((price) => Number.isFinite(price) && price > 0);
  if (!valid.length) return null;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  return min === max ? formatRupiah(min) : `${formatRupiah(min)} - ${formatRupiah(max)}`;
}

/** Tautan profil resmi (Instagram, Facebook, TikTok, Google Business); yang kosong/tidak valid dibuang. */
export function cleanSameAs(links: (string | null | undefined)[] | undefined): string[] {
  return [...new Set((links ?? []).map((link) => link?.trim() ?? "").filter((link) => ABSOLUTE.test(link)))];
}

export type JsonLdLocation = {
  name: string;
  /** URL absolut halaman apartemen. */
  url: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type LodgingBusinessInput = {
  /** Dari getSiteUrl(), tanpa garis miring di akhir. */
  siteUrl: string;
  whatsappNumber: string;
  /** Harga efektif per malam semua unit published. */
  prices: number[];
  description?: string | null;
  email?: string | null;
  /** Foto gedung (path situs atau URL penuh). Kosong → logo. */
  images?: (string | null | undefined)[];
  legalName?: string | null;
  officeHours?: string | null;
  sameAs?: (string | null | undefined)[];
  /** Gedung yang dikelola; alamat dan koordinat gedung pertama dipakai sebagai alamat bisnis. */
  locations?: JsonLdLocation[];
};

function postalAddress(street: string | null | undefined) {
  return {
    "@type": "PostalAddress",
    ...(street ? { streetAddress: street } : {}),
    addressLocality: "Makassar",
    addressRegion: "Sulawesi Selatan",
    addressCountry: "ID",
  };
}

function geo(latitude: number | null, longitude: number | null) {
  return latitude != null && longitude != null ? { "@type": "GeoCoordinates", latitude, longitude } : null;
}

export function buildLodgingBusinessJsonLd(input: LodgingBusinessInput): JsonLdObject {
  const siteUrl = input.siteUrl.replace(/\/+$/, "");
  const logo = absoluteUrl(siteUrl, LOGO_PATH);
  const images = [
    ...new Set(
      (input.images ?? [])
        .filter((image): image is string => Boolean(image && image.trim()))
        .map((image) => absoluteUrl(siteUrl, image)),
    ),
  ];
  const phone = normalizeWhatsapp(input.whatsappNumber);
  const priceRange = priceRangeOf(input.prices);
  const description = input.description?.trim();
  const email = input.email?.trim();
  const legalName = input.legalName?.trim() ? toDisplayLegalName(input.legalName) : "";
  const hours = openingHoursSpecification(input.officeHours);
  const sameAs = cleanSameAs(input.sameAs);
  const locations = input.locations ?? [];
  const main = locations[0];
  const mainGeo = main ? geo(main.latitude, main.longitude) : null;

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "LodgingBusiness",
    "@id": `${siteUrl}/#lodging`,
    name: BRAND_NAME,
    ...(legalName ? { legalName } : {}),
    url: siteUrl,
    logo,
    image: images.length ? images : [logo],
    ...(description ? { description } : {}),
    ...(phone ? { telephone: `+${phone}` } : {}),
    ...(email ? { email } : {}),
    ...(priceRange ? { priceRange, currenciesAccepted: "IDR" } : {}),
    address: postalAddress(main?.address),
    ...(mainGeo ? { geo: mainGeo } : {}),
    areaServed: { "@type": "City", name: "Makassar" },
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    parentOrganization: { "@id": `${siteUrl}/#organization` },
    ...(locations.length
      ? {
          location: locations.map((location) => {
            const point = geo(location.latitude, location.longitude);
            return {
              "@type": "ApartmentComplex",
              "@id": `${location.url}#apartemen`,
              name: location.name,
              url: location.url,
              address: postalAddress(location.address),
              ...(point ? { geo: point } : {}),
            };
          }),
        }
      : {}),
  };
}

export type OrganizationInput = {
  siteUrl: string;
  legalName?: string | null;
  email?: string | null;
  whatsappNumber: string;
  officeHours?: string | null;
  sameAs?: (string | null | undefined)[];
};

/** Entitas badan usaha (#organization) yang dirujuk LodgingBusiness dan WebSite. */
export function buildOrganizationJsonLd(input: OrganizationInput): JsonLdObject {
  const siteUrl = input.siteUrl.replace(/\/+$/, "");
  const phone = normalizeWhatsapp(input.whatsappNumber);
  const email = input.email?.trim();
  const legalName = input.legalName?.trim() ? toDisplayLegalName(input.legalName) : "";
  const hours = openingHoursSpecification(input.officeHours);
  const sameAs = cleanSameAs(input.sameAs);
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: BRAND_NAME,
    ...(legalName ? { legalName } : {}),
    url: siteUrl,
    logo: { "@type": "ImageObject", url: absoluteUrl(siteUrl, LOGO_PATH) },
    ...(email ? { email } : {}),
    ...(phone
      ? {
          contactPoint: [
            {
              "@type": "ContactPoint",
              contactType: "customer service",
              telephone: `+${phone}`,
              availableLanguage: ["id"],
              ...(hours.length ? { hoursAvailable: hours } : {}),
            },
          ],
        }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
    areaServed: { "@type": "City", name: "Makassar" },
  };
}

export function buildWebSiteJsonLd({ siteUrl: raw }: { siteUrl: string }): JsonLdObject {
  const siteUrl = raw.replace(/\/+$/, "");
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: BRAND_NAME,
    url: siteUrl,
    inLanguage: "id",
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

/** FAQPage dari FAQ aktif; penanda markdown dibuang. Tanpa FAQ → null (script tidak dirender). */
export function buildFaqPageJsonLd(faqs: Pick<Faq, "question" | "answer">[]): JsonLdObject | null {
  const entries = faqs
    .map((faq) => ({ question: stripMarkdown(faq.question).trim(), answer: stripMarkdown(faq.answer).trim() }))
    .filter((entry) => entry.question && entry.answer);
  if (!entries.length) return null;

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export type HomeJsonLdInput = LodgingBusinessInput & {
  faqs: Pick<Faq, "question" | "answer">[];
};

/** Semua JSON-LD beranda, urut: Organization, WebSite, LodgingBusiness, FAQPage (kalau ada FAQ). */
export function buildHomeJsonLd({ faqs, ...lodging }: HomeJsonLdInput): JsonLdObject[] {
  const faqPage = buildFaqPageJsonLd(faqs);
  return [
    buildOrganizationJsonLd({
      siteUrl: lodging.siteUrl,
      legalName: lodging.legalName,
      email: lodging.email,
      whatsappNumber: lodging.whatsappNumber,
      officeHours: lodging.officeHours,
      sameAs: lodging.sameAs,
    }),
    buildWebSiteJsonLd({ siteUrl: lodging.siteUrl }),
    buildLodgingBusinessJsonLd(lodging),
    ...(faqPage ? [faqPage] : []),
  ];
}
