import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Inbox, Plus } from "lucide-react";
import { DashboardListSkeleton, DashboardStatsSkeleton } from "@/components/admin/dashboard/dashboard-skeletons";
import { DashboardStats } from "@/components/admin/dashboard/dashboard-stats";
import { PopularUnits } from "@/components/admin/dashboard/popular-units";
import { RecentLeads } from "@/components/admin/dashboard/recent-leads";
import { AdminPageHeader } from "@/components/admin/kit/form-card";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  dashboardRanges,
  getDashboardUnits,
  getNewLeadCounts,
  getPopularUnits,
  getRecentLeads,
} from "@/lib/data/admin/dashboard";
import { formatDate, todayInMakassar } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

// Dashboard (PRD 7.3). Semua query dimulai paralel di sini, lalu tiap bagian menunggu
// datanya sendiri di balik Suspense (kerangka tampil lebih dulu). Fungsi data tidak melempar:
// bagian yang gagal menampilkan pesan sendiri tanpa menjatuhkan bagian lain.
export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const ranges = dashboardRanges(todayInMakassar());

  const units = getDashboardUnits(admin.supabase);
  const leadCounts = getNewLeadCounts(admin.supabase, ranges);
  const recentLeads = getRecentLeads(admin.supabase, 5);
  const popularUnits = getPopularUnits(admin.supabase, units, 30, 5);

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        className="mb-0"
        description={`Hari ini ${formatDate(ranges.today)}. Pantau permintaan sewa dan status unit dari sini.`}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/admin/leads?status=baru">
                <Inbox aria-hidden="true" />
                Lihat permintaan baru
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/units/new">
                <Plus aria-hidden="true" />
                Tambah unit
              </Link>
            </Button>
          </>
        }
      />

      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats units={units} leadCounts={leadCounts} />
      </Suspense>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <Suspense fallback={<DashboardListSkeleton title="Permintaan terbaru" />}>
            <RecentLeads leads={recentLeads} today={ranges.today} />
          </Suspense>
        </div>
        <div className="min-w-0 lg:col-span-2">
          <Suspense fallback={<DashboardListSkeleton title="Paling diminati 30 hari" />}>
            <PopularUnits popular={popularUnits} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
