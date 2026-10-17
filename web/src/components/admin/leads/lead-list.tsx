"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Download, Inbox, ListChecks, LoaderCircle, SearchX } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/kit/confirm-dialog";
import { Pagination } from "@/components/admin/kit/pagination";
import { SearchInput } from "@/components/admin/kit/search-input";
import { LEAD_STATUSES } from "@/components/admin/kit/status-badge";
import { useUrlParams } from "@/components/admin/kit/use-url-params";
import { LG_QUERY, MD_QUERY, useBreakpoint } from "@/components/admin/units/list/use-breakpoint";
import { EmptyState } from "@/components/public/shared/empty-state";
import { Button } from "@/components/ui/button";
import { deleteLeads, updateLead } from "@/lib/actions/admin/leads";
import {
  LEADS_EXPORT_LIMIT,
  LEADS_PAGE_SIZE,
  type LeadFilter,
  type LeadRow,
  type LeadStatusValue,
} from "@/lib/admin/lead-query";
import { cn } from "@/lib/utils";
import type { LeadRowActions, LeadSelectionProps } from "./lead-bits";
import { LeadBulkBar } from "./lead-bulk-bar";
import { LeadCards } from "./lead-cards";
import { LeadDetailDialog } from "./lead-detail-dialog";
import { InlineLeadFilters, LeadFilterSheet } from "./lead-filters";
import {
  apartmentOptions,
  applyLeadPatch,
  chipCount,
  deleteConfirmCopy,
  exportHref,
  firstName,
  freshLeadSelection,
  hasActiveLeadFilters,
  panelChanges,
  panelFilterCount,
  panelFromFilter,
  setLeadsPageSelected,
  STATUS_CHIP_KEYS,
  toggleLeadSelected,
  type LeadStatusCounts,
} from "./lead-list-model";
import { LeadTable } from "./lead-table";
import { useMinWidth } from "./use-min-width";

// Tabel dipakai kalau lebar daftar >= 1024px (sama dengan @5xl untuk fallback CSS); di bawahnya kartu.
const TABLE_MIN_WIDTH = 1024;
const NETWORK_ERROR = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";
const DELETE_NETWORK_ERROR = "Gagal menghapus. Periksa koneksi lalu coba lagi.";
const numberFormat = new Intl.NumberFormat("id-ID");

export type LeadListProps = {
  rows: LeadRow[];
  total: number;
  page: number;
  pageCount: number;
  filter: LeadFilter;
  apartments: string[];
  /** Jumlah per status (filter lain tetap berlaku); null kalau gagal dihitung. */
  counts: LeadStatusCounts | null;
};

type DetailState = { lead: LeadRow; focusNotes: boolean; key: string };

/**
 * Daftar permintaan sewa admin (PRD 7.8): pencarian, filter status/apartemen/tanggal, chip status,
 * tabel (desktop) / kartu (HP), ubah status langsung, catatan admin, chat WhatsApp, ekspor CSV,
 * hapus permanen (per baris atau mode "Pilih" dengan bar aksi massal). State filter di URL.
 */
