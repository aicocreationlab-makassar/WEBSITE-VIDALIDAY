import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "FAQ" };

export default function AdminFaqsPage() {
  return (
    <AdminPlaceholder
      title="FAQ"
      description="Pertanyaan yang sering ditanyakan tamu."
      phase={6}
    />
  );
}
