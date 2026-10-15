"use server";

// Server Action daftar unit admin (PRD 7.4): ubah harga cepat, tandai penuh/tersedia, unggulan,
// duplikat, hapus, dan aksi massal. Semua lewat sesi admin (RLS is_admin), tidak memakai secret key.

import { z } from "zod";
import {
  bulkMessage,
  duplicateName,
  duplicateSlug,
  isPromoEligible,
} from "@/components/admin/units/list/unit-list-model";
import { guardAdmin, invalidate, nowIso, toFieldErrors, type ActionResult } from "@/lib/actions/admin/guard";
import { getTakenUnitSlugs } from "@/lib/data/admin/units";
import { parseGallery } from "@/lib/media";
import { deleteUnusedUnitPhotos } from "@/lib/storage-cleanup";
import { bulkSchema, quickPriceSchema } from "@/lib/validation/admin";

const idInput = z.object({ id: z.number().int().positive() });
const flagInput = z.object({ id: z.number().int().positive(), value: z.boolean() });

const SAVE_FAILED = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";
const NOT_FOUND = "Unit tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman.";
const INVALID = "Data yang dikirim tidak valid. Muat ulang halaman lalu coba lagi.";

type DuplicateResult = ActionResult<{ id: number }>;
type BulkResult = ActionResult<{ updated: number; skipped: number }>;

function fail(context: string, error: unknown, message = SAVE_FAILED): { ok: false; error: string } {
  console.error(`[units-list] ${context}:`, error);
  return { ok: false, error: message };
}

/** Ubah harga cepat dari daftar (popover/bottom sheet "Ubah harga"). */
export async function updateUnitPrice(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = quickPriceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Periksa lagi harga yang diisi.", fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const { id, normalPrice, promoPrice, isPromoActive } = parsed.data;

  try {
    const { data, error } = await auth.session.supabase
      .from("units")
      .update({
        normal_price: normalPrice,
        promo_price: promoPrice ?? 0,
        is_promo_active: isPromoActive,
        updated_at: nowIso(),
      })
      .eq("id", id)
      .select("slug")
      .maybeSingle();
    if (error) return fail(`updateUnitPrice(${id})`, error);
    if (!data) return { ok: false, error: NOT_FOUND };

    invalidate({ kind: "unit", slugs: [data.slug] });
    return { ok: true, message: "Harga disimpan" };
  } catch (error) {
    return fail(`updateUnitPrice(${id})`, error);
  }
}

/** Tandai penuh (value=false) atau tersedia (value=true). */
export async function toggleAvailability(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = flagInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const { id, value } = parsed.data;

  try {
    const { data, error } = await auth.session.supabase
      .from("units")
      .update({ is_available: value, updated_at: nowIso() })
      .eq("id", id)
      .select("slug")
      .maybeSingle();
    if (error) return fail(`toggleAvailability(${id})`, error);
    if (!data) return { ok: false, error: NOT_FOUND };

    invalidate({ kind: "unit", slugs: [data.slug] });
    return { ok: true, message: value ? "Unit ditandai tersedia" : "Unit ditandai penuh" };
  } catch (error) {
    return fail(`toggleAvailability(${id})`, error);
  }
}

/** Jadikan unggulan (value=true) atau hapus dari unggulan (value=false). */
export async function toggleFeatured(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = flagInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const { id, value } = parsed.data;

  try {
    const { data, error } = await auth.session.supabase
      .from("units")
      .update({ is_featured: value, updated_at: nowIso() })
      .eq("id", id)
      .select("slug")
      .maybeSingle();
    if (error) return fail(`toggleFeatured(${id})`, error);
    if (!data) return { ok: false, error: NOT_FOUND };

    invalidate({ kind: "unit", slugs: [data.slug] });
    return { ok: true, message: value ? "Unit dijadikan unggulan" : "Unit dihapus dari unggulan" };
  } catch (error) {
    return fail(`toggleFeatured(${id})`, error);
  }
}

