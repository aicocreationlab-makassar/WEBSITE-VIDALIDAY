import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { mapAmenity, mapFacility, mapFaq, mapLandmark, type AmenityRow } from "@/lib/data/mappers";
import { createPublicClient } from "@/lib/supabase/public";
import type { Amenity, Facility, Faq, Landmark } from "@/types/domain";

export async function getFaqs(): Promise<Faq[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.faqs);
  const { data, error } = await createPublicClient()
    .from("faqs")
    .select("id, question, answer, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`getFaqs: ${error.message}`);
  return (data ?? []).map(mapFaq);
}

/** Landmark aktif semua apartemen, urut sort_order. Saring per apartemen di pemanggil. */
export async function getLandmarks(): Promise<Landmark[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.landmarks);
  const { data, error } = await createPublicClient()
    .from("landmarks")
    .select("id, location_id, name, distance_time, notes, icon, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`getLandmarks: ${error.message}`);
  return (data ?? []).map(mapLandmark);
}

/**
 * Fasilitas gedung. Memakai select("*") supaya tetap jalan sebelum migrasi 0003
 * (kolom sort_order/is_active belum ada); penyaringan aktif dilakukan di aplikasi.
 */
export async function getFacilities(): Promise<Facility[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.facilities);
  const { data, error } = await createPublicClient().from("facilities").select("*").order("id", { ascending: true });
  if (error) throw new Error(`getFacilities: ${error.message}`);
  return (data ?? [])
    .filter((row) => (row as { is_active?: boolean }).is_active !== false)
    .map(mapFacility)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

/** Fasilitas kamar aktif (untuk chip filter). */
export async function getAmenities(): Promise<Amenity[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.amenities);
  const { data, error } = await createPublicClient()
    .from("amenities")
    .select("id, name, icon, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .overrideTypes<AmenityRow[], { merge: false }>();
  if (error) throw new Error(`getAmenities: ${error.message}`);
  return (data ?? []).map(mapAmenity);
}
