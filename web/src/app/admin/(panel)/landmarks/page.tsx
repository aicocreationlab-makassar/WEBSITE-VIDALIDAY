import type { Metadata } from "next";
import { SectionError } from "@/components/admin/dashboard/dashboard-section";
import type { AdminLandmarkRow, LandmarkLocation } from "@/components/admin/landmarks/landmark-model";
import { LandmarksManager } from "@/components/admin/landmarks/landmarks-manager";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminLandmarks } from "@/lib/data/admin/content";
import { getAdminLookups } from "@/lib/data/admin/units";

export const metadata: Metadata = { title: "Landmark" };

// Landmark (PRD 7.7): dibaca segar dengan sesi admin (tanpa cache), termasuk yang nonaktif dan
// apartemen nonaktif. Apartemen terpilih ada di ?lokasi= dan dibaca di klien (useSearchParams),
// karena cari/saring/ganti apartemen terjadi di klien tanpa memuat ulang data.
export default async function AdminLandmarksPage() {
  const admin = await requireAdmin();

  let landmarks: AdminLandmarkRow[];
  let locations: LandmarkLocation[];
  try {
    const [rows, lookups] = await Promise.all([getAdminLandmarks(admin.supabase), getAdminLookups(admin.supabase)]);
    landmarks = rows;
    locations = lookups.locations.map((location) => ({
      id: location.id,
      name: location.name,
      shortName: location.shortName,
      isActive: location.isActive,
    }));
  } catch (error) {
    console.error("[admin/landmarks] baca gagal", { name: (error as Error)?.name });
    return (
      <div className="glass-card rounded-card p-5 sm:p-6">
        <SectionError>Daftar landmark gagal dimuat. Muat ulang halaman untuk mencoba lagi.</SectionError>
      </div>
    );
  }

  return <LandmarksManager landmarks={landmarks} locations={locations} />;
}
