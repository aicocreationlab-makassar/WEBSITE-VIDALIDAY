"use server";

// Server Action tipe kamar per apartemen (PRD 7.5). Setiap aksi: guardAdmin() → validasi zod
// (roomTypeSchema, sama dengan form) → tulis lewat sesi admin (RLS is_admin) → invalidate({ kind: "roomType" }).
// Slug unik per apartemen (unique(location_id, slug)); hapus ditolak selama dipakai unit (FK restrict).

import { z } from "zod";
import {
  ROOM_TYPE_SLUG_TAKEN,
  fieldMessage,
  roomTypeInUseMessage,
} from "@/components/admin/locations/location-model";
import { guardAdmin, invalidate, nowIso, toFieldErrors, type ActionResult } from "@/lib/actions/admin/guard";
import { roomTypeSchema } from "@/lib/validation/admin";

type PostgrestLikeError = { code?: string; message?: string } | null | undefined;
type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };
// Alias tipe (bukan objek inline di signature) supaya pengaman guard-coverage membaca badan fungsi.
type Created = { id: number };

const MSG_INVALID = "Periksa lagi isian di form.";
const MSG_NOT_FOUND = "Tipe kamar tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman.";
const MSG_LOCATION_NOT_FOUND = "Apartemen tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman.";
const MSG_MISMATCH = "Tipe kamar ini milik apartemen lain. Muat ulang halaman lalu coba lagi.";
const MSG_FORBIDDEN = "Akun ini tidak punya izin mengubah data. Masuk lagi sebagai admin.";
const MSG_FAILED = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";

const idSchema = z.number().int().positive();
const activeSchema = z.object({ id: idSchema, isActive: z.boolean() });

function failure(error: PostgrestLikeError, context: string): Failure {
  if (error?.code === "42501") return { ok: false, error: MSG_FORBIDDEN };
  console.error(`[admin/room-types] ${context} gagal`, { code: error?.code });
  return { ok: false, error: MSG_FAILED };
}

function invalidInput(issues: { path: PropertyKey[]; message: string }[]): Failure {
  const raw = toFieldErrors(issues);
  const fieldErrors = Object.fromEntries(Object.entries(raw).map(([field, message]) => [field, fieldMessage(field, message)]));
  return { ok: false, error: MSG_INVALID, fieldErrors };
}

function slugTaken(): Failure {
  return { ok: false, error: ROOM_TYPE_SLUG_TAKEN, fieldErrors: { slug: ROOM_TYPE_SLUG_TAKEN } };
}

/** Tambah tipe kamar di satu apartemen. */
export async function createRoomType(input: unknown): Promise<ActionResult<Created>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = roomTypeSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const values = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const [location, taken] = await Promise.all([
      supabase.from("locations").select("id").eq("id", values.locationId).maybeSingle(),
      supabase.from("room_types").select("id").eq("location_id", values.locationId).eq("slug", values.slug).limit(1),
    ]);
    if (location.error) return failure(location.error, "cek apartemen");
    if (!location.data) return { ok: false, error: MSG_LOCATION_NOT_FOUND };
    if (taken.error) return failure(taken.error, "cek slug");
    if (taken.data?.length) return slugTaken();

    const now = nowIso();
    const { data, error } = await supabase
      .from("room_types")
      .insert({
        location_id: values.locationId,
        name: values.name,
        slug: values.slug,
        category: values.category,
        default_max_guests: values.defaultMaxGuests,
        sort_order: values.sortOrder,
        is_active: values.isActive,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (error?.code === "23505") return slugTaken();
    if (error?.code === "23503") return { ok: false, error: MSG_LOCATION_NOT_FOUND };
    if (error || !data) return failure(error, "tambah");

    invalidate({ kind: "roomType" });
    return { ok: true, message: `Tipe kamar ${values.name} ditambahkan`, data: { id: data.id } };
  } catch (error) {
    return failure({ message: (error as Error)?.message }, "tambah");
  }
}

/** Ubah tipe kamar. Apartemen pemiliknya tidak bisa dipindah (unit sudah menunjuk ke tipe ini). */
export async function updateRoomType(id: unknown, input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };
  const parsed = roomTypeSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const typeId = parsedId.data;
  const values = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const [current, taken] = await Promise.all([
      supabase.from("room_types").select("id, location_id").eq("id", typeId).maybeSingle(),
      supabase
        .from("room_types")
        .select("id")
        .eq("location_id", values.locationId)
        .eq("slug", values.slug)
        .neq("id", typeId)
        .limit(1),
    ]);
    if (current.error) return failure(current.error, "baca");
    if (!current.data) return { ok: false, error: MSG_NOT_FOUND };
    if (current.data.location_id !== values.locationId) return { ok: false, error: MSG_MISMATCH };
    if (taken.error) return failure(taken.error, "cek slug");
    if (taken.data?.length) return slugTaken();

    const { data, error } = await supabase
      .from("room_types")
      .update({
        name: values.name,
        slug: values.slug,
        category: values.category,
        default_max_guests: values.defaultMaxGuests,
        sort_order: values.sortOrder,
        is_active: values.isActive,
        updated_at: nowIso(),
      })
      .eq("id", typeId)
      .select("id");
    if (error?.code === "23505") return slugTaken();
    if (error) return failure(error, "ubah");
    if (!data?.length) return { ok: false, error: MSG_NOT_FOUND };

    invalidate({ kind: "roomType" });
    return { ok: true, message: "Perubahan disimpan" };
  } catch (error) {
    return failure({ message: (error as Error)?.message }, "ubah");
  }
}

/** Aktif/nonaktif langsung dari tabel. Nonaktif = disembunyikan dari filter dan pilihan tipe. */
export async function toggleRoomTypeActive(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = activeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_NOT_FOUND };
  const { id, isActive } = parsed.data;

  try {
    const { data, error } = await auth.session.supabase
      .from("room_types")
      .update({ is_active: isActive, updated_at: nowIso() })
      .eq("id", id)
      .select("name");
    if (error) return failure(error, "ubah status");
    const name = data?.[0]?.name;
    if (!name) return { ok: false, error: MSG_NOT_FOUND };

    invalidate({ kind: "roomType" });
    return { ok: true, message: isActive ? `Tipe ${name} diaktifkan` : `Tipe ${name} dinonaktifkan` };
  } catch (error) {
    return failure({ message: (error as Error)?.message }, "ubah status");
  }
}

/** Hapus tipe kamar yang tidak dipakai unit mana pun (DB juga menolak: FK restrict). */
export async function deleteRoomType(id: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };
  const typeId = parsedId.data;
  const supabase = auth.session.supabase;

  try {
    const { count, error: countError } = await supabase
      .from("units")
      .select("id", { count: "exact", head: true })
      .eq("room_type_id", typeId);
    if (countError) return failure(countError, "hitung unit");
    if ((count ?? 0) > 0) return { ok: false, error: roomTypeInUseMessage(count) };

    const { data, error } = await supabase.from("room_types").delete().eq("id", typeId).select("name");
    if (error?.code === "23503") return { ok: false, error: roomTypeInUseMessage(null) };
    if (error) return failure(error, "hapus");
    const name = data?.[0]?.name;
    if (!name) return { ok: false, error: MSG_NOT_FOUND };

    invalidate({ kind: "roomType" });
    return { ok: true, message: `Tipe kamar ${name} dihapus` };
  } catch (error) {
    return failure({ message: (error as Error)?.message }, "hapus");
  }
}