/**
 * Duplikat unit sebagai draft: nama "… (salinan)", slug unik, tidak tampil dan bukan unggulan,
 * foto yang sama (path dipakai bersama; storage-cleanup tidak menghapus file yang masih dipakai),
 * fasilitas kamar ikut disalin. Mengembalikan id unit baru untuk dibuka di form ubah.
 */
export async function duplicateUnit(input: unknown): Promise<DuplicateResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = idInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const { id } = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const { data: source, error: readError } = await supabase
      .from("units")
      .select("*, unit_amenities(amenity_id)")
      .eq("id", id)
      .maybeSingle();
    if (readError) return fail(`duplicateUnit(${id}) read`, readError);
    if (!source) return { ok: false, error: NOT_FOUND };
    const unit = source as typeof source & { unit_amenities: { amenity_id: number }[] | null };

    const taken = await getTakenUnitSlugs(supabase);
    const now = nowIso();
    let newId: number | null = null;
    let newSlug = "";
    // Ulangi kalau slug bentrok dengan unit yang dibuat bersamaan (unique index).
    for (let attempt = 0; attempt < 3 && newId === null; attempt++) {
      newSlug = duplicateSlug(unit.slug, taken);
      const { data: created, error: insertError } = await supabase
        .from("units")
        .insert({
          location_id: unit.location_id,
          room_type_id: unit.room_type_id,
          room_type: unit.room_type,
          name: duplicateName(unit.name),
          slug: newSlug,
          tower: unit.tower,
          floor_number: unit.floor_number,
          view_type: unit.view_type,
          size_sqm: unit.size_sqm,
          max_guests: unit.max_guests,
          normal_price: unit.normal_price,
          promo_price: unit.promo_price,
          promo_badge: unit.promo_badge,
          is_promo_active: unit.is_promo_active,
          weekly_price: unit.weekly_price,
          monthly_price: unit.monthly_price,
          rental_period: unit.rental_period,
          description: unit.description,
          facilities_list: unit.facilities_list,
          youtube_video_url: unit.youtube_video_url,
          main_image: unit.main_image,
          gallery_images: unit.gallery_images,
          sort_order: unit.sort_order,
          is_available: unit.is_available,
          is_published: false,
          is_featured: false,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();
      if (!insertError && created) {
        newId = created.id;
      } else if (insertError?.code === "23505") {
        taken.push(newSlug);
      } else {
        return fail(`duplicateUnit(${id}) insert`, insertError);
      }
    }
    if (newId === null) return { ok: false, error: "Slug salinan bentrok. Coba duplikat lagi." };

    const amenityIds = [...new Set((unit.unit_amenities ?? []).map((a) => a.amenity_id))];
    if (amenityIds.length) {
      const { error: amenityError } = await supabase
        .from("unit_amenities")
        .insert(amenityIds.map((amenityId) => ({ unit_id: newId, amenity_id: amenityId })));
      if (amenityError) {
        // Batalkan salinan supaya tidak ada draft setengah jadi (foto dipakai bersama, jadi tidak dihapus).
        await supabase.from("units").delete().eq("id", newId);
        return fail(`duplicateUnit(${id}) amenities`, amenityError);
      }
    }

    invalidate({ kind: "unit", slugs: [newSlug] });
    return { ok: true, message: "Salinan dibuat sebagai draft", data: { id: newId } };
  } catch (error) {
    return fail(`duplicateUnit(${id})`, error);
  }
}

