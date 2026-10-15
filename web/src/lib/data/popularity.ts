import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { mapPopularity } from "@/lib/data/mappers";
import { createPublicClient } from "@/lib/supabase/public";
import type { Popularity } from "@/types/domain";

/**
 * Jumlah permintaan sewa per unit 30 hari terakhir (RPC unit_popularity, tanpa data pribadi).
 * cacheLife "hours": panggil langsung dari halaman, JANGAN dari dalam fungsi "use cache" lain
 * (umur cache luar akan menimpa umur ini).
 */
async function fetchPopularity(): Promise<Popularity> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.popularity);
  const { data, error } = await createPublicClient().rpc("unit_popularity", { p_days: 30 });
  if (error) throw new Error(`getPopularity: ${error.message}`);
  return mapPopularity(data);
}

/** Popularitas tidak kritis: kalau gagal, urutan tetap jalan tanpa sinyal ini. */
export async function getPopularity(): Promise<Popularity> {
  try {
    return await fetchPopularity();
  } catch {
    return {};
  }
}
