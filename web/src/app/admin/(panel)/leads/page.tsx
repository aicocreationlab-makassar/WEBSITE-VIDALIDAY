import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionError } from "@/components/admin/dashboard/dashboard-section";
import { AdminPageHeader } from "@/components/admin/kit/form-card";
import { LeadList } from "@/components/admin/leads/lead-list";
import { LeadListSkeleton } from "@/components/admin/leads/lead-list-skeleton";
import { parseLeadFilter, type LeadFilter } from "@/lib/admin/lead-query";
import { requireAdmin, type AdminSession } from "@/lib/auth/require-admin";
import { getAdminLeads, getLeadApartmentNames } from "@/lib/data/admin/leads";
import { getLeadStatusCounts } from "./status-counts";

export const metadata: Metadata = { title: "Permintaan sewa" };

/**
 * Permintaan sewa (PRD 7.8). Kepala halaman tampil langsung; daftar dimuat di balik Suspense dengan
 * skeleton. Data admin dibaca segar dengan sesi admin (RLS is_admin), tidak di-cache.
 */
export default function AdminLeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  return (
    <>
      <AdminPageHeader description="Permintaan dari tamu lewat tombol Sewa sekarang. Hubungi lewat WhatsApp, lalu perbarui statusnya." />
      <Suspense fallback={<LeadListSkeleton />}>
        <LeadListSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LeadListSection({ searchParams }: Pick<PageProps<"/admin/leads">, "searchParams">) {
  const admin = await requireAdmin();
  const filter = parseLeadFilter(await searchParams);

  const data = await loadLeads(admin.supabase, filter);
  if (!data) {
    return (
      <div className="glass-card rounded-card p-5 sm:p-6">
        <SectionError>Permintaan sewa gagal dimuat. Muat ulang halaman untuk mencoba lagi.</SectionError>
      </div>
    );
  }

  const { result, apartments, counts } = data;
  return (
    <LeadList
      rows={result.rows}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      filter={{ ...filter, hal: result.page }}
      apartments={apartments}
      counts={counts}
    />
  );
}

/** Satu halaman permintaan + daftar apartemen + hitungan status. null kalau baca gagal (tanpa melempar ke UI). */
async function loadLeads(supabase: AdminSession["supabase"], filter: LeadFilter) {
  try {
    const [first, apartments, counts] = await Promise.all([
      // PostgREST menolak offset di luar jumlah baris (416); untuk halaman > 1 itu ditangani di bawah.
      getAdminLeads(supabase, filter).catch((error: unknown) => {
        if (filter.hal > 1) return null;
        throw error;
      }),
      getLeadApartmentNames(supabase),
      getLeadStatusCounts(supabase, filter),
    ]);
    let result = first;
    // Nomor halaman di URL melewati halaman terakhir (mis. setelah status diubah): tampilkan halaman terakhir.
    if (!result || (result.rows.length === 0 && result.total > 0 && filter.hal > result.pageCount)) {
      const base = result ?? (await getAdminLeads(supabase, { ...filter, hal: 1 }));
      result = base.page !== base.pageCount ? await getAdminLeads(supabase, { ...filter, hal: base.pageCount }) : base;
    }
    return { result, apartments, counts };
  } catch {
    console.error("[admin/leads] baca gagal");
    return null;
  }
}
