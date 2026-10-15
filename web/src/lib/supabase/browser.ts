"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Klien browser (sesi admin dari cookie), dipakai untuk unggah foto langsung ke Storage. */
export function getBrowserSupabase() {
  if (!client) {
    const { url, key } = getSupabaseEnv();
    client = createBrowserClient<Database>(url, key);
  }
  return client;
}
