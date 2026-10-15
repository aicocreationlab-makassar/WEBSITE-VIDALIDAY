"use server";

// Server Action apartemen (PRD 7.5). Setiap aksi: guardAdmin() → validasi zod (skema yang sama
// dengan form) → tulis lewat sesi admin (RLS is_admin, tanpa secret key) → invalidate().
// Apartemen baru otomatis tampil di hero/menu/sitemap setelah aktif DAN punya unit tampil
// (lapisan data publik yang menyaring), cukup kedaluwarsakan tag "locations".

import { z } from "zod";
import {
  LOCATION_SLUG_TAKEN,
  fieldMessage,
  isLocationImagePath,
  locationInUseMessage,
  newLocationSchema,
  planReorder,
} from "@/components/admin/locations/location-model";
import { guardAdmin, invalidate, nowIso, toFieldErrors, type ActionResult } from "@/lib/actions/admin/guard";
import { isBucketPath, normalizeStoragePath } from "@/lib/media";
import { deleteStorageFiles } from "@/lib/storage-cleanup";
import { locationSchema, reorderSchema } from "@/lib/validation/admin";

type PostgrestLikeError = { code?: string; message?: string } | null | undefined;
type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };
// Alias tipe (bukan objek inline di signature) supaya pengaman guard-coverage membaca badan fungsi.
type Created = { id: number };
type Saved = { slug: string };

const MSG_INVALID = "Periksa lagi isian di form.";
const MSG_NOT_FOUND = "Apartemen tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman.";
const MSG_FORBIDDEN = "Akun ini tidak punya izin mengubah data. Masuk lagi sebagai admin.";
const MSG_FAILED = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";

const idSchema = z.number().int().positive();
const activeSchema = z.object({ id: idSchema, isActive: z.boolean() });

function failure(error: PostgrestLikeError, context: string): Failure {
  if (error?.code === "42501") return { ok: false, error: MSG_FORBIDDEN };
  // Hanya kode galat yang dicatat (tanpa data isian).
  console.error(`[admin/locations] ${context} gagal`, { code: error?.code });
  return { ok: false, error: MSG_FAILED };
}

function invalidInput(issues: { path: PropertyKey[]; message: string }[]): Failure {
  const raw = toFieldErrors(issues);
  const fieldErrors = Object.fromEntries(Object.entries(raw).map(([field, message]) => [field, fieldMessage(field, message)]));
  return { ok: false, error: MSG_INVALID, fieldErrors };
}

function slugTaken(): Failure {
  return { ok: false, error: LOCATION_SLUG_TAKEN, fieldErrors: { slug: LOCATION_SLUG_TAKEN } };
}

/** File foto apartemen lama di bucket (hanya folder locations/; URL luar dan file lain dibiarkan). */
function ownedLocationImage(value: string | null | undefined): string | null {
  if (!isBucketPath(value)) return null;
  const path = normalizeStoragePath(value);
  return isLocationImagePath(path) ? path : null;
}

/** Nilai foto sama (URL persis, atau path bucket yang sama setelah dinormalkan). */
function samePath(a: string, b: string): boolean {
  if (a.trim() === b.trim()) return true;
  return isBucketPath(a) && isBucketPath(b) && normalizeStoragePath(a) === normalizeStoragePath(b);
}

/**
 * Saring path yang masih dipakai baris lain (fasilitas atau apartemen lain), misalnya foto fasilitas
 * yang sama dipasang di dua gedung. Kalau pengecekan gagal, semua file dibiarkan (lebih aman tersisa).
 */
async function unreferencedPaths(
  supabase: Parameters<typeof deleteStorageFiles>[0],
  paths: (string | null)[],
): Promise<string[]> {
  const list = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (!list.length) return [];
  const variants = list.flatMap((path) => [path, `storage/${path}`, `/storage/${path}`]);
  try {
    const [facilities, locations] = await Promise.all([
      supabase.from("facilities").select("image").in("image", variants),
      supabase.from("locations").select("hero_image").in("hero_image", variants),
    ]);
    if (facilities.error || locations.error) return [];
    const used = new Set(
      [...(facilities.data ?? []).map((row) => row.image), ...(locations.data ?? []).map((row) => row.hero_image)]
        .filter(isBucketPath)
        .map(normalizeStoragePath),
    );
    return list.filter((path) => !used.has(path));
  } catch {
    return [];
  }
}

