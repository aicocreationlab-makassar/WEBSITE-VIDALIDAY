import type { Metadata } from "next";
import { AuthCard } from "@/components/admin/login/auth-card";
import { ResetRequestForm } from "@/components/admin/login/reset-request-form";

export const metadata: Metadata = {
  title: "Lupa kata sandi admin",
  robots: { index: false, follow: false },
};

// Cangkang statis seperti halaman masuk. Pesan `?gagal=1` (link kedaluwarsa) dibaca di klien.
export default function AdminForgotPasswordPage() {
  return (
    <AuthCard
      title="Lupa kata sandi"
      description="Masukkan email admin. Kami kirim link untuk membuat kata sandi baru."
    >
      <ResetRequestForm />
    </AuthCard>
  );
}