export function LeadList({ rows: serverRows, total, page, pageCount, filter, apartments, counts }: LeadListProps) {
  const { update, reset, pending } = useUrlParams();
  const md = useBreakpoint(MD_QUERY);
  const lg = useBreakpoint(LG_QUERY);
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const wide = useMinWidth(listEl, TABLE_MIN_WIDTH);

  const [rows, applyPatch] = useOptimistic(serverRows, applyLeadPatch);
  const [savingIds, setSavingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [, startAction] = useTransition();

  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<Map<string, LeadRow>>(() => new Map());
  const [deleteTarget, setDeleteTarget] = useState<LeadRow[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  const panel = panelFromFilter(filter);
  const filtersActive = hasActiveLeadFilters(filter);
  const apartmentList = apartmentOptions(apartments, filter.apartemen);

  function markSaving(id: string, saving: boolean) {
    setSavingIds((current) => {
      const next = new Set(current);
      if (saving) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function changeStatus(lead: LeadRow, status: LeadStatusValue) {
    if (lead.status === status) return;
    markSaving(lead.id, true);
    startAction(async () => {
      applyPatch({ id: lead.id, status });
      try {
        const result = await updateLead({ id: lead.id, status });
        if (result.ok) toast.success(result.message ?? "Perubahan disimpan");
        else toast.error(result.error);
      } catch {
        toast.error(NETWORK_ERROR);
      } finally {
        markSaving(lead.id, false);
      }
    });
  }

  function requestDelete(leads: LeadRow[]) {
    if (!leads.length) return;
    setDeleteTarget(leads);
    setDeleteOpen(true);
    // Dialog detail ditutup supaya konfirmasi hapus tidak bertumpuk di atasnya.
    if (detailOpen && leads.some((lead) => lead.id === detail?.lead.id)) setDetailOpen(false);
  }

  function confirmDelete() {
    const ids = deleteTarget.map((lead) => lead.id);
    if (!ids.length) return;
    startDelete(async () => {
      applyPatch({ remove: ids });
      try {
        const result = await deleteLeads({ ids });
        if (result.ok) {
          toast.success(result.message ?? "Permintaan dihapus permanen");
          setDeleteOpen(false);
          setDeleteTarget([]);
          setSelection((current) => {
            const next = new Map(current);
            for (const id of ids) next.delete(id);
            return next;
          });
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error(DELETE_NETWORK_ERROR);
      }
    });
  }

  function exitSelecting() {
    setSelecting(false);
    setSelection(new Map());
  }

  const selectionProps: LeadSelectionProps = {
    selecting,
    selection,
    onToggle: (lead) => setSelection((current) => toggleLeadSelected(current, lead)),
    onTogglePage: (checked) => setSelection((current) => setLeadsPageSelected(current, rows, checked)),
  };

  const actions: LeadRowActions = {
    savingIds,
    onStatus: changeStatus,
    onDelete: requestDelete,
    onOpen: (lead, focusNotes = false) => {
      setDetail({ lead, focusNotes, key: `${lead.id}-${Date.now()}` });
      setDetailOpen(true);
    },
    onChat: (lead) => {
      // Setelah membuka chat, tawarkan menandai permintaan baru sebagai "Dihubungi".
      if (lead.status !== "baru") return;
      toast(`Sudah menghubungi ${firstName(lead.full_name)}?`, {
        id: `chat-${lead.id}`,
        description: `Tandai ${lead.code} sebagai dihubungi supaya tidak terlewat.`,
        duration: 12000,
        action: { label: "Tandai dihubungi", onClick: () => changeStatus(lead, "dihubungi") },
      });
    },
  };

  function goToPage(next: number) {
    update({ hal: next > 1 ? next : null });
    const top = listEl?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) window.scrollTo({ top: window.scrollY + top - 140 });
  }

  const resetFilters = () => reset();
  const href = exportHref(filter);

  let empty: React.ReactNode = null;
  if (total === 0 && !filtersActive) {
    empty = (
      <EmptyState
        icon={Inbox}
        title="Belum ada permintaan sewa."
        description="Permintaan dari tombol Sewa sekarang di situs akan muncul di sini, lengkap dengan tanggal dan nomor WhatsApp tamu."
      />
    );
  } else if (total === 0) {
    empty = (
      <EmptyState
        icon={SearchX}
        title="Tidak ada permintaan untuk filter ini."
        description="Coba kata kunci lain, ubah rentang tanggal, atau kurangi filter."
        action={
          <Button variant="secondary" onClick={resetFilters}>
            Reset filter
          </Button>
        }
      />
    );
  }

  const exportButton =
    total > 0 ? (
      <Button asChild variant="secondary" className="h-12 shrink-0 max-sm:w-12 max-sm:px-0 lg:ml-auto">
        <a
          href={href}
          download
          title={total > LEADS_EXPORT_LIMIT ? `Berisi ${numberFormat.format(LEADS_EXPORT_LIMIT)} permintaan terbaru sesuai filter.` : undefined}
          onClick={() => {
            if (total > LEADS_EXPORT_LIMIT) {
              toast.info(`Ekspor berisi ${numberFormat.format(LEADS_EXPORT_LIMIT)} permintaan terbaru. Persempit filter untuk data lainnya.`);
            }
          }}
        >
          <Download aria-hidden="true" />
          <span className="max-sm:sr-only">Ekspor CSV</span>
        </a>
      </Button>
    ) : (
      <Button
        type="button"
        variant="secondary"
        disabled
        title="Tidak ada data untuk diekspor"
        className="h-12 shrink-0 max-sm:w-12 max-sm:px-0 lg:ml-auto"
      >
        <Download aria-hidden="true" />
        <span className="max-sm:sr-only">Ekspor CSV</span>
      </Button>
    );

  return (
    <div>
      {/* Toolbar: menempel di bawah topbar di HP. */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-line/70 bg-surface/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex items-center gap-2">
          <SearchInput
            value={filter.q}
            onSearch={(q) => update({ q: q || null })}
            label="Cari permintaan sewa"
            placeholder="Cari nama, nomor, atau kode…"
            className="flex-1 lg:max-w-md"
          />
          {lg !== true ? (
            <div className={cn("shrink-0", lg === null && "lg:hidden")}>
              <LeadFilterSheet
                value={panel}
                apartments={apartmentList}
                count={panelFilterCount(panel)}
                side={md ? "right" : "bottom"}
                onApply={(next) => update(panelChanges(next))}
              />
            </div>
          ) : null}
          {exportButton}
          {total > 0 ? (
            <Button
              type="button"
              variant={selecting ? "outline" : "secondary"}
              aria-pressed={selecting}
              className="h-12 shrink-0 max-sm:w-12 max-sm:px-0"
              onClick={() => (selecting ? exitSelecting() : setSelecting(true))}
            >
              <ListChecks aria-hidden="true" />
              <span className="max-sm:sr-only">Pilih</span>
            </Button>
          ) : null}
        </div>
        {lg !== false ? (
          <div className={cn("mt-3", lg === null && "hidden lg:block")}>
            <InlineLeadFilters value={panel} apartments={apartmentList} onChange={(changes) => update(changes)} />
          </div>
        ) : null}
      </div>

      {/* Chip status (gulir horizontal di HP). */}
      <div
        role="group"
        aria-label="Saring status"
        className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        {STATUS_CHIP_KEYS.map((key) => {
          const active = (filter.status ?? "semua") === key;
          const count = chipCount(counts, key);
          const label = key === "semua" ? "Semua" : (LEAD_STATUSES.find((item) => item.value === key)?.label ?? key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => update({ status: key === "semua" || active ? null : key })}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-brand-500/20",
                active ? "border-brand-200 bg-brand-50 text-brand-700" : "border-line bg-white text-ink-2 hover:bg-surface-2",
              )}
            >
              {label}
              {count !== null ? (
                <span
                  className={cn(
                    "min-w-6 rounded-full px-1.5 text-center text-caption font-bold tabular-nums",
                    active ? "bg-white text-brand-700" : key === "baru" && count > 0 ? "bg-brand-600 text-white" : "bg-surface-2 text-ink-2",
                  )}
                >
                  {numberFormat.format(count)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex min-h-11 flex-wrap items-center gap-x-3 text-sm text-muted">
        <p aria-live="polite">
          <span className="font-semibold text-ink-2 tabular-nums">{numberFormat.format(total)}</span> permintaan
        </p>
        {filtersActive && total > 0 ? (
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
        ref={setListEl}
        aria-busy={pending || undefined}
        className={cn("@container mt-2 transition-opacity duration-150", pending && "pointer-events-none opacity-60")}
      >
        {empty ? (
          <div className="glass-card rounded-card">{empty}</div>
        ) : (
          <>
            {wide !== false ? (
              <div className={cn(wide === null && "hidden @5xl:block")}>
                <LeadTable rows={rows} actions={actions} {...selectionProps} />
              </div>
            ) : null}
            {wide !== true ? (
              <div className={cn(wide === null && "@5xl:hidden")}>
                <LeadCards rows={rows} actions={actions} {...selectionProps} />
              </div>
            ) : null}
            <Pagination
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={LEADS_PAGE_SIZE}
              noun="permintaan"
              onPage={goToPage}
            />
          </>
        )}

        {selecting ? (
          <LeadBulkBar
            selected={freshLeadSelection(selection, rows)}
            pending={deleting}
            onClear={() => setSelection(new Map())}
            onExit={exitSelecting}
            onDelete={requestDelete}
          />
        ) : null}
      </div>

      {detail ? (
        <LeadDetailDialog
          key={detail.key}
          lead={detail.lead}
          focusNotes={detail.focusNotes}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onChat={actions.onChat}
          onDelete={(lead) => requestDelete([lead])}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(next) => {
          setDeleteOpen(next);
          if (!next) setDeleteTarget([]);
        }}
        {...deleteConfirmCopy(deleteTarget)}
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
