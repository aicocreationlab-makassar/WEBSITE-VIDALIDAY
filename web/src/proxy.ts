import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rute admin yang boleh dibuka tanpa sesi.
const OPEN_ADMIN_PATHS = ["/admin/login", "/admin/lupa-password", "/admin/atur-password", "/admin/auth"];

function isOpenPath(pathname: string): boolean {
  return OPEN_ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function redirectToLogin(request: NextRequest, carry?: NextResponse): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  const redirect = NextResponse.redirect(url);
  // Bawa cookie sesi yang baru disegarkan supaya tidak hilang di redirect.
  carry?.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

/**
 * Lapis pertama perlindungan admin: segarkan sesi dan alihkan ke login bila belum masuk.
 * Bukan satu-satunya lapis: layout, setiap halaman, dan setiap Server Action memanggil requireAdmin().
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const open = isOpenPath(request.nextUrl.pathname);

  // Tanpa env: tolak akses (fail closed), kecuali halaman login.
  if (!url || !key) return open ? NextResponse.next() : redirectToLogin(request);

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [header, value] of Object.entries(headers ?? {})) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // Jangan menaruh kode lain di antara createServerClient dan getClaims.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && !open) return redirectToLogin(request, response);
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
