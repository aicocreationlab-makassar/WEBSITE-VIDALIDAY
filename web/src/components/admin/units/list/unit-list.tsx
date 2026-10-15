"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BedDouble, ListChecks, LoaderCircle, Plus, SearchX, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/kit/confirm-dialog";
import { Pagination } from "@/components/admin/kit/pagination";
import { SearchInput } from "@/components/admin/kit/search-input";
import { useUrlParams } from "@/components/admin/kit/use-url-params";
import { EmptyState } from "@/components/public/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/admin/guard";
import { deleteUnit, duplicateUnit, toggleAvailability, toggleFeatured } from "@/lib/actions/admin/units-list";
import { ADMIN_PAGE_SIZE, type AdminUnitFilter, type AdminUnitQueryResult, type AdminUnitRow } from "@/lib/admin/unit-query";
import type { AdminLocationOption } from "@/lib/data/admin/units";
import { cn } from "@/lib/utils";
import { BulkBar } from "./bulk-bar";
import type { RowActions } from "./types";
import { UnitCards } from "./unit-cards";
import { FilterSheet, InlineFilters } from "./unit-filters";
import {
  activeChip,
  chipChanges,
  freshSelection,
  hasActiveFilters,
  panelChanges,
  panelFilterCount,
  panelFromFilter,
  QUICK_CHIPS,
  setPageSelected,
  toggleSelected,
} from "./unit-list-model";
import { UnitTable } from "./unit-table";
import { LG_QUERY, MD_QUERY, useBreakpoint } from "./use-breakpoint";

const NETWORK_ERROR = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";

export type UnitListProps = {
  result: AdminUnitQueryResult;
  filter: AdminUnitFilter;
  locations: AdminLocationOption[];
};

/**
 * Daftar unit admin (PRD 7.4, UX 2.7): pencarian, filter, chip cepat, tabel (desktop) / kartu (HP),
 * ubah harga cepat, aksi per baris, mode pilih + aksi massal, paginasi. State filter di URL.
 */
