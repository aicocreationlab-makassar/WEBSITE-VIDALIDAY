import "server-only";
import { cacheLife, cacheTag } from "next/cache";
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
  /** Tahun untuk hak cipta, dihitung di dalam cache (render tidak boleh memanggil new Date()). */
  year: number;
};

/**
 * KONTRAK FASE 1: mengembalikan nilai bawaan.
 * Fase 2 mengganti isinya dengan getSettings() + getNavLocations() dari Supabase,
 * tanpa mengubah tanda tangan fungsi ini.
 */
export async function getSiteChrome(): Promise<SiteChrome> {
  "use cache";
  cacheLife("days");
  cacheTag("settings", "locations");
  return {
    settings: DEFAULT_SETTINGS,
    locations: [
      { slug: "vida-view", name: "Apartemen Vida View", shortName: "Vida View" },
      { slug: "delft-cpi", name: "Apartemen Delft CPI", shortName: "Delft CPI" },
    ],
    year: new Date().getFullYear(),
  };
}
