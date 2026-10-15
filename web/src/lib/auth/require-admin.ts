import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>;

export type AdminSession = {
  userId: string;
  email: string | null;
  supabase: ServerSupabase;
};

export type AdminStatus =
  | { status: "ok"; session: AdminSession }
  | { status: "anon" }
  | { status: "forbidden" };

/**
 * Verifikasi di server: klaim JWT (getClaims, bukan getSession) + baris di tabel `admins`.
 * Di-cache per request dengan React `cache()`.
 */
export const getAdminStatus = cache(async (): Promise<AdminStatus> => {
  if (!hasSupabaseEnv()) return { status: "anon" };
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { status: "anon" };

  const { data: row, error: adminError } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (adminError || !row) return { status: "forbidden" };

  const email = typeof claims.email === "string" ? claims.email : null;
  return { status: "ok", session: { userId: claims.sub, email, supabase } };
});

/** Untuk layout/halaman admin: alihkan ke login kalau bukan admin. */
export async function requireAdmin(): Promise<AdminSession> {
  const result = await getAdminStatus();
  if (result.status === "ok") return result.session;
  redirect(result.status === "forbidden" ? "/admin/login?akses=ditolak" : "/admin/login");
}
