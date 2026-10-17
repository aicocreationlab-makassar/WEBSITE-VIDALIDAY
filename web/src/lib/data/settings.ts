import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { mapSettings } from "@/lib/data/mappers";
import { createPublicClient } from "@/lib/supabase/public";
import type { SiteSettings } from "@/types/settings";

/** Semua setting sebagai satu objek bertipe, dengan nilai bawaan untuk kunci yang kosong. */
export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.settings);

  const { data, error } = await createPublicClient().from("settings").select("key, value");
  if (error) throw new Error(`getSettings: ${error.message}`);
  return mapSettings(data ?? []);
}

/** updated_at terbaru tabel settings (lastModified /about di sitemap); null kalau kosong/gagal. */
export async function getSettingsUpdatedAt(): Promise<string | null> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.settings);

  const { data, error } = await createPublicClient()
    .from("settings")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.updated_at ?? null;
}
