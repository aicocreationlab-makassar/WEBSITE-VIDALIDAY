// IndexNow (Bing, Yandex, dkk.): beri tahu mesin pencari URL yang berubah setelah admin menyimpan.
// Aktif hanya kalau env INDEXNOW_KEY diisi (kunci dilayani di /indexnow.txt). Gagal → hanya peringatan.

import type { InvalidateTarget } from "@/lib/cache-tags";
import { apartmentPath } from "@/lib/seo/apartment-jsonld";
import { roomTypeHref, unitHref } from "@/lib/unit-display";

const ENDPOINT = "https://api.indexnow.org/IndexNow";
const MAX_URLS = 50;

/** Halaman publik yang tidak berubah isinya untuk perubahan ini (hapus permintaan sewa hanya menggeser urutan). */
export function shouldNotifyIndexNow(targets: InvalidateTarget[]): boolean {
  return targets.some((target) => target.kind !== "lead");
}

/**
 * Path profil apartemen dan landing tipe (`/apartemen/{slug}`, `/apartemen/{slug}/{tipe}`) yang tampil di situs.
 * Isinya dibentuk dari unit, apartemen, tipe, fasilitas, landmark, FAQ, dan pengaturan, jadi ikut dilaporkan
 * untuk setiap perubahan konten.
 */
export function apartmentPaths(locations: { slug: string; roomTypes: { slug: string; unitCount: number }[] }[]): string[] {
  return locations.flatMap((location) => [
    apartmentPath(location.slug),
    ...location.roomTypes.filter((type) => type.unitCount > 0).map((type) => roomTypeHref(location.slug, type.slug)),
  ]);
}

/**
 * URL yang perlu diberitahukan untuk sebuah perubahan (beranda dan /sewa selalu ikut). `publicSlugs` =
 * slug unit yang saat ini tampil di situs; unit draf/tersembunyi tidak dilaporkan (hanya akan 404).
 * `sitePaths` = path apartemen dan landing dari `apartmentPaths`. Hapus permintaan sewa saja → kosong.
 */
export function indexNowUrls(
  targets: InvalidateTarget[],
  base: string,
  options: { publicSlugs?: ReadonlySet<string>; sitePaths?: string[] } = {},
): string[] {
  if (!shouldNotifyIndexNow(targets)) return [];
  const { publicSlugs, sitePaths = [] } = options;
  const host = base.replace(/\/+$/, "");
  const urls = new Set<string>([`${host}/`, `${host}/sewa`]);
  for (const target of targets) {
    if (target.kind === "unit") {
      for (const slug of target.slugs) {
        if (slug && (!publicSlugs || publicSlugs.has(slug))) urls.add(`${host}${unitHref(slug)}`);
      }
    }
  }
  for (const path of sitePaths) urls.add(`${host}${path}`);
  if (targets.some((target) => target.kind === "settings" || target.kind === "all")) urls.add(`${host}/about`);
  return [...urls].slice(0, MAX_URLS);
}

/** Slug unit dari perubahan ini yang terbaca publik (RLS anon: published di apartemen aktif). */
export async function publicUnitSlugs(
  targets: InvalidateTarget[],
  lookup: (slugs: string[]) => Promise<string[]>,
): Promise<Set<string>> {
  const slugs = [...new Set(targets.flatMap((target) => (target.kind === "unit" ? target.slugs : [])).filter((slug): slug is string => Boolean(slug)))];
  if (!slugs.length) return new Set();
  try {
    return new Set(await lookup(slugs));
  } catch {
    return new Set();
  }
}

export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && /^[a-zA-Z0-9-]{8,128}$/.test(key) ? key : null;
}

/** Kirim daftar URL; tanpa kunci → tidak melakukan apa pun. Tidak pernah melempar. */
export async function submitIndexNow(urls: string[], base: string): Promise<boolean> {
  const key = indexNowKey();
  if (!key || !urls.length) return false;
  const host = base.replace(/\/+$/, "");
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(host).host, key, keyLocation: `${host}/indexnow.txt`, urlList: urls }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok && response.status !== 202) {
      console.warn("[indexnow] ditolak", { status: response.status });
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[indexnow] gagal", { name: (error as Error)?.name });
    return false;
  }
}
