"use server";

import { z } from "zod";
import {
  isAcceptableFacilityImage,
  isFacilityUploadPath,
  isMissingColumnError,
  MIGRATION_0003_MESSAGE,
  planFacilityReorder,
  replacedImagePath,
  toggleFacilityMessage,
} from "@/components/admin/facilities/facility-model";
import { guardAdmin, invalidate, nowIso, toFieldErrors, type ActionResult } from "@/lib/actions/admin/guard";
import { isKnownIconName } from "@/lib/icons";
import { isBucketPath, normalizeStoragePath } from "@/lib/media";
import { collectReferencedPaths, deleteStorageFiles, findUnreferenced } from "@/lib/storage-cleanup";
import { facilitySchema, reorderSchema } from "@/lib/validation/admin";

// Fasilitas gedung (PRD 7.7). Setiap aksi: guardAdmin() → validasi zod (skema yang sama dengan form)
// → tulis lewat sesi admin (RLS is_admin) → invalidate({ kind: "facility" }). Foto lama di bucket
// dihapus setelah baris diganti/dihapus, hanya kalau tidak dipakai fasilitas lain.

// Alias tipe (bukan objek inline di signature) supaya pengaman guard-coverage membaca badan fungsi.
type Created = { id: number };
type PostgrestLikeError = { code?: string; message?: string } | null | undefined;
type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };
type Supabase = Parameters<typeof deleteStorageFiles>[0];
type FacilityData = z.output<typeof facilitySchema>;

const MSG_INVALID = "Periksa lagi isian di form.";
const MSG_ICON = "Pilih ikon dari daftar.";
const MSG_IMAGE = "Foto tidak bisa dipakai. Unggah ulang lewat tombol Pilih foto.";
const MSG_NOT_FOUND = "Fasilitas tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman.";
const MSG_LOCATION = "Apartemen tidak ditemukan. Muat ulang halaman lalu pilih lagi.";
const MSG_FORBIDDEN = "Akun ini tidak punya izin mengubah data. Masuk lagi sebagai admin.";
const MSG_FAILED = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";

const idSchema = z.number().int().positive();
const toggleSchema = z.object({ id: idSchema, isActive: z.boolean() });
const discardSchema = z.array(z.string().max(200)).max(20);

function failure(error: PostgrestLikeError, context: string): Failure {
  if (isMissingColumnError(error)) return { ok: false, error: MIGRATION_0003_MESSAGE };
  if (error?.code === "42501") return { ok: false, error: MSG_FORBIDDEN };
  if (error?.code === "23503") return { ok: false, error: MSG_LOCATION, fieldErrors: { locationId: MSG_LOCATION } };
  // Hanya kode galat yang dicatat (tanpa data isian).
  console.error(`[admin/facilities] ${context} gagal`, { code: error?.code });
  return { ok: false, error: MSG_FAILED };
}

function crashed(error: unknown, context: string): Failure {
  console.error(`[admin/facilities] ${context} gagal`, { name: (error as Error)?.name });
  return { ok: false, error: MSG_FAILED };
}

type Parsed = { ok: true; data: FacilityData } | { ok: false; result: Failure };

/** Validasi isian form (skema bersama + ikon dari daftar kurasi). */
function parseFacility(input: unknown): Parsed {
  const parsed = facilitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, result: { ok: false, error: MSG_INVALID, fieldErrors: toFieldErrors(parsed.error.issues) } };
  }
  if (!isKnownIconName(parsed.data.icon)) {
    return { ok: false, result: { ok: false, error: MSG_INVALID, fieldErrors: { icon: MSG_ICON } } };
  }
  return { ok: true, data: parsed.data };
}

function invalidImage(): Failure {
  return { ok: false, error: MSG_IMAGE, fieldErrors: { image: MSG_IMAGE } };
}

/**
 * Hapus file foto fasilitas dari bucket kalau tidak dipakai baris lain (fasilitas lain, apartemen, unit,
 * pengaturan; data lama bisa berbagi foto). Dipanggil SETELAH baris diubah/dihapus. Kegagalan tidak
 * membatalkan aksi (sisa file tidak merusak situs).
 */
async function removeUnusedImages(supabase: Supabase, paths: (string | null | undefined)[], context: string): Promise<void> {
  const candidates = [...new Set(paths.filter(isBucketPath).map(normalizeStoragePath))];
  if (!candidates.length) return;
  try {
    const referenced = await collectReferencedPaths(supabase);
    if (!referenced) return;
    const unused = findUnreferenced(candidates, referenced);
    if (unused.length) await deleteStorageFiles(supabase, unused, `fasilitas ${context}`);
  } catch (error) {
    console.error(`[admin/facilities] hapus file ${context} gagal`, { name: (error as Error)?.name });
  }
}

