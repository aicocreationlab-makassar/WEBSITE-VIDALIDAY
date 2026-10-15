import { DEFAULT_OG_ALT, OG_CONTENT_TYPE, OG_SIZE, defaultOgImage, loadOgFonts } from "@/lib/seo/og";

// Gambar OG bawaan semua halaman (PRD 6.9): kartu putih/abu dengan logo, wordmark, tagline, dan foto gedung.
// Statis: aset lokal dibaca saat modul dimuat dan font di-cache, jadi diprerender saat build.
export const alt = DEFAULT_OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return defaultOgImage(await loadOgFonts());
}
