import "server-only";
import {
  toLocationCards,
  toLocationDetail,
  type AdminLocationCard,
  type AdminLocationDetail,
} from "@/components/admin/locations/location-model";
import type { AdminSession } from "@/lib/auth/require-admin";

// Data admin apartemen & tipe kamar (PRD 7.5): TIDAK di-cache (selalu terbaru), dibaca dengan sesi
// admin (RLS is_admin: termasuk apartemen/tipe nonaktif dan unit draft). Jumlah unit < 200, jadi
// dihitung di memori dari kolom ringkas, bukan embed count per baris.

type Supabase = AdminSession["supabase"];

/** Semua apartemen (termasuk nonaktif) + jumlah unit, unit tampil, dan tipe kamar. */
export async function getAdminLocationsList(supabase: Supabase): Promise<AdminLocationCard[]> {
  const [locations, units, roomTypes] = await Promise.all([
    supabase
      .from("locations")
      .select("id, slug, name, short_name, area, hero_image, sort_order, is_active")
      .order("sort_order")
      .order("id"),
    supabase.from("units").select("location_id, is_published"),
    supabase.from("room_types").select("location_id"),
  ]);
  if (locations.error) throw new Error(`getAdminLocationsList(locations): ${locations.error.code ?? locations.error.message}`);
  if (units.error) throw new Error(`getAdminLocationsList(units): ${units.error.code ?? units.error.message}`);
  if (roomTypes.error) throw new Error(`getAdminLocationsList(room_types): ${roomTypes.error.code ?? roomTypes.error.message}`);

  return toLocationCards(locations.data ?? [], units.data ?? [], roomTypes.data ?? []);
}

/** Data form ubah apartemen + tipe kamarnya (dengan jumlah unit per tipe); null kalau tidak ada. */
export async function getAdminLocation(supabase: Supabase, id: number): Promise<AdminLocationDetail | null> {
  const [location, roomTypes, units] = await Promise.all([
    supabase
      .from("locations")
      .select(
        "id, slug, name, short_name, area, hero_image, sort_order, is_active, address, gmaps_url, latitude, longitude, tagline, description",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("room_types")
      .select("id, location_id, name, slug, category, default_max_guests, sort_order, is_active")
      .eq("location_id", id)
      .order("sort_order")
      .order("id"),
    supabase.from("units").select("location_id, room_type_id, is_published").eq("location_id", id),
  ]);
  if (location.error) throw new Error(`getAdminLocation(${id}): ${location.error.code ?? location.error.message}`);
  if (roomTypes.error) throw new Error(`getAdminLocation(${id}) room_types: ${roomTypes.error.code ?? roomTypes.error.message}`);
  if (units.error) throw new Error(`getAdminLocation(${id}) units: ${units.error.code ?? units.error.message}`);
  if (!location.data) return null;

  return toLocationDetail(location.data, roomTypes.data ?? [], units.data ?? []);
}