/** Hapus file Storage tanpa menggagalkan aksi (sisa file tidak merusak situs). */
async function cleanupFiles(
  supabase: Parameters<typeof deleteStorageFiles>[0],
  paths: (string | null)[],
  context: string,
): Promise<void> {
  const list = paths.filter((p): p is string => Boolean(p));
  if (!list.length) return;
  try {
    await deleteStorageFiles(supabase, list);
  } catch (error) {
    console.error(`[admin/locations] hapus file ${context} gagal`, { name: (error as Error)?.name });
  }
}

/** Tambah apartemen (nonaktif dulu). Mengembalikan id untuk membuka halaman ubah. */
export async function createLocation(input: unknown): Promise<ActionResult<Created>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = newLocationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const { name, shortName, slug } = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const [taken, last] = await Promise.all([
      supabase.from("locations").select("id").eq("slug", slug).maybeSingle(),
      supabase.from("locations").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (taken.error) return failure(taken.error, "cek slug");
    if (taken.data) return slugTaken();
    if (last.error) return failure(last.error, "baca urutan");

    const now = nowIso();
    const { data, error } = await supabase
      .from("locations")
      .insert({
        name,
        short_name: shortName,
        slug,
        is_active: false,
        sort_order: (last.data?.sort_order ?? 0) + 1,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (error?.code === "23505") return slugTaken();
    if (error || !data) return failure(error, "tambah");

    invalidate({ kind: "location" });
    return { ok: true, message: `Apartemen ${name} dibuat. Lengkapi datanya lalu aktifkan.`, data: { id: data.id } };
  } catch (error) {
    return failure({ message: (error as Error)?.message }, "tambah");
  }
}

/** Simpan form apartemen. Foto lama di bucket dihapus kalau diganti/dihapus. */
export async function updateLocation(id: unknown, input: unknown): Promise<ActionResult<Saved>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const locationId = parsedId.data;
  const values = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const [current, taken] = await Promise.all([
      supabase.from("locations").select("id, hero_image").eq("id", locationId).maybeSingle(),
      supabase.from("locations").select("id").eq("slug", values.slug).neq("id", locationId).limit(1),
    ]);
    if (current.error) return failure(current.error, "baca");
    if (!current.data) return { ok: false, error: MSG_NOT_FOUND };
    if (taken.error) return failure(taken.error, "cek slug");
    if (taken.data?.length) return slugTaken();

    // Foto: nilai lama boleh tetap apa adanya; foto baru hanya hasil unggah ke folder locations/.
    const oldImage = current.data.hero_image;
    const sameAsOld = Boolean(values.heroImage && oldImage && samePath(values.heroImage, oldImage));
    let heroImage: string | null = null;
    if (values.heroImage && sameAsOld) {
      heroImage = oldImage;
    } else if (values.heroImage) {
      const path = normalizeStoragePath(values.heroImage);
      if (!isBucketPath(values.heroImage) || !isLocationImagePath(path)) {
        return { ok: false, error: MSG_INVALID, fieldErrors: { heroImage: fieldMessage("heroImage", "") } };
      }
      heroImage = path;
    }
    const replacedImage = oldImage && !sameAsOld ? ownedLocationImage(oldImage) : null;

    const { data, error } = await supabase
      .from("locations")
      .update({
        name: values.name,
        short_name: values.shortName,
        slug: values.slug,
        area: values.area,
        address: values.address,
        gmaps_url: values.gmapsUrl,
        latitude: values.latitude,
        longitude: values.longitude,
        tagline: values.tagline,
        description: values.description,
        hero_image: heroImage,
        sort_order: values.sortOrder,
        is_active: values.isActive,
        updated_at: nowIso(),
      })
      .eq("id", locationId)
      .select("id");
    if (error?.code === "23505") return slugTaken();
    if (error) return failure(error, "ubah");
    if (!data?.length) return { ok: false, error: MSG_NOT_FOUND };

    await cleanupFiles(supabase, [replacedImage], "foto lama");

    invalidate({ kind: "location" });
    return { ok: true, message: "Perubahan disimpan", data: { slug: values.slug } };
  } catch (error) {
    return failure({ message: (error as Error)?.message }, "ubah");
  }
}

