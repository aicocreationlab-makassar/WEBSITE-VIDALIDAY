"use server";

// Server Action Pengaturan & halaman About (PRD 7.9). Setiap aksi: guardAdmin() → validasi zod (skema
// yang sama dengan form) → upsert per kunci lewat sesi admin (RLS is_admin, tanpa secret key)
// → invalidate({ kind: "settings" }). Hanya kunci yang dikirim yang ditulis; kunci lain tidak pernah
// dihapus atau dikosongkan (bug lama: simpan pengaturan menghapus contact_email, simpan About
// mereset ikon alasan). Seluruh layout publik (header, footer, banner) membaca tag "settings".

import { z } from "zod";
import { aboutIssueMessage, isAboutFieldPath } from "@/components/admin/about/about-model";
import {
  adminIssueMessage,
  isAcceptableSettingsImage,
  isSettingsUploadPath,
  ownedSettingsImage,
  parseChangedFields,
  pickFields,
  sameImage,
} from "@/components/admin/settings/settings-model";
import { guardAdmin, invalidate, nowIso, toFieldErrors, type ActionResult } from "@/lib/actions/admin/guard";
import { aboutToRows, replacedImages, settingsToRows, type SettingRow } from "@/lib/admin/settings-rows";
import { isKnownIconName, resolveIconName } from "@/lib/icons";
import { isBucketPath, normalizeStoragePath } from "@/lib/media";
import { deleteStorageFiles } from "@/lib/storage-cleanup";
import { aboutSchema, settingsSchema } from "@/lib/validation/admin";
import type { SiteSettings } from "@/types/settings";

type PostgrestLikeError = { code?: string; message?: string } | null | undefined;
type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };
type Supabase = Parameters<typeof deleteStorageFiles>[0];
type SettingsFields = Omit<SiteSettings, "about">;
type ImageFields = Pick<SettingsFields, "heroImage" | "siteLogo">;

const MSG_INVALID = "Periksa lagi isian yang ditandai.";
const MSG_IMAGE = "Foto tidak bisa dipakai. Unggah ulang lewat tombol Pilih foto.";
const MSG_ICON = "Pilih ikon dari daftar.";
const MSG_FORBIDDEN = "Akun ini tidak punya izin mengubah data. Masuk lagi sebagai admin.";
const MSG_FAILED = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";
const MSG_SAVED = "Perubahan disimpan";

const IMAGE_KEYS = { heroImage: "hero_image", siteLogo: "site_logo" } as const;
const discardSchema = z.array(z.string().max(200)).max(20);

function failure(error: PostgrestLikeError, context: string): Failure {
  if (error?.code === "42501") return { ok: false, error: MSG_FORBIDDEN };
  // Hanya kode galat yang dicatat (tanpa isi setting).
  console.error(`[admin/settings] ${context} gagal`, { code: error?.code });
  return { ok: false, error: MSG_FAILED };
}

function crashed(error: unknown, context: string): Failure {
  console.error(`[admin/settings] ${context} gagal`, { name: (error as Error)?.name });
  return { ok: false, error: MSG_FAILED };
}

/** Upsert per kunci (unik). Kunci yang tidak ada di `rows` tidak disentuh. */
async function upsertRows(supabase: Supabase, rows: SettingRow[]) {
  const now = nowIso();
  return supabase
    .from("settings")
    .upsert(
      rows.map((row) => ({ key: row.key, value: row.value, updated_at: now })),
      { onConflict: "key" },
    );
}

/** Nilai foto hero & logo yang tersimpan sekarang. */
async function readImages(supabase: Supabase): Promise<{ ok: true; images: ImageFields } | { ok: false; result: Failure }> {
  const { data, error } = await supabase.from("settings").select("key, value").in("key", Object.values(IMAGE_KEYS));
  if (error) return { ok: false, result: failure(error, "baca foto") };
  const byKey = new Map((data ?? []).map((row) => [row.key, row.value?.trim() || null]));
  return {
    ok: true,
    images: { heroImage: byKey.get(IMAGE_KEYS.heroImage) ?? null, siteLogo: byKey.get(IMAGE_KEYS.siteLogo) ?? null },
  };
}

/** Hapus file Storage tanpa menggagalkan aksi (sisa file tidak merusak situs). */
async function cleanupFiles(supabase: Supabase, paths: (string | null)[], context: string): Promise<void> {
  const list = paths.filter((path): path is string => Boolean(path));
  if (!list.length) return;
  try {
    await deleteStorageFiles(supabase, list);
  } catch (error) {
    console.error(`[admin/settings] hapus file ${context} gagal`, { name: (error as Error)?.name });
  }
}

