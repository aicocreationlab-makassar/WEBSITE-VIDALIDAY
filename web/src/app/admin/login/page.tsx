import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/admin/login/login-form";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Masuk admin",
  robots: { index: false, follow: false },
};

// Cangkang statis: tidak membaca cookie atau searchParams di server.
// Pesan `?akses=ditolak` dibaca di klien (AccessDeniedNotice, di dalam Suspense).
export default function AdminLoginPage() {
  return (
    <main id="konten" className="flex min-h-dvh flex-col bg-surface px-4 py-8 sm:p-6">
      <div className="m-auto w-full max-w-md">
        <div className="glass-card rounded-sheet p-6 sm:p-8">
          <div className="flex justify-center">
            <Logo size="lg" tone="admin" />
          </div>
          <div className="mt-6 text-center">
            <h1 className="text-h1 font-extrabold tracking-tight text-ink">Masuk ke panel admin</h1>
            <p className="mt-1.5 text-sm text-muted">Panel pengelola unit dan promo VIDALIDAY.</p>
          </div>
          <LoginForm className="mt-6" />
        </div>
        <div className="mt-4 flex justify-center">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold text-ink-2 transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali ke situs
          </Link>
        </div>
      </div>
    </main>
  );
}
