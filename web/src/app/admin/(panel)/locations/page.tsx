import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionError } from "@/components/admin/dashboard/dashboard-section";
import { LocationsList } from "@/components/admin/locations/locations-list";
import { LocationsListSkeleton } from "@/components/admin/locations/locations-skeleton";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminLocationsList } from "@/lib/data/admin/locations";

export const metadata: Metadata = { title: "Apartemen & tipe kamar" };

/**
 * Daftar apartemen (PRD 7.5). Dimuat di balik Suspense dengan skeleton; data admin tidak di-cache
 * (selalu terbaru) dan dibaca dengan sesi admin (RLS is_admin), termasuk apartemen nonaktif.
 */
export default function AdminLocationsPage() {
  return (
    <Suspense fallback={<LocationsListSkeleton />}>
      <LocationsSection />
    </Suspense>
  );
}

async function LocationsSection() {
  const admin = await requireAdmin();
  let locations;
  try {
    locations = await getAdminLocationsList(admin.supabase);
  } catch (error) {
    console.error("[admin/locations] baca gagal", { name: (error as Error)?.name });
    return (
      <div className="glass-card rounded-card p-5 sm:p-6">
        <SectionError>Daftar apartemen gagal dimuat. Muat ulang halaman untuk mencoba lagi.</SectionError>
      </div>
    );
  }
  return <LocationsList locations={locations} />;
}
