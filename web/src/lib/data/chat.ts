import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { EMPTY_KNOWLEDGE, type ChatKnowledge } from "@/lib/chat/types";
import { settingsSubset, toChatKnowledge } from "@/lib/chat/knowledge";
import { getCatalog } from "@/lib/data/catalog";
import { getAmenities, getFacilities, getFaqs, getLandmarks } from "@/lib/data/content";
import { getListedLocations } from "@/lib/data/locations";
import { getSettings } from "@/lib/data/settings";
import { hasSupabaseEnv } from "@/lib/env";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";

/**
 * Pengetahuan bot chat: irisan katalog + konten publik. Cache "max" dengan semua tag konten, jadi
 * kedaluwarsa bersamaan dengan halaman saat admin menyimpan (invalidate()). Tidak memakai
 * getPopularity() (cacheLife "hours" tidak boleh di dalam cache "max"); urutan chat = tersedia → termurah.
 */
export async function getChatKnowledge(): Promise<ChatKnowledge> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.units, TAGS.locations, TAGS.amenities, TAGS.facilities, TAGS.landmarks, TAGS.faqs, TAGS.settings);

  if (!hasSupabaseEnv()) return { ...EMPTY_KNOWLEDGE, settings: settingsSubset(DEFAULT_SETTINGS) };

  const [catalog, locations, amenities, facilities, landmarks, faqs, settings] = await Promise.all([
    getCatalog(),
    getListedLocations(),
    getAmenities(),
    getFacilities(),
    getLandmarks(),
    getFaqs(),
    getSettings(),
  ]);
  return toChatKnowledge({ catalog, locations, amenities, facilities, landmarks, faqs, settings });
}