/** Hapus unit beserta fotonya di Storage (kecuali foto yang masih dipakai unit lain, mis. hasil duplikat). */
export async function deleteUnit(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = idInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const { id } = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const { data, error } = await supabase
      .from("units")
      .delete()
      .eq("id", id)
      .select("slug, main_image, gallery_images")
      .maybeSingle();
    if (error) return fail(`deleteUnit(${id})`, error, "Unit gagal dihapus. Coba lagi.");
    if (!data) return { ok: false, error: NOT_FOUND };

    // Unit sudah terhapus, jadi pengecekan "masih dipakai" hanya melihat unit lain.
    // Kegagalan hapus file tidak membatalkan hapus unit.
    try {
      await deleteUnusedUnitPhotos(supabase, [data.main_image, ...parseGallery(data.gallery_images)].filter(
        (path): path is string => Boolean(path),
      ));
    } catch (cleanupError) {
      console.error(`[units-list] deleteUnit(${id}) storage cleanup:`, cleanupError);
    }

    invalidate({ kind: "unit", slugs: [data.slug] });
    return { ok: true, message: "Unit dihapus" };
  } catch (error) {
    return fail(`deleteUnit(${id})`, error, "Unit gagal dihapus. Coba lagi.");
  }
}

/** Aksi massal dari mode "Pilih". */
export async function bulkUpdateUnits(input: unknown): Promise<BulkResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? INVALID };
  }
  const { action, roomTypeId } = parsed.data;
  const ids = [...new Set(parsed.data.ids)];
  const supabase = auth.session.supabase;

  try {
    const { data: units, error: readError } = await supabase
      .from("units")
      .select("id, slug, location_id, normal_price, promo_price")
      .in("id", ids);
    if (readError) return fail(`bulkUpdateUnits(${action}) read`, readError);
    if (!units?.length) return { ok: false, error: "Unit yang dipilih tidak ditemukan. Muat ulang halaman." };

    let targets = units;
    let typeName: string | undefined;
    const changes: {
      is_available?: boolean;
      is_promo_active?: boolean;
      is_published?: boolean;
      room_type_id?: number;
      room_type?: string;
    } = {};

    switch (action) {
      case "tersedia":
      case "penuh":
        changes.is_available = action === "tersedia";
        break;
      case "promo-on":
        targets = units.filter((u) =>
          isPromoEligible({ normalPrice: Number(u.normal_price), promoPrice: Number(u.promo_price) }),
        );
        if (!targets.length) {
          return {
            ok: false,
            error: "Tidak ada unit yang bisa diberi promo. Isi harga promo yang lebih murah dari harga normal dulu.",
          };
        }
        changes.is_promo_active = true;
        break;
      case "promo-off":
        changes.is_promo_active = false;
        break;
      case "tampil":
      case "sembunyi":
        changes.is_published = action === "tampil";
        break;
      case "ubah-tipe": {
        if (!roomTypeId) return { ok: false, error: "Pilih tipe kamar.", fieldErrors: { roomTypeId: "Pilih tipe kamar." } };
        const { data: type, error: typeError } = await supabase
          .from("room_types")
          .select("id, name, location_id")
          .eq("id", roomTypeId)
          .maybeSingle();
        if (typeError) return fail(`bulkUpdateUnits(ubah-tipe) type`, typeError);
        if (!type) return { ok: false, error: "Tipe kamar tidak ditemukan. Muat ulang halaman." };
        if (units.some((u) => u.location_id !== type.location_id)) {
          return { ok: false, error: "Tipe kamar ini bukan milik apartemen semua unit yang dipilih." };
        }
        changes.room_type_id = type.id;
        changes.room_type = type.name; // kolom lama tetap diisi untuk kompatibilitas
        typeName = type.name;
        break;
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("units")
      .update({ ...changes, updated_at: nowIso() })
      .in(
        "id",
        targets.map((u) => u.id),
      )
      .select("slug");
    if (updateError) return fail(`bulkUpdateUnits(${action}) update`, updateError);

    const count = updated?.length ?? 0;
    const skipped = ids.length - count;
    invalidate({ kind: "unit", slugs: (updated ?? []).map((u) => u.slug) });
    return { ok: true, message: bulkMessage(action, count, skipped, typeName), data: { updated: count, skipped } };
  } catch (error) {
    return fail(`bulkUpdateUnits(${action})`, error);
  }
}
