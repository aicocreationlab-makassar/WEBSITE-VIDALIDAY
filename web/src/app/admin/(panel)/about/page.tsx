import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "Halaman About" };

export default function AdminAboutPage() {
  return (
    <AdminPlaceholder
      title="Halaman About"
      description="Isi halaman Tentang kami."
      phase={6}
    />
  );
}
