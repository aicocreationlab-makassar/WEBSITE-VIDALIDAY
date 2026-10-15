import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "Fasilitas kamar" };

export default function AdminAmenitiesPage() {
  return (
    <AdminPlaceholder
      title="Fasilitas kamar"
      description="Daftar fasilitas kamar beserta ikonnya."
      phase={5}
    />
  );
}
