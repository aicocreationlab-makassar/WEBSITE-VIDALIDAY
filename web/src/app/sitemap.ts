import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/data/catalog";
import { getFacilities } from "@/lib/data/content";
import { getListedLocations } from "@/lib/data/locations";
import { getSettingsUpdatedAt } from "@/lib/data/settings";
import { getSiteUrl } from "@/lib/env";
import { buildSitemap } from "@/lib/seo/sitemap-model";

/**
 * sitemap.xml (PRD 6.9): beranda, /sewa, profil apartemen, landing tipe kamar, semua unit published,
 * /about, /kebijakan-privasi, dengan gambar per URL. lastModified hanya dari kolom updated_at data,
 * supaya hasilnya statis dan ikut kedaluwarsa bersama tag cache.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [catalog, locations, facilities, settingsUpdatedAt] = await Promise.all([
    getCatalog(),
    getListedLocations(),
    getFacilities(),
    getSettingsUpdatedAt(),
  ]);
  return buildSitemap({ base: getSiteUrl(), catalog, locations, facilities, settingsUpdatedAt });
}
