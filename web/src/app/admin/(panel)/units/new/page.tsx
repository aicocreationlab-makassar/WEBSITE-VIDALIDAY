import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "Tambah unit" };

export default function AdminNewUnitPage() {
  return (
    <AdminPlaceholder
      title="Tambah unit"
      description="Form unit baru lengkap dengan foto, harga, dan fasilitas."
      phase={5}
    />
  );
}