/** Aktifkan/nonaktifkan apartemen (dipakai juga sebagai pengganti hapus kalau masih punya unit). */
export async function setLocationActive(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = activeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_NOT_FOUND };
  const { id, isActive } = parsed.data;

  try {
    const { data, error } = await auth.session.supabase
      .from("locations")
      .update({ is_active: isActive, updated_at: nowIso() })
      .eq("id", id)
      .select("name");
    if (error) return failure(error, "ubah status");
    const name = data?.[0]?.name;
    if (!name) return { ok: false, error: MSG_NOT_FOUND };

    invalidate({ kind: "location" });
    return {
      ok: true,
      message: isActive ? `${name} diaktifkan` : `${name} dinonaktifkan dan tidak tampil di situs`,
    };
  } catch (error) {
    return failure({ message: (error as Error)?.message }, "ubah status");
  }
}

/** Naikkan/turunkan urutan apartemen (tukar sort_order dengan tetangga; dihitung ulang dari DB). */
export async function reorderLocation(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_NOT_FOUND };
  const { id, direction } = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const { data: rows, error: readError } = await supabase.from("locations").select("id, sort_order");
    if (readError) return failure(readError, "baca urutan");
    const items = (rows ?? []).map((row) => ({ id: row.id, sortOrder: row.sort_order }));
    if (!items.some((item) => item.id === id)) return { ok: false, error: MSG_NOT_FOUND };

    const plan = planReorder(items, id, direction);
    if (!plan?.length) return { ok: true, message: "Urutan tidak berubah" };

    const now = nowIso();
    const results = await Promise.all(
      plan.map((item) =>
        supabase.from("locations").update({ sort_order: item.sortOrder, updated_at: now }).eq("id", item.id),
      ),
    );
    const failed = results.find((result) => result.error);

    // Tetap kedaluwarsakan cache walau sebagian gagal, supaya tampilan sesuai isi DB.
    invalidate({ kind: "location" });
    if (failed) return failure(failed.error, "ubah urutan");
    return { ok: true, message: "Urutan disimpan" };
  } catch (error) {
    return failure({ message: (error as Error)?.message }, "ubah urutan");
  }
}

/**
 * Hapus apartemen tanpa unit. Tipe kamar, fasilitas gedung, dan landmark ikut terhapus (cascade);
 * foto apartemen dan foto fasilitasnya dihapus dari bucket. Masih punya unit → ditolak (DB juga: FK restrict).
 */
export async function deleteLocation(id: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };
  const locationId = parsedId.data;
  const supabase = auth.session.supabase;

  try {
    const [current, units, facilities] = await Promise.all([
      supabase.from("locations").select("id, name, hero_image").eq("id", locationId).maybeSingle(),
      supabase.from("units").select("id", { count: "exact", head: true }).eq("location_id", locationId),
      supabase.from("facilities").select("image").eq("location_id", locationId),
    ]);
    if (current.error) return failure(current.error, "baca");
    if (!current.data) return { ok: false, error: MSG_NOT_FOUND };
    if (units.error) return failure(units.error, "hitung unit");
    if ((units.count ?? 0) > 0) return { ok: false, error: locationInUseMessage(units.count) };

    const { data, error } = await supabase.from("locations").delete().eq("id", locationId).select("id");
    if (error?.code === "23503") return { ok: false, error: locationInUseMessage(null) };
    if (error) return failure(error, "hapus");
    if (!data?.length) return { ok: false, error: MSG_NOT_FOUND };

    const facilityImages = (facilities.data ?? [])
      .map((row) => (isBucketPath(row.image) ? normalizeStoragePath(row.image) : null))
      .filter((path): path is string => Boolean(path && /^facilities\/[A-Za-z0-9._-]+$/.test(path)));
    // Dijalankan setelah hapus: fasilitas apartemen ini sudah ikut terhapus (cascade), jadi yang tersisa milik gedung lain.
    const orphaned = await unreferencedPaths(supabase, [ownedLocationImage(current.data.hero_image), ...facilityImages]);
    await cleanupFiles(supabase, orphaned, "apartemen");

    invalidate({ kind: "location" }, { kind: "facility" }, { kind: "landmark" });
    return { ok: true, message: `Apartemen ${current.data.name} dihapus` };
  } catch (error) {
    return failure({ message: (error as Error)?.message }, "hapus");
  }
}
