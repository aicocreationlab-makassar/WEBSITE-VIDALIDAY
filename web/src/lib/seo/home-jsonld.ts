// Pembentuk JSON-LD beranda (PRD 6.9): LodgingBusiness + FAQPage. Fungsi murni, ada test.

import { formatRupiah, normalizeWhatsapp, stripMarkdown } from "@/lib/format";
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
};

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

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "LodgingBusiness",
    "@id": `${siteUrl}/#lodging`,
    name: BRAND_NAME,
    url: siteUrl,
    logo,
    image: images.length ? images : [logo],
    ...(description ? { description } : {}),
    ...(phone ? { telephone: `+${phone}` } : {}),
    ...(email ? { email } : {}),
    ...(priceRange ? { priceRange, currenciesAccepted: "IDR" } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Makassar",
      addressRegion: "Sulawesi Selatan",
      addressCountry: "ID",
    },
    areaServed: { "@type": "City", name: "Makassar" },
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

/** Semua JSON-LD beranda, urut: LodgingBusiness, lalu FAQPage (kalau ada FAQ). */
export function buildHomeJsonLd({ faqs, ...lodging }: HomeJsonLdInput): JsonLdObject[] {
  const faqPage = buildFaqPageJsonLd(faqs);
  return faqPage ? [buildLodgingBusinessJsonLd(lodging), faqPage] : [buildLodgingBusinessJsonLd(lodging)];
}
