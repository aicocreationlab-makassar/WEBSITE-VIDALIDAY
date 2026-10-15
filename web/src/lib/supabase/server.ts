import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/** Klien dengan sesi cookie user, untuk halaman dan Server Action admin. Jangan dipakai di `"use cache"`. */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Dipanggil dari Server Component (cookie hanya bisa ditulis di Action/Route Handler).
          // Penyegaran sesi sudah ditangani proxy.ts.
        }
      },
    },
  });
}
