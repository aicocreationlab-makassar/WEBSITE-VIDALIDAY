import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "Fasilitas gedung" };

export default function AdminFacilitiesPage() {
  return (
    <AdminPlaceholder
      title="Fasilitas gedung"
      description="Fasilitas bersama di setiap apartemen."
      phase={6}
    />
  );
}
