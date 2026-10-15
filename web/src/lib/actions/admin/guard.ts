import "server-only";
import { refresh, updateTag } from "next/cache";
import { getAdminStatus, type AdminSession } from "@/lib/auth/require-admin";
import { tagsFor, type InvalidateTarget } from "@/lib/cache-tags";

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
