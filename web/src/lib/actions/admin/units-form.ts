"use server";

// Server Action form tambah/ubah unit (PRD 7.4). Setiap aksi: guardAdmin() → validasi zod (skema yang
// sama dengan form) → cek tipe kamar milik apartemen + slug unik → tulis lewat sesi admin (RLS is_admin)
// → sinkronkan fasilitas kamar → hapus foto yang dibuang dari Storage → invalidate() halaman publik.
// Tidak memakai secret key dan tidak melempar error ke UI.

import { z } from "zod";
import {
  amenityNamesFor,
  buildUnitRow,
  isAllowedPhotoValue,
  uniquePhotos,
} from "@/components/admin/units/form/unit-form-model";
import { guardAdmin, invalidate, nowIso, toFieldErrors, type ActionResult } from "@/lib/actions/admin/guard";
import type { AdminSession } from "@/lib/auth/require-admin";
import { getTakenUnitSlugs } from "@/lib/data/admin/units";
import { parseGallery } from "@/lib/media";
import { deleteUnusedUnitPhotos, removedPaths } from "@/lib/storage-cleanup";
import { unitSchema, type UnitData } from "@/lib/validation/admin";

type Supabase = AdminSession["supabase"];
type UnitSaved = { id: number; slug: string };
type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };
type Prepared =
  | { ok: true; roomTypeName: string; amenityIds: number[]; amenityNames: string[]; photos: string[] }
  | { ok: false; result: Failure };

const MSG_INVALID = "Periksa lagi isian yang ditandai.";
const MSG_FAILED = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";
const MSG_NOT_FOUND = "Unit tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman.";
const MSG_ROOM_TYPE = "Tipe kamar tidak cocok dengan apartemen.";
const MSG_SLUG = "Slug sudah dipakai unit lain.";
const MSG_PHOTOS = "Ada foto yang tidak valid. Hapus foto itu lalu unggah lagi.";
const MSG_AMENITIES = "Ada fasilitas yang sudah dihapus. Muat ulang halaman lalu pilih lagi.";
const MSG_AMENITY_SYNC = "Data unit tersimpan, tapi fasilitas kamar gagal disimpan. Coba simpan lagi.";

const idSchema = z.number().int().positive();

function fail(context: string, error: unknown, message = MSG_FAILED): Failure {
  const code = typeof error === "object" && error && "code" in error ? (error as { code?: unknown }).code : undefined;
  console.error(`[admin/units-form] ${context} gagal`, code ?? error);
  return { ok: false, error: message };
}

function invalid(fieldErrors: Record<string, string>): Failure {
  return { ok: false, error: MSG_INVALID, fieldErrors };
}

/** Nama fasilitas terpilih (urutan tabel amenities); tanpa query kalau tidak ada yang dipilih. */
async function loadAmenities(
  supabase: Supabase,
  ids: number[],
): Promise<{ data: { id: number; name: string }[]; error: unknown }> {
  if (!ids.length) return { data: [], error: null };
  const { data, error } = await supabase.from("amenities").select("id, name").in("id", ids).order("sort_order").order("name");
  return { data: data ?? [], error };
}

/** Validasi yang butuh DB: tipe kamar milik apartemen, slug unik, fasilitas masih ada. */
async function prepareUnit(supabase: Supabase, data: UnitData, exceptId?: number): Promise<Prepared> {
  const photos = uniquePhotos(data.photos);
  if (photos.some((photo) => !isAllowedPhotoValue(photo))) return { ok: false, result: invalid({ photos: MSG_PHOTOS }) };
  const amenityIds = [...new Set(data.amenityIds)];

  const [typeResult, taken, amenityResult] = await Promise.all([
    supabase.from("room_types").select("id, name, location_id").eq("id", data.roomTypeId).maybeSingle(),
    getTakenUnitSlugs(supabase, exceptId),
    loadAmenities(supabase, amenityIds),
  ]);
  if (typeResult.error) return { ok: false, result: fail("cek tipe kamar", typeResult.error) };
  if (amenityResult.error) return { ok: false, result: fail("cek fasilitas", amenityResult.error) };

  const fieldErrors: Record<string, string> = {};
  const type = typeResult.data;
  if (!type || type.location_id !== data.locationId) fieldErrors.roomTypeId = MSG_ROOM_TYPE;
  if (taken.includes(data.slug)) fieldErrors.slug = MSG_SLUG;
  const amenities = amenityResult.data;
  if (amenities.length !== amenityIds.length) fieldErrors.amenityIds = MSG_AMENITIES;
  if (Object.keys(fieldErrors).length || !type) return { ok: false, result: invalid(fieldErrors) };

  return { ok: true, roomTypeName: type.name, amenityIds, amenityNames: amenityNamesFor(amenityIds, amenities), photos };
}