/** Tambah fasilitas gedung di satu apartemen. */
export async function createFacility(input: unknown): Promise<ActionResult<Created>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = parseFacility(input);
  if (!parsed.ok) return parsed.result;
  const { locationId, name, description, icon, image, sortOrder, isActive } = parsed.data;
  if (!isAcceptableFacilityImage(image, null)) return invalidImage();

  try {
    const now = nowIso();
    const { data, error } = await auth.session.supabase
      .from("facilities")
      .insert({
        location_id: locationId,
        name,
        description,
        icon,
        image,
        sort_order: sortOrder,
        is_active: isActive,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (error || !data) return failure(error, "tambah");

    invalidate({ kind: "facility" });
    return { ok: true, message: `Fasilitas ${name} ditambahkan`, data: { id: data.id } };
  } catch (error) {
    return crashed(error, "tambah");
  }
}

/** Ubah fasilitas. Foto lama di bucket dihapus kalau diganti atau dihapus. */
export async function updateFacility(id: unknown, input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };
  const parsed = parseFacility(input);
  if (!parsed.ok) return parsed.result;
  const { locationId, name, description, icon, image, sortOrder, isActive } = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const current = await supabase.from("facilities").select("id, image").eq("id", parsedId.data).maybeSingle();
    if (current.error) return failure(current.error, "baca");
    if (!current.data) return { ok: false, error: MSG_NOT_FOUND };
    if (!isAcceptableFacilityImage(image, current.data.image)) return invalidImage();

    const { data, error } = await supabase
      .from("facilities")
      .update({
        location_id: locationId,
        name,
        description,
        icon,
        image,
        sort_order: sortOrder,
        is_active: isActive,
        updated_at: nowIso(),
      })
      .eq("id", parsedId.data)
      .select("id");
    if (error) return failure(error, "ubah");
    if (!data?.length) return { ok: false, error: MSG_NOT_FOUND };

    await removeUnusedImages(supabase, [replacedImagePath(current.data.image, image)], "ganti foto");
    invalidate({ kind: "facility" });
    return { ok: true, message: "Perubahan disimpan" };
  } catch (error) {
    return crashed(error, "ubah");
  }
}

/** Aktif/nonaktif langsung dari daftar. Nonaktif = tidak tampil di halaman apartemen. */
export async function toggleFacilityActive(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_NOT_FOUND };
  const { id, isActive } = parsed.data;

  try {
    const { data, error } = await auth.session.supabase
      .from("facilities")
      .update({ is_active: isActive, updated_at: nowIso() })
      .eq("id", id)
      .select("name");
    if (error) return failure(error, "ubah status");
    const name = data?.[0]?.name;
    if (!name) return { ok: false, error: MSG_NOT_FOUND };

    invalidate({ kind: "facility" });
    return { ok: true, message: toggleFacilityMessage(name, isActive) };
  } catch (error) {
    return crashed(error, "ubah status");
  }
}

/** Naik/turun satu posisi: tukar urutan dengan tetangga di apartemen yang sama. */
export async function reorderFacility(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_NOT_FOUND };
  const { id, direction } = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const current = await supabase.from("facilities").select("location_id").eq("id", id).maybeSingle();
    if (current.error) return failure(current.error, "baca");
    if (!current.data) return { ok: false, error: MSG_NOT_FOUND };

    const { data: rows, error: readError } = await supabase
      .from("facilities")
      .select("id, location_id, sort_order")
      .eq("location_id", current.data.location_id);
    if (readError) return failure(readError, "baca urutan");

    const items = (rows ?? []).map((row) => ({
      id: row.id,
      locationId: row.location_id,
      sortOrder: Number(row.sort_order ?? 0),
    }));
    const plan = planFacilityReorder(items, id, direction);
    if (!plan?.length) return { ok: true, message: "Urutan tidak berubah" };

    const now = nowIso();
    const results = await Promise.all(
      plan.map((item) =>
        supabase.from("facilities").update({ sort_order: item.sortOrder, updated_at: now }).eq("id", item.id),
      ),
    );
    const failed = results.find((result) => result.error);

    // Tetap kedaluwarsakan cache walau sebagian gagal, supaya tampilan sesuai isi DB.
    invalidate({ kind: "facility" });
    if (failed) return failure(failed.error, "ubah urutan");
    return { ok: true, message: "Urutan disimpan" };
  } catch (error) {
    return crashed(error, "ubah urutan");
  }
}

/** Hapus fasilitas, lalu fotonya di bucket (kalau tidak dipakai fasilitas lain). */
export async function deleteFacility(id: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };
  const supabase = auth.session.supabase;

  try {
    const { data, error } = await supabase.from("facilities").delete().eq("id", parsedId.data).select("name, image");
    if (error) return failure(error, "hapus");
    const row = data?.[0];
    if (!row) return { ok: false, error: MSG_NOT_FOUND };

    await removeUnusedImages(supabase, [row.image], "hapus foto");
    invalidate({ kind: "facility" });
    return { ok: true, message: `Fasilitas ${row.name} dihapus` };
  } catch (error) {
    return crashed(error, "hapus");
  }
}

/**
 * Buang foto yang sudah diunggah dari form tapi tidak jadi disimpan (dialog ditutup, atau foto diganti
 * lagi sebelum simpan). Hanya unggahan baru `facilities/<uuid>.webp` yang tidak dipakai fasilitas mana pun.
 */
export async function discardFacilityUploads(paths: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = discardSchema.safeParse(paths);
  if (!parsed.success) return { ok: false, error: MSG_INVALID };
  const uploads = parsed.data.filter(isFacilityUploadPath).map((path) => path.trim());
  if (!uploads.length) return { ok: true };

  await removeUnusedImages(auth.session.supabase, uploads, "buang unggahan");
  return { ok: true };
}
