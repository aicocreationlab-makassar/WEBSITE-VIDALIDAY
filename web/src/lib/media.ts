// URL gambar dari bucket Storage `media`. DB menyimpan path relatif ("units/abc.webp");
// nilai yang sudah berupa URL penuh dipakai apa adanya.

export const MEDIA_BUCKET = "media";

const EXTERNAL = /^https?:\/\//i;

export function isExternalUrl(value: string): boolean {
  return EXTERNAL.test(value.trim());
}

/** Foto stok Unsplash dari data lama dianggap "tanpa foto" (DESIGN 7). */
export function isStockPhoto(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value.trim()).hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

/** "/storage/units/a.jpg" atau "public/units/a.jpg" → "units/a.jpg" (sama dengan StorageHelper lama). */
export function normalizeStoragePath(value: string): string {
  return value
    .trim()
    .replace(/^\/+/, "")
    .replace(/^(storage|public)\/+/, "")
    .replace(/^\/+/, "");
}

/** Path yang boleh dihapus dari bucket (bukan URL eksternal). */
export function isBucketPath(value: string | null | undefined): value is string {
  return Boolean(value && value.trim() && !isExternalUrl(value));
}

function storageBase(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return `${url.replace(/\/+$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}`;
}

/** Path bucket atau URL → URL publik. Kosong/tidak bisa dibentuk → null. */
export function mediaUrl(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  if (isExternalUrl(value)) return value.trim();
  const base = storageBase();
  if (!base) return null;
  const path = normalizeStoragePath(value)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/${path}`;
}

/** Ambil array path dari kolom jsonb `gallery_images` (bisa array atau string JSON). */
export function parseGallery(value: unknown): string[] {
  let list: unknown = value;
  if (typeof value === "string") {
    try {
      list = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

/** Foto unit siap tampil: sampul dulu, lalu galeri; tanpa duplikat dan tanpa foto stok. */
export function unitPhotoUrls(unit: { main_image: string | null; gallery_images: unknown }): string[] {
  const raw = [unit.main_image, ...parseGallery(unit.gallery_images)];
  const urls: string[] = [];
  for (const value of raw) {
    if (!value || isStockPhoto(value)) continue;
    const url = mediaUrl(value);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

/** Foto gedung bawaan (dari situs lama) per slug apartemen. */
const LOCATION_FALLBACK: Record<string, string> = {
  "vida-view": "/images/locations/vida-view.jpg",
  "delft-cpi": "/images/locations/delft-cpi.jpg",
};

export const DEFAULT_HERO_IMAGE = "/images/locations/vida-view.jpg";

export function locationImageUrl(location: { slug: string; hero_image: string | null }): string | null {
  if (location.hero_image && !isStockPhoto(location.hero_image)) {
    const url = mediaUrl(location.hero_image);
    if (url) return url;
  }
  return LOCATION_FALLBACK[location.slug] ?? null;
}
