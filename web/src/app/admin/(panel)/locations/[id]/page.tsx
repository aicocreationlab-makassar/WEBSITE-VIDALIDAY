import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "Ubah apartemen" };

export default function AdminEditLocationPage() {
  return (
    <AdminPlaceholder
      title="Ubah apartemen"
      description="Profil apartemen, foto gedung, dan tipe kamarnya."
      phase={5}
    />
  );
}
