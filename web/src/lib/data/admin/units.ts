import "server-only";
import { healthFlags } from "@/lib/admin/data-health";
import type { AdminUnitRow } from "@/lib/admin/unit-query";
import type { AdminSession } from "@/lib/auth/require-admin";
import { isStockPhoto, mediaUrl, parseGallery } from "@/lib/media";
import { effectivePrice } from "@/lib/pricing";
import type { UnitInput } from "@/lib/validation/admin";

// Data admin: TIDAK di-cache (selalu terbaru), dibaca dengan sesi admin (RLS is_admin).

type Supabase = AdminSession["supabase"];

export type AdminLocationOption = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  isActive: boolean;
  sortOrder: number;
  roomTypes: {
    id: number;
    name: string;
    slug: string;
    category: string;
    defaultMaxGuests: number | null;
    isActive: boolean;
    sortOrder: number;
  }[];
};

export type AdminAmenityOption = { id: number; name: string; icon: string; isActive: boolean; sortOrder: number };

/** Apartemen (termasuk nonaktif) + tipe kamarnya, dan fasilitas kamar, untuk filter dan form. */
export async function getAdminLookups(supabase: Supabase): Promise<{
  locations: AdminLocationOption[];
  amenities: AdminAmenityOption[];
}> {
  const [locations, amenities] = await Promise.all([
    supabase
      .from("locations")
      .select("id, slug, name, short_name, is_active, sort_order, room_types(id, name, slug, category, default_max_guests, is_active, sort_order)")
      .order("sort_order")
      .order("id"),
    supabase.from("amenities").select("id, name, icon, is_active, sort_order").order("sort_order").order("name"),
  ]);
  if (locations.error) throw new Error(`getAdminLookups(locations): ${locations.error.message}`);
  if (amenities.error) throw new Error(`getAdminLookups(amenities): ${amenities.error.message}`);

  return {
    locations: (locations.data ?? []).map((l) => ({
      id: l.id,
      slug: l.slug,
      name: l.name,
      shortName: l.short_name ?? l.name,
      isActive: l.is_active,
      sortOrder: l.sort_order,
      roomTypes: [...(l.room_types ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
        .map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          category: t.category,
          defaultMaxGuests: t.default_max_guests,
          isActive: t.is_active,
          sortOrder: t.sort_order,
        })),
    })),
    amenities: (amenities.data ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      isActive: a.is_active,
      sortOrder: a.sort_order,
    })),
  };
}

/** Semua unit untuk daftar admin (dicari/difilter di memori oleh lib/admin/unit-query). */
export async function getAdminUnitRows(supabase: Supabase): Promise<AdminUnitRow[]> {
  const { data, error } = await supabase
    .from("units")
    .select(
      `id, name, slug, tower, floor_number, location_id, room_type_id, max_guests, normal_price, promo_price,
       is_promo_active, promo_badge, effective_price, is_published, is_available, is_featured, main_image,
       gallery_images, rental_period, updated_at,
       location:locations(short_name, name),
       room_type:room_types(name, default_max_guests)`,
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`getAdminUnitRows: ${error.message}`);

  type Row = NonNullable<typeof data>[number] & {
    location: { short_name: string | null; name: string } | null;
    room_type: { name: string; default_max_guests: number | null } | null;
  };

  return ((data ?? []) as Row[]).map((u) => {
    const cover = [u.main_image, ...parseGallery(u.gallery_images)].find((p) => p && !isStockPhoto(p)) ?? null;
    const prices = { normal_price: Number(u.normal_price), promo_price: Number(u.promo_price), is_promo_active: u.is_promo_active };
    return {
      id: u.id,
      name: u.name,
      slug: u.slug,
      tower: u.tower,
      floorNumber: u.floor_number,
      locationId: u.location_id,
      locationShortName: u.location?.short_name ?? u.location?.name ?? "-",
      roomTypeId: u.room_type_id,
      roomTypeName: u.room_type?.name ?? null,
      maxGuests: u.max_guests,
      normalPrice: prices.normal_price,
      promoPrice: prices.promo_price,
      isPromoActive: u.is_promo_active,
      promoBadge: u.promo_badge,
      effectivePrice: u.effective_price != null ? Number(u.effective_price) : effectivePrice(prices),
      isPublished: u.is_published,
      isAvailable: u.is_available,
      isFeatured: u.is_featured,
      coverUrl: cover ? mediaUrl(cover) : null,
      updatedAt: u.updated_at,
      flags: healthFlags(
        {
          tower: u.tower,
          floor_number: u.floor_number,
          max_guests: u.max_guests,
          promo_badge: u.promo_badge,
          is_promo_active: u.is_promo_active,
          promo_price: prices.promo_price,
          normal_price: prices.normal_price,
          main_image: u.main_image,
          gallery_images: u.gallery_images,
          rental_period: u.rental_period,
          room_type_id: u.room_type_id,
        },
        u.room_type?.default_max_guests ?? null,
      ),
    };
  });
}

export type AdminUnitEdit = {
  id: number;
  slug: string;
  updatedAt: string;
  isPublished: boolean;
  /** Nilai awal form (UnitInput). */
  values: UnitInput;
  /** Label promo lama yang lebih dari 24 karakter (ditampilkan sebagai catatan). */
  legacyBadge: string | null;
};

/** Data form ubah unit; null kalau tidak ada. */
export async function getAdminUnit(supabase: Supabase, id: number): Promise<AdminUnitEdit | null> {
  const { data, error } = await supabase
    .from("units")
    .select("*, unit_amenities(amenity_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getAdminUnit(${id}): ${error.message}`);
  if (!data) return null;
  const row = data as typeof data & { unit_amenities: { amenity_id: number }[] | null };
  const photos = [row.main_image, ...parseGallery(row.gallery_images)].filter(
    (p): p is string => Boolean(p && p.trim() && !isStockPhoto(p)),
  );
  const badge = row.promo_badge?.trim() || "";
  return {
    id: row.id,
    slug: row.slug,
    updatedAt: row.updated_at,
    isPublished: row.is_published,
    legacyBadge: badge.length > 24 ? badge : null,
    values: {
      locationId: row.location_id,
      roomTypeId: row.room_type_id ?? 0,
      name: row.name,
      slug: row.slug,
      tower: row.tower ?? "",
      floorNumber: row.floor_number,
      viewType: row.view_type ?? "",
      sizeSqm: row.size_sqm != null ? Number(row.size_sqm) : null,
      maxGuests: row.max_guests,
      normalPrice: Number(row.normal_price),
      promoPrice: Number(row.promo_price) || null,
      isPromoActive: row.is_promo_active,
      promoBadge: badge.length > 24 ? "" : badge,
      weeklyPrice: row.weekly_price != null ? Number(row.weekly_price) : null,
      monthlyPrice: row.monthly_price != null ? Number(row.monthly_price) : null,
      amenityIds: (row.unit_amenities ?? []).map((a) => a.amenity_id),
      photos: [...new Set(photos)],
      youtubeUrl: row.youtube_video_url ?? "",
      description: row.description ?? "",
      isPublished: row.is_published,
      isAvailable: row.is_available,
      isFeatured: row.is_featured,
    },
  };
}

/** Slug yang sudah dipakai (untuk slug unik). */
export async function getTakenUnitSlugs(supabase: Supabase, exceptId?: number): Promise<string[]> {
  let query = supabase.from("units").select("slug");
  if (exceptId) query = query.neq("id", exceptId);
  const { data, error } = await query;
  if (error) throw new Error(`getTakenUnitSlugs: ${error.message}`);
  return (data ?? []).map((r) => r.slug);
}
