import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { getListedLocations } from "@/lib/data/locations";
import { getSettings } from "@/lib/data/settings";
import { hasSupabaseEnv } from "@/lib/env";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import type { SiteSettings } from "@/types/settings";

/** Apartemen untuk menu header/footer: aktif dan punya minimal satu unit published. */
export type NavLocation = {
  slug: string;
  name: string;
  shortName: string;
};

/** Data bingkai situs publik (header, pengumuman, footer, tombol WA). */
export type SiteChrome = {
  settings: SiteSettings;
  locations: NavLocation[];
};

/**
 * Tahun hak cipta. Cache terpisah berumur harian supaya tidak ikut membeku di cache 'max'
 * milik getSiteChrome (yang hanya diperbarui saat admin mengubah data).
 */
export async function getCopyrightYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function getSiteChrome(): Promise<SiteChrome> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.settings, TAGS.locations, TAGS.units);
  // Tanpa env (sebelum .env.local diisi) bingkai tetap tampil dengan nilai bawaan.
  // Data utama (unit, apartemen) tetap gagal keras di fungsi masing-masing.
  if (!hasSupabaseEnv()) {
    return { settings: DEFAULT_SETTINGS, locations: [] };
  }
  const [settings, locations] = await Promise.all([getSettings(), getListedLocations()]);
  return {
    settings,
    locations: locations.map((l) => ({ slug: l.slug, name: l.name, shortName: l.shortName })),
  };
}
