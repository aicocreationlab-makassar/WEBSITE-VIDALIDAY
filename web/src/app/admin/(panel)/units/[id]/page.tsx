import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "Ubah unit" };

export default function AdminEditUnitPage() {
  return (
    <AdminPlaceholder
      title="Ubah unit"
      description="Ubah data, foto, harga, dan status unit."
      phase={5}
    />
  );
}