/**
 * Samakan unit_amenities dengan pilihan: tambah yang baru dulu, lalu hapus yang tidak dipilih.
 * Hasil akhirnya sama dengan "hapus semua lalu isi ulang", tapi kalau langkah kedua gagal
 * fasilitas lama tidak hilang.
 */
async function syncUnitAmenities(supabase: Supabase, unitId: number, amenityIds: number[]): Promise<unknown> {
  if (amenityIds.length) {
    const { error } = await supabase
      .from("unit_amenities")
      .upsert(
        amenityIds.map((amenityId) => ({ unit_id: unitId, amenity_id: amenityId })),
        { onConflict: "unit_id,amenity_id", ignoreDuplicates: true },
      );
    if (error) return error;
  }
  let removal = supabase.from("unit_amenities").delete().eq("unit_id", unitId);
  if (amenityIds.length) removal = removal.not("amenity_id", "in", `(${amenityIds.join(",")})`);
  const { error } = await removal;
  return error ?? null;
}

/** Tambah unit baru. Mengembalikan id dan slug untuk membuka form ubah. */
export async function createUnit(input: unknown): Promise<ActionResult<UnitSaved>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = unitSchema.safeParse(input);
  if (!parsed.success) return invalid(toFieldErrors(parsed.error.issues));
  const data = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const prepared = await prepareUnit(supabase, data);
    if (!prepared.ok) return prepared.result;

    const now = nowIso();
    const row = buildUnitRow(data, prepared, now);
    const { data: created, error } = await supabase
      .from("units")
      .insert({ ...row, created_at: now })
      .select("id, slug")
      .single();
    if (error?.code === "23505") return invalid({ slug: MSG_SLUG });
    if (error || !created) return fail("createUnit insert", error);

    if (prepared.amenityIds.length) {
      const { error: linkError } = await supabase
        .from("unit_amenities")
        .insert(prepared.amenityIds.map((amenityId) => ({ unit_id: created.id, amenity_id: amenityId })));
      if (linkError) {
        // Batalkan unit setengah jadi; foto tetap ada di form sehingga admin bisa langsung simpan ulang.
        await supabase.from("units").delete().eq("id", created.id);
        return fail("createUnit fasilitas", linkError, "Fasilitas kamar gagal disimpan. Coba simpan lagi.");
      }
    }

    invalidate({ kind: "unit", slugs: [created.slug] });
    return { ok: true, message: "Perubahan disimpan", data: { id: created.id, slug: created.slug } };
  } catch (error) {
    return fail("createUnit", error);
  }
}

/** Simpan perubahan unit. Foto yang dibuang dihapus dari Storage (kecuali masih dipakai unit lain). */
export async function updateUnit(id: unknown, input: unknown): Promise<ActionResult<UnitSaved>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success) return invalid(toFieldErrors(parsed.error.issues));
  const unitId = parsedId.data;
  const data = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const { data: current, error: readError } = await supabase
      .from("units")
      .select("slug, main_image, gallery_images")
      .eq("id", unitId)
      .maybeSingle();
    if (readError) return fail(`updateUnit(${unitId}) baca`, readError);
    if (!current) return { ok: false, error: MSG_NOT_FOUND };

    const prepared = await prepareUnit(supabase, data, unitId);
    if (!prepared.ok) return prepared.result;

    const { data: saved, error } = await supabase
      .from("units")
      .update(buildUnitRow(data, prepared, nowIso()))
      .eq("id", unitId)
      .select("id, slug")
      .maybeSingle();
    if (error?.code === "23505") return invalid({ slug: MSG_SLUG });
    if (error) return fail(`updateUnit(${unitId}) simpan`, error);
    if (!saved) return { ok: false, error: MSG_NOT_FOUND };

    const linkError = await syncUnitAmenities(supabase, unitId, prepared.amenityIds);
    if (linkError) console.error(`[admin/units-form] updateUnit(${unitId}) fasilitas gagal`, linkError);

    // Foto yang dibuang: hanya path bucket milik unit ini (URL eksternal diabaikan). Gagal hapus tidak membatalkan simpan.
    const removed = removedPaths([current.main_image, ...parseGallery(current.gallery_images)], prepared.photos);
    if (removed.length) {
      try {
        await deleteUnusedUnitPhotos(supabase, removed, unitId);
      } catch (cleanupError) {
        console.error(`[admin/units-form] updateUnit(${unitId}) hapus foto gagal`, cleanupError);
      }
    }

    invalidate({ kind: "unit", slugs: [current.slug, saved.slug] });
    if (linkError) return { ok: false, error: MSG_AMENITY_SYNC, fieldErrors: { amenityIds: MSG_AMENITY_SYNC } };
    return { ok: true, message: "Perubahan disimpan", data: { id: saved.id, slug: saved.slug } };
  } catch (error) {
    return fail(`updateUnit(${unitId})`, error);
  }
}
