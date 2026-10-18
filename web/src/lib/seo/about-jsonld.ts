// JSON-LD halaman Tentang kami (/about): AboutPage yang menunjuk entitas Organization (#organization) dan
// BreadcrumbList. Membantu mesin pencari dan asisten AI mengenali siapa pengelola VIDALIDAY. Fungsi murni, ada test.

import { buildOrganizationJsonLd, type OrganizationInput } from "@/lib/seo/home-jsonld";
import type { JsonLdObject } from "@/lib/seo/json-ld";

const SCHEMA_CONTEXT = "https://schema.org";

export type AboutJsonLdInput = OrganizationInput & {
  /** Judul halaman (H1) dan ringkasan singkat dari setting about_*. */
  title: string;
  description?: string | null;
};

/** Urut: Organization, AboutPage, BreadcrumbList. */
export function buildAboutJsonLd(input: AboutJsonLdInput): JsonLdObject[] {
  const siteUrl = input.siteUrl.replace(/\/+$/, "");
  const url = `${siteUrl}/about`;
  const description = input.description?.replace(/\s+/g, " ").trim();
  return [
    buildOrganizationJsonLd(input),
    {
      "@context": SCHEMA_CONTEXT,
      "@type": "AboutPage",
      "@id": `${url}#webpage`,
      url,
      name: input.title.trim() || "Tentang VIDALIDAY",
      ...(description ? { description } : {}),
      inLanguage: "id",
      isPartOf: { "@id": `${siteUrl}/#website` },
      about: { "@id": `${siteUrl}/#organization` },
      mainEntity: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@context": SCHEMA_CONTEXT,
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Beranda", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "Tentang kami", item: url },
      ],
    },
  ];
}
