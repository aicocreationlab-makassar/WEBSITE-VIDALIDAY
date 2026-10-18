import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { getCatalog } from "@/lib/data/catalog";
import { getFacilities, getFaqs, getLandmarks } from "@/lib/data/content";
import { getListedLocations } from "@/lib/data/locations";
import { getSettings } from "@/lib/data/settings";
import { getSiteUrl } from "@/lib/env";
import { buildLlmsFullTxt, buildLlmsTxt, type LlmsInput } from "@/lib/seo/llms";

async function llmsInput(): Promise<LlmsInput> {
  const [settings, locations, catalog, facilities, landmarks, faqs] = await Promise.all([
    getSettings(),
    getListedLocations(),
    getCatalog(),
    getFacilities(),
    getLandmarks(),
    getFaqs(),
  ]);
  return { siteUrl: getSiteUrl(), settings, locations, catalog, facilities, landmarks, faqs };
}

/** /llms.txt: ringkasan situs untuk asisten AI; kedaluwarsa bersama semua tag konten. */
export async function getLlmsTxt(): Promise<string> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.units, TAGS.locations, TAGS.amenities, TAGS.facilities, TAGS.landmarks, TAGS.faqs, TAGS.settings);
  return buildLlmsTxt(await llmsInput());
}

/** /llms-full.txt: ringkasan + semua unit. */
export async function getLlmsFullTxt(): Promise<string> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.units, TAGS.locations, TAGS.amenities, TAGS.facilities, TAGS.landmarks, TAGS.faqs, TAGS.settings);
  return buildLlmsFullTxt(await llmsInput());
}
