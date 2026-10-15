import type { Metadata } from "next";
import { AmenitiesManager } from "@/components/admin/amenities/amenities-manager";
import { sortAmenities, toAmenityRow, type RawAmenity } from "@/components/admin/amenities/amenity-model";
import { SectionError } from "@/components/admin/dashboard/dashboard-section";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = { title: "Fasilitas kamar" };

// Fasilitas kamar (PRD 7.6): dibaca segar dengan sesi admin (tanpa cache), termasuk yang nonaktif,
// beserta jumlah unit yang memakai (embed count unit_amenities).
export default async function AdminAmenitiesPage() {
  const admin = await requireAdmin();
  const { data, error } = await admin.supabase
    .from("amenities")
    .select("id, name, icon, sort_order, is_active, unit_amenities(count)")
    .order("sort_order")
    .order("name");

  if (error) {
    console.error("[admin/amenities] baca gagal", { code: error.code });
    return (
      <div className="glass-card rounded-card p-5 sm:p-6">
        <SectionError>Daftar fasilitas gagal dimuat. Muat ulang halaman untuk mencoba lagi.</SectionError>
      </div>
    );
  }

  const rows = sortAmenities(((data ?? []) as unknown as RawAmenity[]).map(toAmenityRow));
  return <AmenitiesManager amenities={rows} />;
}
