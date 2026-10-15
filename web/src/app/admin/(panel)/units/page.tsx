import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/kit/form-card";
import { UnitList } from "@/components/admin/units/list/unit-list";
import { UnitListSkeleton } from "@/components/admin/units/list/unit-list-skeleton";
import { Button } from "@/components/ui/button";
import { parseAdminUnitFilter, queryAdminUnits } from "@/lib/admin/unit-query";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminLookups, getAdminUnitRows } from "@/lib/data/admin/units";

export const metadata: Metadata = { title: "Unit kamar" };

/**
 * Daftar unit admin (PRD 7.4). Kepala halaman tampil langsung; daftar dimuat di balik Suspense
 * dengan skeleton. Data admin tidak di-cache (selalu terbaru) dan dibaca dengan sesi admin (RLS is_admin).
 */
export default function AdminUnitsPage({ searchParams }: PageProps<"/admin/units">) {
  return (
    <>
      <AdminPageHeader
        description="Cari, filter, dan ubah unit dengan cepat."
        actions={
          <Button asChild>
            <Link href="/admin/units/new">
              <Plus aria-hidden="true" />
              Tambah unit
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<UnitListSkeleton />}>
        <UnitListSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function UnitListSection({ searchParams }: Pick<PageProps<"/admin/units">, "searchParams">) {
  const admin = await requireAdmin();
  const requested = parseAdminUnitFilter(await searchParams);
  const [rows, lookups] = await Promise.all([getAdminUnitRows(admin.supabase), getAdminLookups(admin.supabase)]);

  // Apartemen/tipe dari URL yang sudah tidak ada (atau tipe milik apartemen lain) diabaikan.
  const location = lookups.locations.find((l) => l.id === requested.lokasi);
  const filter = {
    ...requested,
    lokasi: location ? requested.lokasi : null,
    tipe: location?.roomTypes.some((t) => t.id === requested.tipe) ? requested.tipe : null,
  };
  const result = queryAdminUnits(rows, filter);

  return <UnitList result={result} filter={{ ...filter, hal: result.page }} locations={lookups.locations} />;
}
