import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { mapCatalogUnit, mapUnitDetail, type UnitDetailRow, type UnitRow } from "@/lib/data/mappers";
import { toSearchIndex } from "@/lib/search-index";
import { createPublicClient } from "@/lib/supabase/public";
import type { CatalogUnit, SearchIndexRow, UnitDetail } from "@/types/domain";

// Unit published dari apartemen aktif. RLS anon sudah menyembunyikan unit draft,
// apartemen nonaktif (via !inner), tipe kamar nonaktif, dan fasilitas nonaktif.
const UNIT_FIELDS = `id, slug, name, location_id, room_type_id, tower, floor_number, view_type, size_sqm,
  max_guests, normal_price, promo_price, is_promo_active, promo_badge, effective_price, weekly_price,
  monthly_price, is_featured, is_available, sort_order, main_image, gallery_images, created_at, updated_at,
  room_type:room_types(id, slug, name, category, is_active),
  unit_amenities(amenity:amenities(id, name, icon, sort_order, is_active))`;

const CATALOG_SELECT = `${UNIT_FIELDS},
  location:locations!inner(id, slug, name, short_name, area, is_active)`;

const DETAIL_SELECT = `${UNIT_FIELDS}, description, youtube_video_url,
  location:locations!inner(id, slug, name, short_name, area, address, gmaps_url, latitude, longitude, tagline, is_active)`;

/** Semua unit published (±50 baris). Melempar error kalau Supabase gagal, supaya data kosong tidak ikut di-cache. */
export async function getCatalog(): Promise<CatalogUnit[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.units, TAGS.locations, TAGS.amenities);

  const { data, error } = await createPublicClient()
    .from("units")
    .select(CATALOG_SELECT)
    .eq("is_published", true)
    .eq("location.is_active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<UnitRow[], { merge: false }>();
  if (error) throw new Error(`getCatalog: ${error.message}`);

  return (data ?? []).map(mapCatalogUnit).filter((unit): unit is CatalogUnit => unit !== null);
}

/** Indeks ringkas untuk menghitung jumlah unit di klien (hero, budget, sheet filter). */
export async function getSearchIndex(): Promise<SearchIndexRow[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.units, TAGS.locations, TAGS.amenities);
  return toSearchIndex(await getCatalog());
}

/** Detail unit; null kalau slug tidak ada atau unit draft (→ 404). */
export async function getUnitBySlug(slug: string): Promise<UnitDetail | null> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.units, TAGS.unit(slug), TAGS.locations, TAGS.amenities);

  const { data, error } = await createPublicClient()
    .from("units")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("location.is_active", true)
    .maybeSingle()
    .overrideTypes<UnitDetailRow | null, { merge: false }>();
  if (error) throw new Error(`getUnitBySlug(${slug}): ${error.message}`);
  return data ? mapUnitDetail(data) : null;
}
