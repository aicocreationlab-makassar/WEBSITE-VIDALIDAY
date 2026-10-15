"use server";

import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { loginFieldErrors, loginSchema, type LoginField } from "@/lib/validation/auth";

export type SignInState =
  | { ok: false; error: string; fieldErrors?: Partial<Record<LoginField, string>> }
  | { ok: true };

const MSG_CONFIG = "Konfigurasi server belum lengkap. Hubungi pengelola situs.";
const MSG_INVALID_INPUT = "Periksa lagi isian di bawah.";
const MSG_WRONG_CREDENTIALS = "Email atau kata sandi salah.";
const MSG_NOT_ADMIN = "Akun ini tidak punya akses admin.";
const MSG_RATE_LIMIT = "Terlalu banyak percobaan masuk. Tunggu beberapa menit, lalu coba lagi.";
const MSG_NETWORK = "Gagal terhubung ke server. Coba lagi sebentar lagi.";
const MSG_CHECK_FAILED = "Gagal memeriksa akses admin. Coba lagi sebentar lagi.";

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>;

/**
 * Masuk admin: validasi zod di server, Supabase Auth (email + kata sandi), lalu cek baris `admins`.
 * User yang bukan admin langsung dikeluarkan lagi. Kata sandi tidak pernah dicatat ke log.
 */
export async function signIn(_prevState: SignInState | null, formData: FormData): Promise<SignInState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: MSG_INVALID_INPUT, fieldErrors: loginFieldErrors(parsed.error) };
  }

  if (!hasSupabaseEnv()) return { ok: false, error: MSG_CONFIG };

  let supabase: ServerSupabase;
  try {
    supabase = await createServerSupabase();
  } catch {
    return { ok: false, error: MSG_CONFIG };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    const status = error?.status;
    if (status === 429) return { ok: false, error: MSG_RATE_LIMIT };
    if (status === undefined || status === 0 || status >= 500) {
      // Hanya kode dan status yang dicatat; tidak ada email atau kata sandi.
      console.error("[admin/signIn] auth gagal", { code: error?.code, status });
      return { ok: false, error: MSG_NETWORK };
    }
    return { ok: false, error: MSG_WRONG_CREDENTIALS };
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    // Gagal tertutup: sesi dihapus lagi kalau akses tidak bisa dipastikan.
    await supabase.auth.signOut({ scope: "local" });
    if (adminError) {
      console.error("[admin/signIn] cek admins gagal", { code: adminError.code });
      return { ok: false, error: MSG_CHECK_FAILED };
    }
    return { ok: false, error: MSG_NOT_ADMIN };
  }

  redirect("/admin");
}

/** Keluar dari sesi perangkat ini, lalu kembali ke halaman masuk. */
export async function signOut(): Promise<void> {
  if (hasSupabaseEnv()) {
    try {
      const supabase = await createServerSupabase();
      // `local`: hanya sesi di perangkat ini. Sesi lokal tetap dihapus walau API gagal.
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("[admin/signOut] gagal", { name: error instanceof Error ? error.name : "unknown" });
    }
  }
  redirect("/admin/login");
}
