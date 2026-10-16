import Link from "next/link";
import { BadgePercent, ChevronRight, ClipboardCheck, DoorClosed, Eye, Inbox } from "lucide-react";
import type { AdminUnitRow } from "@/lib/admin/unit-query";
import { summarizeUnits, type NewLeadCounts } from "@/lib/data/admin/dashboard";
import { StatCard } from "./stat-card";

type Props = {
  units: Promise<AdminUnitRow[] | null>;
  leadCounts: Promise<NewLeadCounts | null>;
};

/** Empat kartu angka (PRD 7.3) + pengingat unit yang datanya perlu dicek. */
export async function DashboardStats({ units, leadCounts }: Props) {
  const [rows, leads] = await Promise.all([units, leadCounts]);
  const stats = rows ? summarizeUnits(rows) : null;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Permintaan baru"
          value={leads?.today ?? null}
          icon={Inbox}
          highlight={Boolean(leads && leads.today > 0)}
          href="/admin/leads?status=baru"
          detail={
            leads ? (
              <>
                hari ini · <span className="font-semibold text-ink-2 tabular-nums">{leads.week}</span> dalam 7 hari
              </>
            ) : null
          }
        />
        <StatCard
          label="Unit tampil"
          value={stats?.published ?? null}
          icon={Eye}
          href="/admin/units?status=tampil"
          detail={stats ? `dari ${stats.total} unit` : null}
        />
        <StatCard
          label="Unit penuh"
          value={stats?.full ?? null}
          icon={DoorClosed}
          href="/admin/units?status=tampil&stok=penuh"
          detail={stats ? (stats.full > 0 ? "tamu hanya bisa tanya ketersediaan" : "semua unit tersedia") : null}
        />
        <StatCard
          label="Unit promo aktif"
          value={stats?.promo ?? null}
          icon={BadgePercent}
          href="/admin/units?status=tampil&promo=aktif"
          detail={stats ? "tampil dengan harga promo" : null}
        />
      </div>

      {stats && stats.needsCheck > 0 ? (
        <Link
          href="/admin/units?cek=1"
          className="group flex min-h-16 items-center gap-3 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:border-amber-300 focus-visible:ring-3 focus-visible:ring-brand-500/20"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-white text-[#b45309]">
            <ClipboardCheck className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ink">
              {stats.needsCheck} unit perlu dicek
            </span>
            <span className="block text-caption text-ink-2">
              Tower, lantai, foto, tipe kamar, atau harga promo belum rapi.
            </span>
          </span>
          <span className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-[#b45309] sm:inline-flex">
            Cek unit
          </span>
          <ChevronRight className="size-5 shrink-0 text-[#b45309] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
