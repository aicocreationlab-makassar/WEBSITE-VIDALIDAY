import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { UnitForm } from "@/components/admin/units/form/unit-form";
import { UnitFormSkeleton } from "@/components/admin/units/form/unit-form-skeleton";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminLookups, getAdminUnit } from "@/lib/data/admin/units";

export const metadata: Metadata = { title: "Ubah unit" };

/** Form ubah unit (PRD 7.4). Data admin tidak di-cache dan dibaca dengan sesi admin (RLS is_admin). */
export default function AdminEditUnitPage({ params }: PageProps<"/admin/units/[id]">) {
  return (
    <Suspense fallback={<UnitFormSkeleton />}>
      <EditUnitSection params={params} />
    </Suspense>
  );
}

async function EditUnitSection({ params }: Pick<PageProps<"/admin/units/[id]">, "params">) {
  const admin = await requireAdmin();
  const { id: raw } = await params;
  const id = /^\d{1,15}$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const [lookups, unit, legacy] = await Promise.all([
    getAdminLookups(admin.supabase),
    getAdminUnit(admin.supabase, id),
    // Kolom lama rental_period hanya untuk penanda "Perlu dicek" (harga lama per bulan, dsb.).
    admin.supabase.from("units").select("rental_period").eq("id", id).maybeSingle(),
  ]);
  if (!unit) notFound();

  return (
    <UnitForm
      key={`${unit.id}-${unit.updatedAt}`}
      mode="edit"
      lookups={lookups}
      initial={unit}
      legacyBadge={unit.legacyBadge}
      rentalPeriod={legacy.data?.rental_period ?? null}
    />
  );
}
