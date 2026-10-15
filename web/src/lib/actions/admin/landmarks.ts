"use server";

// Server Action landmark (PRD 7.7). Setiap aksi: guardAdmin() → validasi zod (skema yang sama
// dengan form) → tulis lewat sesi admin (RLS is_admin, tanpa secret key) → invalidate({ kind: "landmark" }).
// Urutan dihitung per apartemen (landmark tampil per apartemen di situs).

import { z } from "zod";
import { planReorder } from "@/components/admin/locations/location-model";
import { guardAdmin, invalidate, nowIso, toFieldErrors, type ActionResult } from "@/lib/actions/admin/guard";
import { isKnownIconName, resolveIconName } from "@/lib/icons";
import { landmarkSchema, reorderSchema } from "@/lib/validation/admin";

type PostgrestLikeError = { code?: string; message?: string } | null | undefined;
type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };
// Alias tipe (bukan objek inline di signature) supaya pengaman guard-coverage membaca badan fungsi.
type Created = { id: number };
type LandmarkData = z.output<typeof landmarkSchema>;

const MSG_INVALID = "Periksa lagi isian di form.";
const MSG_ICON = "Pilih ikon kategori dari daftar.";
const MSG_NOT_FOUND = "Landmark tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman.";
const MSG_LOCATION_GONE = "Apartemen tidak ditemukan. Muat ulang halaman lalu pilih lagi.";
const MSG_FORBIDDEN = "Akun ini tidak punya izin mengubah data. Masuk lagi sebagai admin.";
const MSG_FAILED = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";

const idSchema = z.number().int().positive();
const activeSchema = z.object({ id: idSchema, isActive: z.boolean() });

function failure(error: PostgrestLikeError, context: string): Failure {
  if (error?.code === "42501") return { ok: false, error: MSG_FORBIDDEN };
  if (error?.code === "23503") return { ok: false, error: MSG_LOCATION_GONE, fieldErrors: { locationId: MSG_LOCATION_GONE } };
  // Hanya kode galat yang dicatat (tanpa data isian).
  console.error(`[admin/landmarks] ${context} gagal`, { code: error?.code });
  return { ok: false, error: MSG_FAILED };
}

function thrown(error: unknown, context: string): Failure {
  console.error(`[admin/landmarks] ${context} gagal`, { name: (error as Error)?.name });
  return { ok: false, error: MSG_FAILED };
}

type Parsed = { ok: true; data: LandmarkData } | { ok: false; result: Failure };

function parseLandmark(input: unknown): Parsed {
  const parsed = landmarkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, result: { ok: false, error: MSG_INVALID, fieldErrors: toFieldErrors(parsed.error.issues) } };
  }
  if (!isKnownIconName(parsed.data.icon)) {
    return { ok: false, result: { ok: false, error: MSG_INVALID, fieldErrors: { icon: MSG_ICON } } };
  }
  return { ok: true, data: parsed.data };
}

/** Kolom DB dari isian form. Ikon disimpan dengan nama registry (alias dinormalkan). */
function toColumns(data: LandmarkData) {
  return {
    location_id: data.locationId,
    name: data.name,
    distance_time: data.distanceTime,
    notes: data.notes,
    icon: resolveIconName(data.icon, "map-pin"),
    sort_order: data.sortOrder,
    is_active: data.isActive,
  };
}

/** Tambah landmark di satu apartemen. */
export async function createLandmark(input: unknown): Promise<ActionResult<Created>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = parseLandmark(input);
  if (!parsed.ok) return parsed.result;

  try {
    const now = nowIso();
    const { data, error } = await auth.session.supabase
      .from("landmarks")
      .insert({ ...toColumns(parsed.data), created_at: now, updated_at: now })
      .select("id")
      .single();
    if (error || !data) return failure(error, "tambah");

    invalidate({ kind: "landmark" });
    return { ok: true, message: `Landmark ${parsed.data.name} ditambahkan`, data: { id: data.id } };
  } catch (error) {
    return thrown(error, "tambah");
  }
}

/** Ubah landmark (termasuk pindah apartemen). */
export async function updateLandmark(id: unknown, input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };
  const parsed = parseLandmark(input);
  if (!parsed.ok) return parsed.result;

  try {
    const { data, error } = await auth.session.supabase
      .from("landmarks")
      .update({ ...toColumns(parsed.data), updated_at: nowIso() })
      .eq("id", parsedId.data)
      .select("id");
    if (error) return failure(error, "ubah");
    if (!data?.length) return { ok: false, error: MSG_NOT_FOUND };

    invalidate({ kind: "landmark" });
    return { ok: true, message: "Perubahan disimpan" };
  } catch (error) {
    return thrown(error, "ubah");
  }
}

/** Aktif/nonaktif langsung dari daftar. Nonaktif = tidak tampil di halaman apartemen dan detail unit. */
export async function toggleLandmarkActive(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = activeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_NOT_FOUND };
  const { id, isActive } = parsed.data;

  try {
    const { data, error } = await auth.session.supabase
      .from("landmarks")
      .update({ is_active: isActive, updated_at: nowIso() })
      .eq("id", id)
      .select("name");
    if (error) return failure(error, "ubah status");
    const name = data?.[0]?.name;
    if (!name) return { ok: false, error: MSG_NOT_FOUND };

    invalidate({ kind: "landmark" });
    return { ok: true, message: isActive ? `${name} tampil lagi di situs` : `${name} disembunyikan dari situs` };
  } catch (error) {
    return thrown(error, "ubah status");
  }
}

/** Naikkan/turunkan urutan di dalam apartemennya (tukar dengan tetangga; dihitung ulang dari DB). */
export async function reorderLandmark(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_NOT_FOUND };
  const { id, direction } = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const { data: current, error: currentError } = await supabase
      .from("landmarks")
      .select("location_id")
      .eq("id", id)
      .maybeSingle();
    if (currentError) return failure(currentError, "baca urutan");
    if (!current) return { ok: false, error: MSG_NOT_FOUND };

    const { data: siblings, error: readError } = await supabase
      .from("landmarks")
      .select("id, sort_order")
      .eq("location_id", current.location_id);
    if (readError) return failure(readError, "baca urutan");

    const items = (siblings ?? []).map((row) => ({ id: row.id, sortOrder: row.sort_order }));
    const plan = planReorder(items, id, direction);
    if (!plan?.length) return { ok: true, message: "Urutan tidak berubah" };

    const now = nowIso();
    const results = await Promise.all(
      plan.map((item) => supabase.from("landmarks").update({ sort_order: item.sortOrder, updated_at: now }).eq("id", item.id)),
    );
    const failed = results.find((result) => result.error);

    // Tetap kedaluwarsakan cache walau sebagian gagal, supaya tampilan sesuai isi DB.
    invalidate({ kind: "landmark" });
    if (failed) return failure(failed.error, "ubah urutan");
    return { ok: true, message: "Urutan disimpan" };
  } catch (error) {
    return thrown(error, "ubah urutan");
  }
}

/** Hapus landmark. */
export async function deleteLandmark(id: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };

  try {
    const { data, error } = await auth.session.supabase
      .from("landmarks")
      .delete()
      .eq("id", parsedId.data)
      .select("name");
    if (error) return failure(error, "hapus");
    const name = data?.[0]?.name;
    if (!name) return { ok: false, error: MSG_NOT_FOUND };

    invalidate({ kind: "landmark" });
    return { ok: true, message: `Landmark ${name} dihapus` };
  } catch (error) {
    return thrown(error, "hapus");
  }
}
