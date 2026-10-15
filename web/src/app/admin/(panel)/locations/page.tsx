import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "Apartemen & tipe kamar" };

export default function AdminLocationsPage() {
  return (
    <AdminPlaceholder
      title="Apartemen & tipe kamar"
      description="Data apartemen dan tipe kamar di setiap gedung."
      phase={5}
    />
  );
}
