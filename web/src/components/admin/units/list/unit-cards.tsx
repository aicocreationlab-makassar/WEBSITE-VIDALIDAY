"use client";

import Link from "next/link";
import { UnitStatusBadges } from "@/components/admin/kit/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { AdminUnitRow } from "@/lib/admin/unit-query";
import { cn } from "@/lib/utils";
import { QuickPrice } from "./quick-price";
import type { RowActions, SelectionProps } from "./types";
import { HealthNote, UnitThumb } from "./unit-bits";
import { pageSelectionState, unitSubline } from "./unit-list-model";
import { UnitRowMenu } from "./unit-row-menu";

type Props = SelectionProps & {
  rows: AdminUnitRow[];
  actions: RowActions;
  desktop: boolean | null;
};

/**
 * Daftar kartu unit untuk HP dan tablet (UX 2.7): foto 72px, nama 16/700 satu baris,
 * "Vida View · Studio · lt. 26", badge status, baris harga yang membuka "Ubah harga", menu 44px.
 */
export function UnitCards({ rows, actions, desktop, selecting, selection, onToggle, onTogglePage }: Props) {
  const pageState = pageSelectionState(selection, rows);

  return (
    <div className="@container">
      {selecting ? (
        <label className="mb-2 flex min-h-11 w-fit cursor-pointer items-center gap-3 rounded-control pr-3 pl-3.5 text-sm font-semibold text-ink-2 hover:bg-surface-2">
          <Checkbox
            aria-label="Pilih semua unit di halaman ini"
            checked={pageState}
            onCheckedChange={(checked) => onTogglePage(checked === true)}
          />
          <span aria-hidden="true">Pilih semua di halaman ini</span>
        </label>
      ) : null}
      <ul className="grid gap-3 @2xl:grid-cols-2">
        {rows.map((row) => {
          const selected = selection.has(row.id);
          const busy = actions.busyId === row.id;
          return (
            <li
              key={row.id}
              data-testid="admin-unit-row"
              aria-busy={busy || undefined}
              className={cn(
                "glass-card rounded-card p-3 transition-[opacity,box-shadow]",
                selected && "ring-2 ring-brand-500",
                busy && "opacity-60",
              )}
            >
              <div className="flex items-start gap-3">
                {selecting ? (
                  <label className="-my-1 -ml-1 flex size-11 shrink-0 cursor-pointer items-center justify-center self-center">
                    <Checkbox aria-label={`Pilih ${row.name}`} checked={selected} onCheckedChange={() => onToggle(row)} />
                  </label>
                ) : null}
                <Link href={`/admin/units/${row.id}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
                  <UnitThumb row={row} size={72} />
                </Link>
                <div className="min-w-0 flex-1 pt-0.5">
                  <Link
                    href={`/admin/units/${row.id}`}
                    className="block truncate text-base leading-6 font-bold text-ink underline-offset-2 hover:underline"
                  >
                    {row.name}
                  </Link>
                  <p className="truncate text-caption text-muted">{unitSubline(row)}</p>
                  <div className="mt-2">
                    <UnitStatusBadges
                      isPublished={row.isPublished}
                      isAvailable={row.isAvailable}
                      isPromoActive={row.isPromoActive}
                      isFeatured={row.isFeatured}
                    />
                  </div>
                </div>
                <UnitRowMenu row={row} actions={actions} className="-mt-1 -mr-1" />
              </div>
              <HealthNote flags={row.flags} className="mt-2.5" />
              <div className="mt-2.5 border-t border-line pt-1.5">
                <QuickPrice row={row} desktop={desktop} variant="card" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
