import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { LeadStatusBadge } from "@/components/admin/kit/status-badge";
import { EmptyState } from "@/components/public/shared/empty-state";
import { formatLeadTime, type RecentLead } from "@/lib/data/admin/dashboard";
import { diffDays, formatDateShort, formatNights } from "@/lib/format";
import { DashboardSection, SectionError } from "./dashboard-section";

type Props = {
  leads: Promise<RecentLead[] | null>;
  /** Tanggal hari ini (WITA), untuk label "Hari ini" / "Kemarin". */
  today: string;
};

/** Lima permintaan sewa terbaru; setiap baris membuka halaman permintaan sewa. */
export async function RecentLeads({ leads, today }: Props) {
  const items = await leads;
  return (
    <DashboardSection title="Permintaan terbaru" link={{ href: "/admin/leads", label: "Lihat semua" }}>
      {items == null ? (
        <SectionError />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Belum ada permintaan sewa"
          description="Permintaan dari tombol Sewa sekarang di situs akan muncul di sini."
          className="py-6"
        />
      ) : (
        <ul className="-mx-2 divide-y divide-line">
          {items.map((lead) => (
            <li key={lead.id}>
              <LeadRow lead={lead} today={today} />
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}

function LeadRow({ lead, today }: { lead: RecentLead; today: string }) {
  const nights = lead.nights ?? diffDays(lead.checkIn, lead.checkOut);
  const place = [lead.unitName, lead.locationName].filter(Boolean).join(" · ");
  return (
    <Link
      href="/admin/leads"
      className="flex min-h-16 flex-col gap-1 rounded-control px-2 py-3 transition-colors hover:bg-surface focus-visible:ring-3 focus-visible:ring-brand-500/20"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-semibold text-ink">{lead.fullName}</span>
          <span className="shrink-0 font-mono text-caption text-muted">{lead.code}</span>
        </span>
        <LeadStatusBadge status={lead.status} />
      </span>
      <span className="truncate text-sm text-ink-2">{place || "Unit tidak tercatat"}</span>
      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-caption text-muted">
        <span className="inline-flex flex-wrap items-center gap-1">
          {formatDateShort(lead.checkIn)}
          <ArrowRight className="size-3.5" aria-hidden="true" />
          <span className="sr-only">sampai</span>
          {formatDateShort(lead.checkOut)}
          {Number.isFinite(nights) && nights > 0 ? <span>· {formatNights(nights)}</span> : null}
        </span>
        <span>{formatLeadTime(lead.createdAt, today)}</span>
      </span>
    </Link>
  );
}
