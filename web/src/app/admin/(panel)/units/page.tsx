import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "Unit kamar" };

export default function AdminUnitsPage() {
  return (
    <AdminPlaceholder
      title="Unit kamar"
      description="Daftar unit dengan pencarian, filter, dan aksi cepat."
      phase={5}
    />
  );
}
