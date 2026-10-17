"use client";

import Link from "next/link";
import { Copy, Pencil } from "lucide-react";
import { UnitStatusBadges } from "@/components/admin/kit/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AdminUnitRow } from "@/lib/admin/unit-query";
import { formatDateCompact, formatTime } from "@/lib/format";
import { formatUnitSpot } from "@/lib/unit-display";
import { cn } from "@/lib/utils";
import { QuickPrice } from "./quick-price";
import type { RowActions, SelectionProps } from "./types";
import { HealthTooltip, UnitThumb } from "./unit-bits";
import { pageSelectionState } from "./unit-list-model";
import { UnitRowMenu } from "./unit-row-menu";

type Props = SelectionProps & {
  rows: AdminUnitRow[];
  actions: RowActions;
  desktop: boolean | null;
};

// Header menempel di bawah topbar 64px. Kartu memakai overflow-clip (bukan hidden/auto) supaya sticky tetap jalan.
const TH =
  "sticky top-16 z-10 h-11 bg-white px-3 text-left align-middle text-caption font-semibold whitespace-nowrap text-muted shadow-[inset_0_-1px_0_var(--color-line)]";
const TD = "border-b border-line px-3 py-2 align-middle";

function join(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

/**
 * Tabel unit desktop (lg ke atas, DESIGN 5): baris 64px, hover surface, aksi di kanan.
 * Kolom yang kurang penting muncul bertahap (xl, 2xl) dan isinya pindah ke baris kecil di bawah nama.
 */
export function UnitTable({ rows, actions, desktop, selecting, selection, onToggle, onTogglePage }: Props) {
  const pageState = pageSelectionState(selection, rows);

  return (
    <div className="glass-card overflow-clip rounded-card">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {selecting ? (
              <th scope="col" className={cn(TH, "w-14 pr-0 pl-2")}>
                <label className="flex size-11 cursor-pointer items-center justify-center">
                  <Checkbox
                    aria-label="Pilih semua unit di halaman ini"
                    checked={pageState}
                    onCheckedChange={(checked) => onTogglePage(checked === true)}
                  />
                </label>
              </th>
            ) : null}
            <th scope="col" className={cn(TH, "w-[76px] pl-4")}>
              Foto
            </th>
            <th scope="col" className={TH}>
              Unit
            </th>
            <th scope="col" className={cn(TH, "hidden xl:table-cell")}>
              Apartemen &amp; tipe
            </th>
            <th scope="col" className={cn(TH, "hidden text-right 2xl:table-cell")}>
              Tamu
            </th>
            <th scope="col" className={TH}>
              Harga per malam
            </th>
            <th scope="col" className={TH}>
              Status
            </th>
            <th scope="col" className={cn(TH, "hidden xl:table-cell")}>
              Diubah
            </th>
            <th scope="col" className={cn(TH, "pr-4 text-right")}>
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {rows.map((row) => {
            const selected = selection.has(row.id);
            const busy = actions.busyId === row.id;
            const spot = formatUnitSpot(row);
            const guests = `${row.maxGuests} tamu`;
            const type = row.roomTypeName ?? "Tanpa tipe";
            return (
              <tr
                key={row.id}
                data-testid="admin-unit-row"
                data-state={selected ? "selected" : undefined}
                aria-busy={busy || undefined}
                className={cn(
                  "h-16 transition-colors hover:bg-surface data-[state=selected]:bg-brand-50/60",
                  busy && "opacity-60",
                )}
              >
                {selecting ? (
                  <td className={cn(TD, "pr-0 pl-2")}>
                    <label className="flex size-11 cursor-pointer items-center justify-center">
                      <Checkbox aria-label={`Pilih ${row.name}`} checked={selected} onCheckedChange={() => onToggle(row)} />
                    </label>
                  </td>
                ) : null}
                <td className={cn(TD, "pr-2 pl-4")}>
                  <Link href={`/admin/units/${row.id}`} tabIndex={-1} aria-hidden="true" className="block">
                    <UnitThumb row={row} size={56} />
                  </Link>
                </td>
                <td className={cn(TD, "w-full max-w-0")}>
                  <div className="flex min-w-0 items-center gap-1">
                    <Link
                      href={`/admin/units/${row.id}`}
                      className="truncate text-[15px] font-bold text-ink underline-offset-2 hover:text-brand-700 hover:underline"
                    >
                      {row.name}
                    </Link>
                    <HealthTooltip flags={row.flags} />
                  </div>
                  <p className="truncate text-caption text-muted">
                    <span className="xl:hidden">{join([row.locationShortName, type, spot, guests])}</span>
                    <span className="hidden xl:inline 2xl:hidden">{join([spot, guests])}</span>
                    <span className="hidden 2xl:inline">
                      {spot ?? (row.hasTowers ? "Tower dan lantai belum diisi" : "Lantai belum diisi")}
                    </span>
                  </p>
                </td>
                <td className={cn(TD, "hidden whitespace-nowrap xl:table-cell")}>
                  <p className="font-semibold text-ink-2">{row.locationShortName}</p>
                  <p className={cn("text-caption", row.roomTypeName ? "text-muted" : "font-semibold text-[#b45309]")}>{type}</p>
                </td>
                <td className={cn(TD, "hidden text-right font-semibold text-ink-2 tabular-nums 2xl:table-cell")}>
                  {row.maxGuests}
                </td>
                <td className={cn(TD, "whitespace-nowrap")}>
                  <QuickPrice row={row} desktop={desktop} variant="table" />
                </td>
                <td className={cn(TD, "w-40 min-w-36")}>
                  <UnitStatusBadges
                    isPublished={row.isPublished}
                    isAvailable={row.isAvailable}
                    isPromoActive={row.isPromoActive}
                    isFeatured={row.isFeatured}
                  />
                </td>
                <td className={cn(TD, "hidden whitespace-nowrap xl:table-cell")}>
                  <p className="text-ink-2">{formatDateCompact(row.updatedAt)}</p>
                  <p className="text-caption text-muted">{formatTime(row.updatedAt)}</p>
                </td>
                <td className={cn(TD, "pr-3 pl-1")}>
                  <div className="flex items-center justify-end gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button asChild variant="quiet" size="icon">
                          <Link href={`/admin/units/${row.id}`} aria-label={`Ubah ${row.name}`}>
                            <Pencil aria-hidden="true" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ubah</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="quiet"
                          size="icon"
                          className="hidden xl:inline-flex"
                          aria-label={`Duplikat ${row.name}`}
                          disabled={busy}
                          onClick={() => actions.onDuplicate(row)}
                        >
                          <Copy aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Duplikat sebagai draft</TooltipContent>
                    </Tooltip>
                    <UnitRowMenu row={row} actions={actions} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
