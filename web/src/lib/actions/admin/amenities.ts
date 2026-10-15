"use server";

import { z } from "zod";
import { guardAdmin, invalidate, nowIso, toFieldErrors, type ActionResult } from "@/lib/actions/admin/guard";
import { isKnownIconName } from "@/lib/icons";
import { amenitySchema } from "@/lib/validation/admin";

// Fasilitas kamar (PRD 7.6). Setiap aksi: guardAdmin() → validasi zod (skema yang sama dengan
// form) → tulis lewat sesi admin (RLS is_admin) → invalidate({ kind: "amenity" }).

type Created = { id: number };
type PostgrestLikeError = { code?: string; message?: string } | null;

const MSG_INVALID = "Periksa lagi isian di form.";
const MSG_DUPLICATE = "Nama fasilitas sudah ada.";
const MSG_ICON = "Pilih ikon dari daftar.";
const MSG_NOT_FOUND = "Fasilitas tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman.";
const MSG_FORBIDDEN = "Akun ini tidak punya izin mengubah data. Masuk lagi sebagai admin.";
const MSG_FAILED = "Gagal menyimpan. Coba lagi sebentar lagi.";

const idSchema = z.number().int().positive();
const toggleSchema = z.object({ id: idSchema, isActive: z.boolean() });

function failure(error: PostgrestLikeError, context: string): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  if (error?.code === "23505") return { ok: false, error: MSG_DUPLICATE, fieldErrors: { name: MSG_DUPLICATE } };
  if (error?.code === "42501") return { ok: false, error: MSG_FORBIDDEN };
  // Hanya kode galat yang dicatat.
  console.error(`[admin/amenities] ${context} gagal`, { code: error?.code });
  return { ok: false, error: MSG_FAILED };
}

type ParsedAmenity =
  | { ok: true; data: z.output<typeof amenitySchema> }
  | { ok: false; result: { ok: false; error: string; fieldErrors: Record<string, string> } };

function parseAmenity(input: unknown): ParsedAmenity {
  const parsed = amenitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, result: { ok: false, error: MSG_INVALID, fieldErrors: toFieldErrors(parsed.error.issues) } };
  }
  if (!isKnownIconName(parsed.data.icon)) {
    return { ok: false, result: { ok: false, error: MSG_INVALID, fieldErrors: { icon: MSG_ICON } } };
  }
  return { ok: true, data: parsed.data };
}

/** Tambah fasilitas kamar. */
export async function createAmenity(input: unknown): Promise<ActionResult<Created>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = parseAmenity(input);
  if (!parsed.ok) return parsed.result;
  const { name, icon, sortOrder, isActive } = parsed.data;

  const now = nowIso();
  const { data, error } = await auth.session.supabase
    .from("amenities")
    .insert({ name, icon, sort_order: sortOrder, is_active: isActive, created_at: now, updated_at: now })
    .select("id")
    .single();
  if (error || !data) return failure(error, "tambah");

  invalidate({ kind: "amenity" });
  return { ok: true, message: `Fasilitas ${name} ditambahkan`, data: { id: data.id } };
}

/** Ubah nama, ikon, urutan, atau status aktif. */
export async function updateAmenity(id: unknown, input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };
  const parsed = parseAmenity(input);
  if (!parsed.ok) return parsed.result;
  const { name, icon, sortOrder, isActive } = parsed.data;

  const { data, error } = await auth.session.supabase
    .from("amenities")
    .update({ name, icon, sort_order: sortOrder, is_active: isActive, updated_at: nowIso() })
    .eq("id", parsedId.data)
    .select("id");
  if (error) return failure(error, "ubah");
  if (!data?.length) return { ok: false, error: MSG_NOT_FOUND };

  invalidate({ kind: "amenity" });
  return { ok: true, message: "Perubahan disimpan" };
}

/** Aktif/nonaktif langsung dari daftar. Nonaktif = tidak tampil di halaman unit. */
export async function toggleAmenityActive(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_NOT_FOUND };
  const { id, isActive } = parsed.data;

  const { data, error } = await auth.session.supabase
    .from("amenities")
    .update({ is_active: isActive, updated_at: nowIso() })
    .eq("id", id)
    .select("name");
  if (error) return failure(error, "ubah status");
  const name = data?.[0]?.name;
  if (!name) return { ok: false, error: MSG_NOT_FOUND };

  invalidate({ kind: "amenity" });
  return {
    ok: true,
    message: isActive ? `${name} tampil lagi di halaman unit` : `${name} disembunyikan dari halaman unit`,
  };
}

/** Hapus fasilitas; relasinya di unit_amenities ikut terhapus (on delete cascade). */
export async function deleteAmenity(id: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };

  const { data, error } = await auth.session.supabase
    .from("amenities")
    .delete()
    .eq("id", parsedId.data)
    .select("name");
  if (error) return failure(error, "hapus");
  const name = data?.[0]?.name;
  if (!name) return { ok: false, error: MSG_NOT_FOUND };

  invalidate({ kind: "amenity" });
  return { ok: true, message: `Fasilitas ${name} dihapus` };
}
