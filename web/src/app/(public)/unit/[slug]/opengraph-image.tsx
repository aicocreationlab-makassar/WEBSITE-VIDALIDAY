import { cacheLife } from "next/cache";
import { getCatalog, getUnitBySlug } from "@/lib/data/catalog";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  UNIT_OG_ALT,
  defaultOgImage,
  fetchOgPhoto,
  loadOgFonts,
  pickOgPhotoUrl,
  pngResponse,
  renderUnitOg,
} from "@/lib/seo/og";

// Gambar OG per unit (PRD 6.4, 6.9): nama unit, apartemen, harga per malam, logo, dan foto utama
// kalau JPEG/PNG. Slug tidak dikenal → kartu bawaan.
export const alt = UNIT_OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Sama dengan halaman unit: semua unit published diprerender; minimal satu entri. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const catalog = await getCatalog();
  return catalog.length ? catalog.map((unit) => ({ slug: unit.slug })) : [{ slug: "__none__" }];
}

/**
 * PNG unit (base64) di-cache utuh. Tag unit/units/locations dari getUnitBySlug ikut menempel,
 * jadi gambar diperbarui saat admin mengubah unit. null = unit tidak ada atau draft.
 * Satu panggilan cacheLife per jalur (docs cacheLife: "conditional cache lifetimes").
 */
async function unitOgPng(slug: string): Promise<string | null> {
  "use cache";

  const unit = await getUnitBySlug(slug);
  if (!unit) {
    cacheLife("max");
    return null;
  }
  const photoUrl = pickOgPhotoUrl(unit.photos);
  const [fonts, fetched] = await Promise.all([loadOgFonts(), photoUrl ? fetchOgPhoto(photoUrl) : null]);
  // Gagal sementara (font/foto timeout) jangan dibekukan 30 hari: cache pendek supaya segera dicoba lagi.
  if (fonts && !fetched?.transient) cacheLife("max");
  else cacheLife("minutes");
  const bytes = await renderUnitOg(unit, fetched?.photo ?? null, fonts);
  return Buffer.from(bytes).toString("base64");
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const png = await unitOgPng(slug);
  if (!png) return defaultOgImage(await loadOgFonts());
  return pngResponse(new Uint8Array(Buffer.from(png, "base64")));
}
