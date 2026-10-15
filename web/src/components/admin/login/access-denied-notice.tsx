"use client";

import { useSearchParams } from "next/navigation";
import { FormAlert } from "./form-alert";

/**
 * Pesan untuk `/admin/login?akses=ditolak` (dialihkan oleh requireAdmin).
 * Membaca search params di klien supaya halaman login tetap statis; wajib di dalam <Suspense>.
 */
export function AccessDeniedNotice({ hidden = false }: { hidden?: boolean }) {
  const searchParams = useSearchParams();
  if (hidden || searchParams.get("akses") !== "ditolak") return null;
  return <FormAlert>Akun ini tidak punya akses admin.</FormAlert>;
}
