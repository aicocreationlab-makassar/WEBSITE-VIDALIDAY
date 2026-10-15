import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionError } from "@/components/admin/dashboard/dashboard-section";
import { LocationForm } from "@/components/admin/locations/location-form";
import { LocationHeader, LocationMissing } from "@/components/admin/locations/location-header";
import { LocationEditSkeleton } from "@/components/admin/locations/locations-skeleton";
import { RoomTypesCard } from "@/components/admin/locations/room-types-card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminLocation } from "@/lib/data/admin/locations";

export const metadata: Metadata = { title: "Ubah apartemen" };

/** Ubah apartemen + kelola tipe kamarnya (PRD 7.5). Data segar dengan sesi admin, di balik Suspense. */
export default function AdminEditLocationPage({ params }: PageProps<"/admin/locations/[id]">) {
  return (
    <Suspense fallback={<LocationEditSkeleton />}>
      <LocationEditSection params={params} />
    </Suspense>
  );
}

async function LocationEditSection({ params }: Pick<PageProps<"/admin/locations/[id]">, "params">) {
  const admin = await requireAdmin();
  const { id: rawId } = await params;
  const id = /^\d{1,10}$/.test(rawId) ? Number(rawId) : 0;
  if (!id) return <LocationMissing />;

  let detail;
  try {
    detail = await getAdminLocation(admin.supabase, id);
  } catch (error) {
    console.error("[admin/locations/[id]] baca gagal", { name: (error as Error)?.name });
    return (
      <div className="glass-card rounded-card p-5 sm:p-6">
        <SectionError>Data apartemen gagal dimuat. Muat ulang halaman untuk mencoba lagi.</SectionError>
      </div>
    );
  }
  if (!detail) return <LocationMissing />;

  return (
    <>
      <LocationHeader detail={detail} />
      <LocationForm
        key={detail.id}
        detail={detail}
        roomTypes={
          <RoomTypesCard
            locationId={detail.id}
            locationName={detail.name}
            roomTypes={detail.roomTypes}
            unitsWithoutType={detail.unitsWithoutType}
          />
        }
      />
    </>
  );
}
