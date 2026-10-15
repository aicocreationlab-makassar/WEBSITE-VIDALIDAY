import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  return (
    <AdminPlaceholder
      title="Dashboard"
      description="Ringkasan permintaan sewa, unit tampil, unit penuh, dan promo aktif."
      phase={5}
    />
  );
}
