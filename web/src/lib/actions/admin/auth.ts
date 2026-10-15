"use server";

import { redirect } from "next/navigation";
import {
  firstFieldErrors,
  newPasswordSchema,
  resetRequestSchema,
  type NewPasswordField,
  type ResetRequestField,
} from "@/components/admin/login/password-schema";
import { getAdminStatus } from "@/lib/auth/require-admin";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/env";
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

// ---------------------------------------------------------------------------
// Lupa / atur ulang kata sandi (PRD 7.1, P1)
// ---------------------------------------------------------------------------

export type ResetRequestState =
  | { ok: false; error: string; fieldErrors?: Partial<Record<ResetRequestField, string>> }
  | { ok: true };

export type UpdatePasswordState =
  | {
      ok: false;
      error: string;
      /** Sesi dari link email tidak ada/kedaluwarsa: tampilkan tautan minta link baru. */
      expired?: boolean;
      fieldErrors?: Partial<Record<NewPasswordField, string>>;
    }
  | { ok: true };

const MSG_RESET_LINK_EXPIRED = "Link atur ulang sudah tidak berlaku. Minta link baru, lalu buka link terbaru di email.";
const MSG_PASSWORD_SAME = "Kata sandi baru harus berbeda dari yang lama.";
const MSG_PASSWORD_WEAK = "Kata sandi terlalu mudah ditebak. Pakai gabungan huruf, angka, dan simbol.";
const MSG_PASSWORD_RATE_LIMIT = "Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.";
const MSG_PASSWORD_FAILED = "Kata sandi gagal disimpan. Coba lagi sebentar lagi.";

/**
 * Kirim email atur ulang kata sandi. Hasilnya selalu sama (kecuali isian salah atau server
 * tidak bisa dihubungi) supaya tidak membocorkan email mana yang terdaftar.
 * Link email mengarah ke /admin/auth/confirm, lalu ke /admin/atur-password.
 */
export async function requestPasswordReset(
  _prevState: ResetRequestState | null,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: MSG_INVALID_INPUT, fieldErrors: firstFieldErrors(parsed.error, ["email"] as const) };
  }

  if (!hasSupabaseEnv()) return { ok: false, error: MSG_CONFIG };

  let supabase: ServerSupabase;
  try {
    supabase = await createServerSupabase();
  } catch {
    return { ok: false, error: MSG_CONFIG };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email.trim().toLowerCase(), {
    redirectTo: `${getSiteUrl()}/admin/auth/confirm?next=/admin/atur-password`,
  });

  if (error) {
    const status = error.status;
    // Hanya kode dan status yang dicatat; tidak ada email.
    console.error("[admin/requestPasswordReset] gagal", { code: error.code, status });
    if (status === undefined || status === 0 || status >= 500) return { ok: false, error: MSG_NETWORK };
    // 4xx (termasuk batas kirim email per akun) tetap dijawab netral: tidak membocorkan akun.
  }
  return { ok: true };
}

/**
 * Simpan kata sandi baru untuk sesi dari link email. Bukan aksi panel biasa (tidak lewat
 * guardAdmin), tapi tetap memverifikasi sesi di server (getClaims) + baris `admins`.
 */
export async function updatePassword(
  _prevState: UpdatePasswordState | null,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: MSG_INVALID_INPUT,
      fieldErrors: firstFieldErrors(parsed.error, ["password", "confirm"] as const),
    };
  }

  if (!hasSupabaseEnv()) return { ok: false, error: MSG_CONFIG };

  const status = await getAdminStatus();
  if (status.status === "anon") return { ok: false, error: MSG_RESET_LINK_EXPIRED, expired: true };
  if (status.status === "forbidden") {
    // Gagal tertutup: user bukan admin tidak boleh memakai alur ini.
    try {
      const supabase = await createServerSupabase();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Sesi lokal tetap tidak dipakai; abaikan.
    }
    return { ok: false, error: MSG_NOT_ADMIN };
  }

  const { error } = await status.session.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const code = error.code;
    const httpStatus = error.status;
    if (code === "same_password") return { ok: false, error: MSG_INVALID_INPUT, fieldErrors: { password: MSG_PASSWORD_SAME } };
    if (code === "weak_password") return { ok: false, error: MSG_INVALID_INPUT, fieldErrors: { password: MSG_PASSWORD_WEAK } };
    if (httpStatus === 429) return { ok: false, error: MSG_PASSWORD_RATE_LIMIT };
    if (
      code === "session_not_found" ||
      code === "session_expired" ||
      code === "reauthentication_needed" ||
      httpStatus === 401 ||
      httpStatus === 403
    ) {
      return { ok: false, error: MSG_RESET_LINK_EXPIRED, expired: true };
    }
    // Hanya kode dan status yang dicatat; tidak pernah kata sandi.
    console.error("[admin/updatePassword] gagal", { code, status: httpStatus });
    if (httpStatus === undefined || httpStatus === 0 || httpStatus >= 500) return { ok: false, error: MSG_NETWORK };
    return { ok: false, error: MSG_PASSWORD_FAILED };
  }

  return { ok: true };
}
