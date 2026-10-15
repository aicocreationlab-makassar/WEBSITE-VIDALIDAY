import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "Permintaan sewa" };

export default function AdminLeadsPage() {
  return (
    <AdminPlaceholder
      title="Permintaan sewa"
      description="Permintaan sewa dari tamu beserta statusnya."
      phase={6}
    />
  );
}