export function UnitList({ result, filter, locations }: UnitListProps) {
  const router = useRouter();
  const { update, reset, pending } = useUrlParams();
  const md = useBreakpoint(MD_QUERY);
  const lg = useBreakpoint(LG_QUERY);
  const listRef = useRef<HTMLDivElement>(null);

  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<Map<number, AdminUnitRow>>(() => new Map());
  const [deleteTarget, setDeleteTarget] = useState<AdminUnitRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [, startAction] = useTransition();

  const rows = result.items;
  const chip = activeChip(filter);
  const filtersActive = hasActiveFilters(filter);
  const panel = panelFromFilter(filter);
  const location = filter.lokasi ? locations.find((l) => l.id === filter.lokasi) : undefined;

  function runRow<T>(row: AdminUnitRow, call: () => Promise<ActionResult<T>>, onOk?: (data: T | undefined) => void) {
    setBusyId(row.id);
    startAction(async () => {
      try {
        const res = await call();
        if (res.ok) {
          toast.success(res.message ?? "Perubahan disimpan");
          onOk?.(res.data);
        } else {
          toast.error(res.error);
        }
      } catch {
        toast.error(NETWORK_ERROR);
      } finally {
        setBusyId(null);
      }
    });
  }

  const actions: RowActions = {
    busyId,
    onToggleAvailable: (row) => runRow(row, () => toggleAvailability({ id: row.id, value: !row.isAvailable })),
    onToggleFeatured: (row) => runRow(row, () => toggleFeatured({ id: row.id, value: !row.isFeatured })),
    onDuplicate: (row) =>
      runRow(
        row,
        () => duplicateUnit({ id: row.id }),
        (data) => {
          if (data) router.push(`/admin/units/${data.id}`);
        },
      ),
    onDelete: (row) => {
      setDeleteTarget(row);
      setDeleteOpen(true);
    },
  };

  function confirmDelete() {
    const row = deleteTarget;
    if (!row) return;
    runRow(
      row,
      () => deleteUnit({ id: row.id }),
      () => {
        setDeleteOpen(false);
        setSelection((current) => {
          if (!current.has(row.id)) return current;
          const next = new Map(current);
          next.delete(row.id);
          return next;
        });
      },
    );
  }

  function exitSelecting() {
    setSelecting(false);
    setSelection(new Map());
  }

  function goToPage(page: number) {
    update({ hal: page > 1 ? page : null });
    const top = listRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) window.scrollTo({ top: window.scrollY + top - 140 });
  }

  const selectionProps = {
    selecting,
    selection,
    onToggle: (row: AdminUnitRow) => setSelection((current) => toggleSelected(current, row)),
    onTogglePage: (checked: boolean) => setSelection((current) => setPageSelected(current, rows, checked)),
  };

  const resetFilters = () => reset(["urut"]);

  // Empty state: belum ada unit sama sekali / apartemen terpilih belum punya unit / filter tanpa hasil.
  let empty: React.ReactNode = null;
  if (result.grandTotal === 0) {
    empty = (
      <EmptyState
        icon={BedDouble}
        title="Belum ada unit. Tambah unit pertama."
        description="Unit baru bisa disimpan sebagai draft dulu sebelum tampil di situs."
        action={
          <Button asChild>
            <Link href="/admin/units/new">
              <Plus aria-hidden="true" />
              Tambah unit
            </Link>
          </Button>
        }
      />
    );
  } else if (result.total === 0 && location && !filter.q && !filter.tipe && result.counts.semua === 0) {
    empty = (
      <EmptyState
        icon={BedDouble}
        title={`Belum ada unit di ${location.name}. Tambah unit pertama.`}
        action={
          <Button asChild>
            <Link href={`/admin/units/new?lokasi=${location.id}`}>
              <Plus aria-hidden="true" />
              Tambah unit
            </Link>
          </Button>
        }
      />
    );
  } else if (result.total === 0) {
    empty = (
      <EmptyState
        icon={SearchX}
        title="Tidak ada unit untuk filter ini."
        description="Coba kata kunci lain atau kurangi filter."
        action={
          <Button variant="secondary" onClick={resetFilters}>
            Reset filter
          </Button>
        }
      />
    );
  }

  return (
    <div>
      {/* Toolbar: menempel di bawah topbar di HP. */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-line/70 bg-surface/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex items-center gap-2">
          <SearchInput
            value={filter.q}
            onSearch={(q) => update({ q: q || null })}
            label="Cari unit"
            placeholder="Cari nama unit, tower, tipe…"
            className="flex-1 lg:max-w-md"
          />
          {lg !== true ? (
            <div className={cn("shrink-0", lg === null && "lg:hidden")}>
              <FilterSheet
                value={panel}
                locations={locations}
                count={panelFilterCount(filter)}
                side={md ? "right" : "bottom"}
                onApply={(next) => update(panelChanges(next))}
              />
            </div>
          ) : null}
          <Button
            type="button"
            variant={selecting ? "outline" : "secondary"}
            aria-pressed={selecting}
            className="h-12 shrink-0 max-sm:px-3.5 lg:ml-auto"
            onClick={() => (selecting ? exitSelecting() : setSelecting(true))}
          >
            <ListChecks className="max-sm:hidden" aria-hidden="true" />
            Pilih
          </Button>
        </div>
        {lg !== false ? (
          <div className={cn("mt-3", lg === null && "hidden lg:block")}>
            <InlineFilters value={panel} locations={locations} onChange={(changes) => update(changes)} />
          </div>
        ) : null}
      </div>

      {/* Chip cepat (gulir horizontal di HP). */}
      <div
        role="group"
        aria-label="Filter cepat"
        className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        {QUICK_CHIPS.map(({ key, label }) => {
          const active = chip === key;
          const count = result.counts[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => update(chipChanges(active && key !== "semua" ? "semua" : key))}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-brand-500/20",
                active
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-line bg-white text-ink-2 hover:bg-surface-2",
              )}
            >
              {key === "cek" && count > 0 ? <TriangleAlert className="size-4 text-warning" aria-hidden="true" /> : null}
              {label}
              <span
                className={cn(
                  "min-w-6 rounded-full px-1.5 text-center text-caption font-bold tabular-nums",
                  active ? "bg-white text-brand-700" : "bg-surface-2 text-ink-2",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex min-h-11 flex-wrap items-center gap-x-3 text-sm text-muted">
        <p aria-live="polite">
          <span className="font-semibold text-ink-2 tabular-nums">{result.total}</span> dari{" "}
          <span className="tabular-nums">{result.grandTotal}</span> unit
        </p>
        {filtersActive && result.total > 0 ? (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Reset filter
          </button>
        ) : null}
        {pending ? (
          <span className="inline-flex items-center gap-1.5">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Memuat
          </span>
        ) : null}
      </div>

      <div
        ref={listRef}
        aria-busy={pending || undefined}
        className={cn("mt-2 transition-opacity duration-150", pending && "pointer-events-none opacity-60")}
      >
        {empty ? (
          <div className="glass-card rounded-card">{empty}</div>
        ) : (
          <>
            {lg !== false ? (
              <div className={cn(lg === null && "hidden lg:block")}>
                <UnitTable rows={rows} actions={actions} desktop={md} {...selectionProps} />
              </div>
            ) : null}
            {lg !== true ? (
              <div className={cn(lg === null && "lg:hidden")}>
                <UnitCards rows={rows} actions={actions} desktop={md} {...selectionProps} />
              </div>
            ) : null}
            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              total={result.total}
              pageSize={ADMIN_PAGE_SIZE}
              noun="unit"
              onPage={goToPage}
            />
          </>
        )}

        {selecting ? (
          <BulkBar
            selected={freshSelection(selection, rows)}
            locations={locations}
            onClear={() => setSelection(new Map())}
            onExit={exitSelecting}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Hapus unit ${deleteTarget?.name ?? ""}?`}
        description="Foto ikut terhapus dan tidak bisa dikembalikan."
        confirmLabel="Hapus unit"
        cancelLabel="Batal"
        destructive
        loading={deleteTarget !== null && busyId === deleteTarget.id}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
