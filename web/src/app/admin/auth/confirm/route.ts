import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminStatus } from "@/lib/auth/require-admin";
import { hasSupabaseEnv } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

// Tujuan link email Supabase Auth (atur ulang kata sandi / undangan admin).
// Mendukung dua bentuk link:
//   1. ?token_hash=...&type=recovery&next=/admin/atur-password  (template email kustom, lihat PROGRESS)
//   2. ?code=...&next=...                                       (template bawaan, alur PKCE, browser yang sama)
// Setelah sesi terbentuk, akses admin dicek lagi (getClaims + tabel `admins`); bukan admin → sesi diakhiri.

const ALLOWED_TYPES: readonly EmailOtpType[] = ["recovery", "invite"];
const DEFAULT_NEXT = "/admin/atur-password";
const FAILED = "/admin/lupa-password?gagal=1";

function isAllowedType(value: string | null): value is EmailOtpType {
  return value !== null && (ALLOWED_TYPES as readonly string[]).includes(value);
}

/** Hanya path internal di bawah /admin (tolak host lain, "//", dan backslash). */
function safeNext(raw: string | null, origin: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return DEFAULT_NEXT;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return DEFAULT_NEXT;
    if (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/")) return DEFAULT_NEXT;
    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_NEXT;
  }
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.nextUrl.origin));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv()) return redirectTo(request, FAILED);

  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");
  const next = safeNext(params.get("next"), request.nextUrl.origin);

  let supabase: Awaited<ReturnType<typeof createServerSupabase>>;
  try {
    supabase = await createServerSupabase();
  } catch {
    return redirectTo(request, FAILED);
  }

  let verified = false;
  if (tokenHash && isAllowedType(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    // Hanya kode galat yang dicatat; token tidak pernah dicatat.
    if (error) console.error("[admin/auth/confirm] verifyOtp gagal", { code: error.code, status: error.status });
    verified = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("[admin/auth/confirm] exchangeCode gagal", { code: error.code, status: error.status });
    verified = !error;
  }
  if (!verified) return redirectTo(request, FAILED);

  // Lapis cek admin: hanya user di tabel `admins` yang boleh melanjutkan.
  const access = await getAdminStatus();
  if (access.status === "ok") return redirectTo(request, next);

  await supabase.auth.signOut({ scope: "local" });
  return redirectTo(request, access.status === "forbidden" ? "/admin/login?akses=ditolak" : FAILED);
}
