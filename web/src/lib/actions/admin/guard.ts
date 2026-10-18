import "server-only";
import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { getAdminStatus, type AdminSession } from "@/lib/auth/require-admin";
import { tagsFor, type InvalidateTarget } from "@/lib/cache-tags";
import { getListedLocations } from "@/lib/data/locations";
import { getSiteUrl } from "@/lib/env";
import {
  apartmentPaths,
  indexNowKey,
  indexNowUrls,
  publicUnitSlugs,
  shouldNotifyIndexNow,
  submitIndexNow,
} from "@/lib/seo/indexnow";
import { createPublicClient } from "@/lib/supabase/public";

/** Hasil standar Server Action admin (tidak melempar error ke UI). */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const NOT_ADMIN_ERROR = "Sesi admin berakhir atau akun tidak punya akses. Masuk lagi.";

/**
 * WAJIB dipanggil di awal SETIAP Server Action admin (proxy.ts tidak melindungi Server Action).
 * Memverifikasi klaim JWT di server (getClaims) + baris di tabel `admins`.
 */
export async function guardAdmin(): Promise<{ ok: true; session: AdminSession } | { ok: false; result: { ok: false; error: string } }> {
  const status = await getAdminStatus();
  if (status.status !== "ok") return { ok: false, result: { ok: false, error: NOT_ADMIN_ERROR } };
  return { ok: true, session: status.session };
}

/**
 * Kedaluwarsakan cache halaman publik terkait secara langsung (updateTag = read-your-writes),
 * lalu segarkan tampilan admin. Hanya bisa dipanggil dari Server Action.
 */
export function invalidate(...targets: InvalidateTarget[]): void {
  const tags = new Set(targets.flatMap(tagsFor));
  for (const tag of tags) updateTag(tag);
  refresh();
  // IndexNow (opsional, hanya bila INDEXNOW_KEY diisi): dikirim setelah respons, tidak memperlambat admin.
  // Hapus permintaan sewa tidak mengubah isi halaman publik → tidak dilaporkan.
  if (indexNowKey() && shouldNotifyIndexNow(targets)) {
    const base = getSiteUrl();
    after(async () => {
      // Hanya unit yang terbaca publik (klien anon, RLS) yang dilaporkan; draf tidak.
      const publicSlugs = await publicUnitSlugs(targets, async (slugs) => {
        const { data, error } = await createPublicClient().from("units").select("slug").in("slug", slugs);
        if (error) throw error;
        return (data ?? []).map((row) => row.slug);
      });
      // Profil apartemen dan landing tipe ikut berubah (harga, unit, fasilitas, FAQ); gagal baca → dilewati.
      const sitePaths = await getListedLocations().then(apartmentPaths, () => []);
      await submitIndexNow(indexNowUrls(targets, base, { publicSlugs, sitePaths }), base);
    });
  }
}

/** Ubah ZodError issues → { field: pesan pertama }. */
export function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/** Waktu sekarang untuk kolom updated_at (tabel tidak punya trigger sebelum migrasi 0003). */
export function nowIso(): string {
  return new Date().toISOString();
}
