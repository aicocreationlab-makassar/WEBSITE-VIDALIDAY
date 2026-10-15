import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminFrame } from "@/components/admin/layout/admin-frame";
import { AdminShellSkeleton } from "@/components/admin/layout/admin-shell-skeleton";

export const metadata: Metadata = {
  title: { template: "%s | Admin VIDALIDAY", default: "Admin VIDALIDAY" },
  robots: { index: false, follow: false },
};

// Cek sesi admin membaca cookie, jadi berada di balik Suspense; cangkang statisnya skeleton.
// Catatan: layout tidak dirender ulang saat pindah antarhalaman panel, jadi halaman dan
// Server Action yang membaca/menulis data tetap wajib memanggil requireAdmin() sendiri.
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}
