// IndexNow (Bing, Yandex, dkk.): beri tahu mesin pencari URL yang berubah setelah admin menyimpan.
// Aktif hanya kalau env INDEXNOW_KEY diisi (kunci dilayani di /indexnow.txt). Gagal → hanya peringatan.

import type { InvalidateTarget } from "@/lib/cache-tags";
import { unitHref } from "@/lib/unit-display";

const ENDPOINT = "https://api.indexnow.org/IndexNow";
const MAX_URLS = 50;

/** URL yang perlu diberitahukan untuk sebuah perubahan (beranda dan /sewa selalu ikut). */
export function indexNowUrls(targets: InvalidateTarget[], base: string): string[] {
  const host = base.replace(/\/+$/, "");
  const urls = new Set<string>([`${host}/`, `${host}/sewa`]);
  for (const target of targets) {
    if (target.kind === "unit") {
      for (const slug of target.slugs) if (slug) urls.add(`${host}${unitHref(slug)}`);
    }
    if (target.kind === "settings" || target.kind === "all") urls.add(`${host}/about`);
  }
  return [...urls].slice(0, MAX_URLS);
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