/**
 * Simpan pengaturan situs. `changed` = daftar field yang berubah di form (hanya itu yang ditulis,
 * supaya dua admin yang mengubah bagian berbeda tidak saling menimpa); tanpa daftar → semua field.
 * Seluruh form tetap divalidasi. Foto lama di folder settings/ dihapus setelah diganti/dihapus.
 */
export async function saveSettings(input: unknown, changed?: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = settingsSchema.safeParse(input, { error: adminIssueMessage });
  if (!parsed.success) return { ok: false, error: MSG_INVALID, fieldErrors: toFieldErrors(parsed.error.issues) };
  const values: SettingsFields = parsed.data;
  const fields = parseChangedFields(changed);
  if (!fields.length) return { ok: true, message: "Belum ada perubahan untuk disimpan" };
  const supabase = auth.session.supabase;

  try {
    const imageFields = fields.filter((field): field is keyof ImageFields => field in IMAGE_KEYS);
    let before: ImageFields = { heroImage: null, siteLogo: null };
    if (imageFields.length) {
      const current = await readImages(supabase);
      if (!current.ok) return current.result;
      before = current.images;
    }

    // Foto: nilai lama boleh tetap apa adanya; foto baru hanya hasil unggah ke folder settings/.
    const after: ImageFields = { ...before };
    const fieldErrors: Record<string, string> = {};
    for (const field of imageFields) {
      const next = values[field];
      if (!isAcceptableSettingsImage(next, before[field])) fieldErrors[field] = MSG_IMAGE;
      else if (!next) after[field] = null;
      else if (sameImage(next, before[field])) after[field] = before[field];
      else after[field] = normalizeStoragePath(next);
    }
    if (Object.keys(fieldErrors).length) return { ok: false, error: MSG_INVALID, fieldErrors };

    const rows = settingsToRows({ ...pickFields(values, fields), ...pickFields(after, imageFields) });
    const { error } = await upsertRows(supabase, rows);
    if (error) return failure(error, "simpan");

    // Hanya file di folder settings/ yang tidak dipakai lagi oleh foto hero maupun logo.
    const replaced = replacedImages(before, after)
      .map(ownedSettingsImage)
      .filter((path) => path && !sameImage(path, after.heroImage) && !sameImage(path, after.siteLogo));
    await cleanupFiles(supabase, replaced, "foto lama");

    invalidate({ kind: "settings" });
    return { ok: true, message: MSG_SAVED };
  } catch (error) {
    return crashed(error, "simpan");
  }
}

/** Simpan halaman About (semua kunci about_* + about_reasons). Ikon alasan lama disimpan dengan nama baku. */
export async function saveAbout(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = aboutSchema.safeParse(input, { error: aboutIssueMessage });
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      Object.entries(toFieldErrors(parsed.error.issues)).filter(([path]) => isAboutFieldPath(path)),
    );
    return { ok: false, error: MSG_INVALID, fieldErrors };
  }

  const iconErrors: Record<string, string> = {};
  parsed.data.reasons.forEach((reason, index) => {
    if (!isKnownIconName(reason.icon)) iconErrors[`reasons.${index}.icon`] = MSG_ICON;
  });
  if (Object.keys(iconErrors).length) return { ok: false, error: MSG_INVALID, fieldErrors: iconErrors };

  const about = {
    ...parsed.data,
    reasons: parsed.data.reasons.map((reason) => ({ ...reason, icon: resolveIconName(reason.icon) })),
  };

  try {
    const { error } = await upsertRows(auth.session.supabase, aboutToRows(about));
    if (error) return failure(error, "simpan about");

    invalidate({ kind: "settings" });
    return { ok: true, message: MSG_SAVED };
  } catch (error) {
    return crashed(error, "simpan about");
  }
}

/**
 * Buang foto yang sudah diunggah dari form tapi tidak jadi disimpan (diganti lagi sebelum simpan,
 * dibatalkan, atau halaman ditinggalkan). Hanya unggahan baru `settings/<uuid>.webp` yang tidak
 * sedang dipakai sebagai foto hero atau logo.
 */
export async function discardSettingsUploads(paths: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = discardSchema.safeParse(paths);
  if (!parsed.success) return { ok: false, error: MSG_INVALID };
  const uploads = [...new Set(parsed.data.filter(isSettingsUploadPath).map((path) => path.trim()))];
  if (!uploads.length) return { ok: true };
  const supabase = auth.session.supabase;

  try {
    const current = await readImages(supabase);
    if (!current.ok) return current.result;
    const inUse = [current.images.heroImage, current.images.siteLogo]
      .filter(isBucketPath)
      .map((value) => normalizeStoragePath(value));
    await cleanupFiles(
      supabase,
      uploads.filter((path) => !inUse.includes(path)),
      "buang unggahan",
    );
    return { ok: true };
  } catch (error) {
    return crashed(error, "buang unggahan");
  }
}
