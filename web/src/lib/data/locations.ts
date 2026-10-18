import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { getCatalog } from "@/lib/data/catalog";
import { mapLocations, type LocationRow } from "@/lib/data/mappers";
import { createPublicClient } from "@/lib/supabase/public";
import type { LocationWithTypes } from "@/types/domain";

/**
 * Apartemen aktif + tipe kamar aktif + jumlah unit dan harga terendah.
 * Termasuk apartemen tanpa unit; pemakai yang butuh "punya unit" memakai getListedLocations().
 */
export async function getLocations(): Promise<LocationWithTypes[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.locations, TAGS.units);

  const [{ data, error }, catalog] = await Promise.all([
    createPublicClient()
      .from("locations")
      // `*` supaya kolom baru (has_towers, migrasi 0004) ikut terbaca tanpa gagal sebelum migrasi dijalankan.
      .select(`*, room_types(id, slug, name, category, default_max_guests, sort_order, is_active)`)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .overrideTypes<LocationRow[], { merge: false }>(),
    getCatalog(),
  ]);
  if (error) throw new Error(`getLocations: ${error.message}`);
  return mapLocations(data ?? [], catalog);
}

/** Apartemen yang tampil di hero, menu, filter, dan sitemap: aktif dan punya minimal satu unit published (PRD 7.5). */
export async function getListedLocations(): Promise<LocationWithTypes[]> {
  return (await getLocations()).filter((location) => location.unitCount > 0);
}
