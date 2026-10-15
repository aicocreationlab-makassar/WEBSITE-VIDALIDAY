import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/layout/admin-placeholder";

export const metadata: Metadata = { title: "Landmark" };

export default function AdminLandmarksPage() {
  return (
    <AdminPlaceholder
      title="Landmark"
      description="Tempat penting di sekitar apartemen beserta jaraknya."
      phase={6}
    />
  );
}
