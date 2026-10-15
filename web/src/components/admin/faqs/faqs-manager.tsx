"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { CircleHelp, Ellipsis, House, Info, Pencil, Plus, SearchX, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/kit/confirm-dialog";
import { AdminPageHeader } from "@/components/admin/kit/form-card";
import { SearchInput } from "@/components/admin/kit/search-input";
import { FilterChips, OrderButtons, useReorderFocus, type Direction } from "@/components/admin/landmarks/list-bits";
import { applySortUpdates, planReorder, type SortItem } from "@/components/admin/locations/location-model";
import { EmptyState } from "@/components/public/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { deleteFaq, reorderFaq, toggleFaqActive } from "@/lib/actions/admin/faqs";
import { cn } from "@/lib/utils";
import { FaqFormDialog } from "./faq-form-dialog";
import {
  FAQ_CHIPS,
  answerPreview,
  faqChipCounts,
  filterFaqs,
  homeFaqIds,
  mentionsLegacyButton,
  nextFaqSortOrder,
  type AdminFaqRow,
  type FaqChip,
} from "./faq-model";

type DialogState = { faq: AdminFaqRow | null; key: string } | null;
type Patch = { kind: "active"; id: number; isActive: boolean } | { kind: "order"; updates: SortItem[] };

const NETWORK_ERROR = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";
const REORDER_PAUSED = "Hapus pencarian dan pilih saringan Semua untuk mengubah urutan.";

// Satu struktur untuk HP dan desktop: kartu bertumpuk kalau kartu sempit, baris tabel kalau lebar
// (container query, karena lebar kartu bergantung pada sidebar, bukan hanya lebar layar).
const DESKTOP_COLUMNS = "@2xl:grid-cols-[2.75rem_minmax(0,1fr)_6rem_4.5rem_6rem]";

