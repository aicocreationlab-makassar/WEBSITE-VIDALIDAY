import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { UnitForm } from "@/components/admin/units/form/unit-form";
import { UnitFormSkeleton } from "@/components/admin/units/form/unit-form-skeleton";
import { EmptyState } from "@/components/public/shared/empty-state";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminLookups } from "@/lib/data/admin/units";

export const metadata: Metadata = { title: "Tambah unit" };

/** Form unit baru (PRD 7.4). ?lokasi={id} memilih apartemen lebih dulu (mis. dari empty state per apartemen). */
export default function AdminNewUnitPage({ searchParams }: PageProps<"/admin/units/new">) {
  return (
    <Suspense fallback={<UnitFormSkeleton />}>
      <NewUnitSection searchParams={searchParams} />
    </Suspense>
  );
}

async function NewUnitSection({ searchParams }: Pick<PageProps<"/admin/units/new">, "searchParams">) {
  const admin = await requireAdmin();
  const [lookups, params] = await Promise.all([getAdminLookups(admin.supabase), searchParams]);

  if (!lookups.locations.length) {
    return (
      <section className="glass-card rounded-card">
        <EmptyState
          icon={Building2}
          title="Belum ada apartemen"
          description="Unit selalu milik satu apartemen. Tambah apartemen dan tipe kamarnya dulu."
          action={
            <Button asChild>
              <Link href="/admin/locations">Tambah apartemen</Link>
            </Button>
          }
        />
      </section>
    );
  }

  const raw = Array.isArray(params.lokasi) ? params.lokasi[0] : params.lokasi;
  const lokasi = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  const presetLocationId = lookups.locations.some((location) => location.id === lokasi) ? lokasi : null;

  return <UnitForm mode="create" lookups={lookups} initial={null} presetLocationId={presetLocationId} />;
}
