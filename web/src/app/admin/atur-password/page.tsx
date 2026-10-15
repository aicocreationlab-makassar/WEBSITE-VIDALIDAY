import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/admin/login/auth-card";
import { FormAlert } from "@/components/admin/login/form-alert";
import { UpdatePasswordForm } from "@/components/admin/login/update-password-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminStatus } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: "Atur kata sandi admin",
  robots: { index: false, follow: false },
};

// Dibuka dari link email (lewat /admin/auth/confirm yang membuat sesi pemulihan).
// Cangkang statis; cek sesi membaca cookie, jadi berada di balik Suspense.
export default function AdminSetPasswordPage() {
  return (
    <AuthCard title="Atur kata sandi baru" description="Buat kata sandi baru untuk masuk ke panel admin.">
      <Suspense fallback={<FormSkeleton />}>
        <PasswordGate />
      </Suspense>
    </AuthCard>
  );
}

/** Form hanya untuk sesi admin yang sah (getClaims + tabel `admins`); selain itu arahkan minta link baru. */
async function PasswordGate() {
  const access = await getAdminStatus();

  if (access.status === "ok") return <UpdatePasswordForm email={access.session.email} />;

  if (access.status === "forbidden") {
    return (
      <div className="space-y-5">
        <FormAlert>Akun ini tidak punya akses admin.</FormAlert>
        <Button asChild variant="secondary" size="lg" className="w-full">
          <Link href="/admin/login">Masuk dengan akun lain</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FormAlert>Link atur ulang sudah tidak berlaku, atau halaman ini tidak dibuka dari link di email.</FormAlert>
      <Button asChild size="lg" className="w-full">
        <Link href="/admin/lupa-password">Minta link baru</Link>
      </Button>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-[52px] w-full" />
    </div>
  );
}
