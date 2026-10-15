import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "Pengaturan" };

export default function AdminSettingsPage() {
  return (
    <AdminPlaceholder
      title="Pengaturan"
      description="Nomor WhatsApp, jam layanan, banner pengumuman, dan SEO."
      phase={6}
    />
  );
}
