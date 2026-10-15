import "server-only";
import {
  isMissingColumnError,
  sortFacilities,
  toFacilityRow,
  type AdminFacilityRow,
  type FacilityLocation,
} from "@/components/admin/facilities/facility-model";
import type { AdminSession } from "@/lib/auth/require-admin";
import { getAdminLookups } from "@/lib/data/admin/units";

// Data admin fasilitas gedung (PRD 7.7): TIDAK di-cache (selalu terbaru), dibaca dengan sesi admin
// (RLS: admin melihat juga yang nonaktif). Jumlah baris kecil, jadi filter/pencarian di memori (klien).

type Supabase = AdminSession["supabase"];

export type AdminFacilitiesData =
  | { status: "ok"; facilities: AdminFacilityRow[]; locations: FacilityLocation[] }
  /** Kolom sort_order/is_active belum ada: migrasi 0003 belum dijalankan. */
  | { status: "needs-migration" }
  | { status: "error" };

/** Semua fasilitas gedung (termasuk nonaktif) + daftar apartemen (termasuk nonaktif) untuk filter dan form. */
export async function getAdminFacilities(supabase: Supabase): Promise<AdminFacilitiesData> {
  const [facilities, lookups] = await Promise.all([
    supabase.from("facilities").select("id, location_id, name, icon, description, image, sort_order, is_active"),
    getAdminLookups(supabase).then(
      (value) => ({ ok: true as const, locations: value.locations }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
  ]);

  if (facilities.error) {
    if (isMissingColumnError(facilities.error)) return { status: "needs-migration" };
    // Hanya kode galat yang dicatat.
    console.error("[admin/facilities] baca gagal", { code: facilities.error.code });
    return { status: "error" };
  }
  if (!lookups.ok) {
    console.error("[admin/facilities] baca apartemen gagal", { name: (lookups.error as Error)?.name });
    return { status: "error" };
  }

  const locations: FacilityLocation[] = lookups.locations.map((location) => ({
    id: location.id,
    name: location.name,
    isActive: location.isActive,
  }));
  return {
    status: "ok",
    facilities: sortFacilities((facilities.data ?? []).map(toFacilityRow), locations),
    locations,
  };
}
