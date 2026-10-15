import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

const FETCH_TIMEOUT_MS = 10_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}

/**
 * Klien untuk data publik: publishable key, tanpa cookie dan tanpa sesi,
 * sehingga aman dipanggil di dalam fungsi `"use cache"`.
 * Buat di dalam fungsi yang di-cache; jangan dikirim sebagai argumen atau dikembalikan.
 */
export function createPublicClient() {
  const { url, key } = getSupabaseEnv();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
  });
}
