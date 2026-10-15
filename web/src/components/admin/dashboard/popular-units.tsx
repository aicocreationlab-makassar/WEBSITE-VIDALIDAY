import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/public/shared/empty-state";
import type { PopularUnit } from "@/lib/data/admin/dashboard";
import { DashboardSection, SectionError } from "./dashboard-section";

/** Lima unit dengan permintaan sewa terbanyak 30 hari terakhir; setiap baris membuka form unit. */
export async function PopularUnits({ popular }: { popular: Promise<PopularUnit[] | null> }) {
  const items = await popular;
  const max = Math.max(1, ...(items ?? []).map((item) => item.leadCount));

  return (
    <DashboardSection title="Paling diminati 30 hari" description="Urut dari jumlah permintaan sewa.">
      {items == null ? (
        <SectionError />
      ) : items.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Belum ada data"
          description="Belum ada permintaan sewa dalam 30 hari terakhir."
          className="py-6"
        />
      ) : (
        <ol className="-mx-2 space-y-1">
          {items.map((unit, index) => (
            <li key={unit.id}>
              <Link
                href={`/admin/units/${unit.id}`}
                className="flex min-h-16 items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface focus-visible:ring-3 focus-visible:ring-brand-500/20 focus-visible:outline-none"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-ink-2 tabular-nums"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold text-ink">{unit.name}</span>
                    {unit.isPublished ? null : <Badge variant="neutral">Draft</Badge>}
                  </span>
                  <span className="mt-0.5 block truncate text-caption text-muted">{unit.locationShortName}</span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-brand-50" aria-hidden="true">
                    <span
                      className="block h-full rounded-full bg-brand-600"
                      style={{ width: `${Math.max(6, Math.round((unit.leadCount / max) * 100))}%` }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-base font-bold text-ink tabular-nums">{unit.leadCount}</span>
                  <span className="block text-caption text-muted">permintaan</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </DashboardSection>
  );
}
