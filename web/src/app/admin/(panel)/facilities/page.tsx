import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionError } from "@/components/admin/dashboard/dashboard-section";
import { FacilitiesManager } from "@/components/admin/facilities/facilities-manager";
import { FacilitiesSkeleton } from "@/components/admin/facilities/facilities-skeleton";
import { MIGRATION_0003_MESSAGE } from "@/components/admin/facilities/facility-model";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminFacilities } from "@/lib/data/admin/facilities";

export const metadata: Metadata = { title: "Fasilitas gedung" };

/**
 * Fasilitas gedung (PRD 7.7). Dimuat di balik Suspense dengan skeleton; data admin tidak di-cache
 * (selalu terbaru) dan dibaca dengan sesi admin (RLS is_admin), termasuk yang nonaktif. Filter
 * (?lokasi, ?q, ?status) dibaca dan diperbarui di klien tanpa memuat ulang data.
 */
export default function AdminFacilitiesPage() {
  return (
    <Suspense fallback={<FacilitiesSkeleton />}>
      <FacilitiesSection />
    </Suspense>
  );
}

async function FacilitiesSection() {
  const admin = await requireAdmin();
  const data = await getAdminFacilities(admin.supabase);

  if (data.status !== "ok") {
    return (
      <div className="glass-card rounded-card p-5 sm:p-6">
        <SectionError>
          {data.status === "needs-migration"
            ? MIGRATION_0003_MESSAGE
            : "Daftar fasilitas gagal dimuat. Muat ulang halaman untuk mencoba lagi."}
        </SectionError>
      </div>
    );
  }

  return <FacilitiesManager facilities={data.facilities} locations={data.locations} />;
}