/** Daftar FAQ (PRD 7.7): cari, saring status, aktif/nonaktif langsung, urutan naik/turun, tambah/ubah/hapus. */
export function FaqsManager({ faqs }: { faqs: AdminFaqRow[] }) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<FaqChip>("semua");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AdminFaqRow | null>(null);
  const [deleting, startDelete] = useTransition();
  const [, startToggle] = useTransition();
  const [moving, startMove] = useTransition();
  const [rows, applyPatch] = useOptimistic(faqs, (state: AdminFaqRow[], patch: Patch) =>
    patch.kind === "active"
      ? state.map((row) => (row.id === patch.id ? { ...row, isActive: patch.isActive } : row))
      : applySortUpdates(state, patch.updates),
  );
  const rememberFocus = useReorderFocus(moving, rows);

  const counts = faqChipCounts(rows, query);
  const visible = filterFaqs(rows, query, chip);
  const onHome = homeFaqIds(rows);
  const filtering = query.trim().length > 0 || chip !== "semua";

  function openDialog(faq: AdminFaqRow | null) {
    setDialog({ faq, key: `${faq?.id ?? "baru"}-${Date.now()}` });
    setDialogOpen(true);
  }

  function toggleActive(row: AdminFaqRow, isActive: boolean) {
    startToggle(async () => {
      applyPatch({ kind: "active", id: row.id, isActive });
      try {
        const result = await toggleFaqActive({ id: row.id, isActive });
        if (result.ok) toast.success(result.message ?? "Perubahan disimpan");
        else toast.error(result.error);
      } catch {
        toast.error(NETWORK_ERROR);
      }
    });
  }

  function move(row: AdminFaqRow, direction: Direction) {
    const plan = planReorder(rows, row.id, direction);
    if (!plan) return;
    rememberFocus(row.id, direction);
    startMove(async () => {
      applyPatch({ kind: "order", updates: plan });
      try {
        const result = await reorderFaq({ id: row.id, direction });
        if (result.ok) toast.success(result.message ?? "Urutan disimpan");
        else toast.error(result.error);
      } catch {
        toast.error(NETWORK_ERROR);
      }
    });
  }

  function confirmDelete() {
    const target = toDelete;
    if (!target) return;
    startDelete(async () => {
      try {
        const result = await deleteFaq(target.id);
        if (result.ok) {
          toast.success(result.message ?? "Pertanyaan dihapus");
          setToDelete(null);
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error(NETWORK_ERROR);
      }
    });
  }

  function resetFilters() {
    setQuery("");
    setChip("semua");
  }

  const addButton = (
    <Button onClick={() => openDialog(null)}>
      <Plus aria-hidden="true" />
      Tambah pertanyaan
    </Button>
  );

  return (
    <>
      {/* Saat kosong, tombol tambah hanya ada di empty state (satu tombol per layar). */}
      <AdminPageHeader
        description="Pertanyaan yang sering ditanyakan tamu, berlaku untuk semua apartemen."
        actions={faqs.length > 0 ? addButton : undefined}
      />

      <p className="mb-4 flex items-start gap-2 rounded-control bg-brand-50/60 px-3.5 py-3 text-sm text-ink-2 ring-1 ring-brand-200/70">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
        <span>FAQ tampil di beranda (5 teratas), halaman apartemen, dan detail unit.</span>
      </p>

      {faqs.length === 0 ? (
        <div className="glass-card rounded-card">
          <EmptyState
            icon={CircleHelp}
            title="Belum ada pertanyaan"
            description="Tambah pertanyaan yang paling sering ditanyakan tamu, mis. jam check-in atau parkir."
            action={addButton}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            <SearchInput
              value={query}
              onSearch={setQuery}
              label="Cari pertanyaan"
              placeholder="Cari di pertanyaan atau jawaban…"
              debounceMs={150}
              className="sm:max-w-md"
            />
            <FilterChips items={FAQ_CHIPS} value={chip} counts={counts} onChange={setChip} label="Saring status pertanyaan" />
            {filtering && visible.length > 1 ? <p className="text-sm text-ink-2">{REORDER_PAUSED}</p> : null}
          </div>

          <div className="@container glass-card overflow-clip rounded-card" aria-busy={moving || undefined}>
            {visible.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Tidak ada pertanyaan yang cocok"
                description={query ? `Tidak ada hasil untuk "${query}".` : "Coba pilihan saring lain."}
                action={
                  <Button variant="secondary" onClick={resetFilters}>
                    {query ? "Hapus pencarian" : "Tampilkan semua"}
                  </Button>
                }
              />
            ) : (
              <>
                <div
                  aria-hidden="true"
                  className={cn(
                    "sticky top-16 z-10 hidden h-11 items-center gap-x-4 border-b border-line bg-white px-4 text-caption font-semibold text-muted @2xl:grid",
                    DESKTOP_COLUMNS,
                  )}
                >
                  <span>No.</span>
                  <span>Pertanyaan</span>
                  <span>Urutan</span>
                  <span>Aktif</span>
                  <span className="text-right">Aksi</span>
                </div>
                <ul className="divide-y divide-line">
                  {visible.map((row, index) => (
                    <FaqRowItem
                      key={row.id}
                      row={row}
                      onHome={onHome.has(row.id)}
                      isFirst={index === 0}
                      isLast={index === visible.length - 1}
                      reorderDisabled={filtering || moving}
                      reorderReason={filtering ? REORDER_PAUSED : undefined}
                      onEdit={() => openDialog(row)}
                      onDelete={() => setToDelete(row)}
                      onToggle={(next) => toggleActive(row, next)}
                      onMove={(direction) => move(row, direction)}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>

          <p className="text-caption text-muted">
            {visible.length} dari {faqs.length} pertanyaan ditampilkan.
          </p>
        </div>
      )}

      <FaqFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        faq={dialog?.faq ?? null}
        defaultSortOrder={nextFaqSortOrder(faqs)}
        formKey={dialog?.key ?? "kosong"}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title="Hapus pertanyaan ini?"
        description={
          toDelete
            ? `"${toDelete.question}" hilang dari beranda, halaman apartemen, dan detail unit. Tindakan ini tidak bisa dibatalkan.`
            : undefined
        }
        confirmLabel="Hapus pertanyaan"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}

type RowProps = {
  row: AdminFaqRow;
  onHome: boolean;
  isFirst: boolean;
  isLast: boolean;
  reorderDisabled: boolean;
  reorderReason?: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (isActive: boolean) => void;
  onMove: (direction: Direction) => void;
};

function FaqRowItem({ row, onHome, isFirst, isLast, reorderDisabled, reorderReason, onEdit, onDelete, onToggle, onMove }: RowProps) {
  const uid = useId();
  const questionId = `${uid}-tanya`;
  const switchId = `${uid}-aktif`;
  const switchLabelId = `${uid}-aktif-label`;
  const legacyButton = mentionsLegacyButton(row.question) || mentionsLegacyButton(row.answer);
  // Label tombol: pertanyaan dipotong supaya pembaca layar tidak membaca kalimat panjang.
  const shortName = row.question.length > 60 ? `${row.question.slice(0, 57).trimEnd()}…` : row.question;

  return (
    <li
      className={cn(
        "grid grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3.5 transition-colors hover:bg-surface @2xl:min-h-16 @2xl:items-center @2xl:gap-x-4 @2xl:gap-y-0 @2xl:py-2.5",
        DESKTOP_COLUMNS,
      )}
    >
      <span
        className={cn(
          "col-start-1 row-start-1 flex size-11 items-center justify-center rounded-control text-sm font-bold tabular-nums",
          row.isActive ? "bg-brand-50 text-brand-700" : "bg-surface-2 text-muted",
        )}
      >
        <span className="sr-only">Urutan </span>
        {row.sortOrder}
      </span>

      <div className="col-start-2 row-start-1 min-w-0 self-center">
        <p id={questionId} className={cn("font-semibold break-words", row.isActive ? "text-ink" : "text-ink-2")}>
          {row.question}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm break-words text-muted">{answerPreview(row.answer)}</p>
        {onHome || !row.isActive || legacyButton ? (
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {onHome ? (
              <Badge variant="promo">
                <House aria-hidden="true" />
                Tampil di beranda
              </Badge>
            ) : null}
            {!row.isActive ? <Badge variant="neutral">Nonaktif</Badge> : null}
            {legacyButton ? (
              <Badge variant="warning">
                <TriangleAlert aria-hidden="true" />
                Sebut tombol lama
              </Badge>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="col-span-3 col-start-1 row-start-2 mt-2 flex min-h-11 items-center justify-between gap-3 border-t border-line pt-2 @2xl:contents">
        <div className="flex items-center gap-3 @2xl:col-start-4 @2xl:row-start-1">
          <label id={switchLabelId} htmlFor={switchId} className="text-sm text-ink-2 @2xl:sr-only">
            Aktif
          </label>
          <Switch
            id={switchId}
            checked={row.isActive}
            onCheckedChange={onToggle}
            aria-labelledby={`${switchLabelId} ${questionId}`}
          />
        </div>
        <OrderButtons
          id={row.id}
          name={shortName}
          isFirst={isFirst}
          isLast={isLast}
          disabled={reorderDisabled}
          disabledReason={reorderReason}
          onMove={onMove}
          className="-mr-2 @2xl:col-start-3 @2xl:row-start-1 @2xl:mr-0"
        />
      </div>

      <div className="col-start-3 row-start-1 -mr-2 flex items-start justify-end gap-1 @2xl:col-start-5 @2xl:mr-0 @2xl:items-center">
        <Button variant="quiet" size="icon" onClick={onEdit} aria-label={`Ubah ${shortName}`}>
          <Pencil aria-hidden="true" />
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="quiet" size="icon" aria-label={`Aksi untuk ${shortName}`}>
              <Ellipsis aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="min-h-11 gap-2.5 px-3 text-[15px]" onSelect={onEdit}>
              <Pencil aria-hidden="true" />
              Ubah
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" className="min-h-11 gap-2.5 px-3 text-[15px]" onSelect={onDelete}>
              <Trash2 aria-hidden="true" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
