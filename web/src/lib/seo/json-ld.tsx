// Data terstruktur JSON-LD (PRD 6.9). Dirender sebagai <script> biasa di Server Component.

/** Satu objek schema.org. Nilai harus bisa diserialisasi JSON. */
export type JsonLdObject = {
  "@context"?: string;
  "@type": string;
  [key: string]: unknown;
};

/**
 * JSON.stringify + ganti "<" dengan <, supaya teks dari DB (mis. "</script>")
 * tidak bisa menutup tag script lebih awal (saran dokumentasi Next.js).
 */
export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
