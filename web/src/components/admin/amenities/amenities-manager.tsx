"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { AirVent, Ellipsis, Pencil, Plus, SearchX, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/kit/confirm-dialog";
import { AdminPageHeader } from "@/components/admin/kit/form-card";
import { SearchInput } from "@/components/admin/kit/search-input";
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
import { deleteAmenity, toggleAmenityActive } from "@/lib/actions/admin/amenities";
import { Icon, resolveAmenityIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { AmenityFormDialog } from "./amenity-form-dialog";
import {
  AMENITY_CHIPS,
  chipCounts,
  deleteDescription,
  filterAmenities,
  needsIcon,
  nextSortOrder,
  usageLabel,
  type AdminAmenityRow,
  type AmenityChip,
} from "./amenity-model";

type DialogState = { amenity: AdminAmenityRow | null; key: string } | null;
type ActivePatch = { id: number; isActive: boolean };

// Satu struktur untuk HP dan desktop: kartu bertumpuk di bawah md, baris tabel 64px di md ke atas
// (grid yang sama, posisi sel diatur per breakpoint). Tidak ada elemen ganda di DOM.
const DESKTOP_COLUMNS = "md:grid-cols-[2.75rem_minmax(0,1fr)_8.5rem_4.5rem_5rem_6rem]";

/** Daftar fasilitas kamar: cari, saring, aktif/nonaktif langsung, tambah/ubah/hapus (PRD 7.6). */
export function AmenitiesManager({ amenities }: { amenities: AdminAmenityRow[] }) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<AmenityChip>("semua");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AdminAmenityRow | null>(null);
  const [deleting, startDelete] = useTransition();
  const [, startToggle] = useTransition();
  const [rows, applyActive] = useOptimistic(amenities, (state: AdminAmenityRow[], patch: ActivePatch) =>
    state.map((row) => (row.id === patch.id ? { ...row, isActive: patch.isActive } : row)),
  );

  const counts = chipCounts(rows, query);
  const visible = filterAmenities(rows, query, chip);

  function openDialog(amenity: AdminAmenityRow | null) {
    setDialog({ amenity, key: `${amenity?.id ?? "baru"}-${Date.now()}` });
    setDialogOpen(true);
  }

  function toggleActive(row: AdminAmenityRow, isActive: boolean) {
    startToggle(async () => {
      applyActive({ id: row.id, isActive });
      const result = await toggleAmenityActive({ id: row.id, isActive });
      if (result.ok) toast.success(result.message ?? "Perubahan disimpan");
      else toast.error(result.error);
    });
  }

  function confirmDelete() {
    const target = toDelete;
    if (!target) return;
    startDelete(async () => {
      const result = await deleteAmenity(target.id);
      if (result.ok) {
        toast.success(result.message ?? "Fasilitas dihapus");
        setToDelete(null);
      } else {
        toast.error(result.error);
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
      Tambah fasilitas
    </Button>
  );

  return (
    <>
      {/* Saat kosong, tombol tambah hanya ada di empty state (satu tombol "Tambah fasilitas" per layar). */}
      <AdminPageHeader
        description="Fasilitas di dalam unit, mis. AC, WiFi, dan dapur. Dipilih di form unit dan tampil di halaman unit dengan ikonnya."
        actions={amenities.length > 0 ? addButton : undefined}
      />

      {amenities.length === 0 ? (
        <div className="glass-card rounded-card">
          <EmptyState
            icon={AirVent}
            title="Belum ada fasilitas kamar"
            description="Tambah fasilitas pertama, mis. AC, WiFi, atau dapur, supaya bisa dipilih di form unit."
            action={addButton}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            <SearchInput
              value={query}
              onSearch={setQuery}
              label="Cari fasilitas"
              placeholder="Cari nama fasilitas…"
              debounceMs={150}
              className="sm:max-w-md"
            />
            <div role="group" aria-label="Saring fasilitas" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {AMENITY_CHIPS.map((item) => {
                const active = chip === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setChip(item.value)}
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-brand-500/20 focus-visible:outline-none",
                      active
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-line bg-white text-ink-2 hover:bg-surface-2",
                    )}
                  >
                    {item.label}
                    <span
                      className={cn(
                        "min-w-6 rounded-full px-1.5 text-center text-caption tabular-nums",
                        active ? "bg-white/20 text-white" : "bg-surface-2 text-ink-2",
                      )}
                    >
                      {counts[item.value]}
                    </span>
                  </button>
                );
              })}
            </div>
            {chip === "tanpa-ikon" && visible.length > 0 ? (
              <p className="text-sm text-ink-2">
                Situs sementara menebak ikon dari nama. Pilih ikon yang pas lewat tombol ubah supaya tampil konsisten.
              </p>
            ) : null}
          </div>

          <div className="glass-card overflow-clip rounded-card">
            <div
              aria-hidden="true"
              className={cn(
                "sticky top-16 z-10 hidden h-11 items-center gap-x-4 border-b border-line bg-white px-4 text-caption font-semibold text-muted md:grid",
                DESKTOP_COLUMNS,
              )}
            >
              <span>Ikon</span>
              <span>Nama</span>
              <span>Dipakai</span>
              <span>Urutan</span>
              <span>Aktif</span>
              <span className="text-right">Aksi</span>
            </div>

            {visible.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Tidak ada fasilitas yang cocok"
                description={query ? `Tidak ada hasil untuk "${query}".` : "Coba pilihan saring lain."}
                action={
                  <Button variant="secondary" onClick={resetFilters}>
                    {query ? "Hapus pencarian" : "Tampilkan semua"}
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {visible.map((row) => (
                  <AmenityRowItem
                    key={row.id}
                    row={row}
                    onEdit={() => openDialog(row)}
                    onDelete={() => setToDelete(row)}
                    onToggle={(next) => toggleActive(row, next)}
                  />
                ))}
              </ul>
            )}
          </div>

          <p className="text-caption text-muted">
            {visible.length} dari {amenities.length} fasilitas ditampilkan.
          </p>
        </div>
      )}

      <AmenityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        amenity={dialog?.amenity ?? null}
        defaultSortOrder={nextSortOrder(amenities)}
        formKey={dialog?.key ?? "kosong"}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title={toDelete ? `Hapus fasilitas ${toDelete.name}?` : "Hapus fasilitas?"}
        description={toDelete ? deleteDescription(toDelete.usage) : undefined}
        confirmLabel="Hapus fasilitas"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}

type RowProps = {
  row: AdminAmenityRow;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (isActive: boolean) => void;
};

function AmenityRowItem({ row, onEdit, onDelete, onToggle }: RowProps) {
  const uid = useId();
  const nameId = `${uid}-nama`;
  const switchId = `${uid}-aktif`;
  const switchLabelId = `${uid}-aktif-label`;
  const missingIcon = needsIcon(row.icon);

  return (
    <li
      className={cn(
        "grid grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3.5 transition-colors hover:bg-surface md:min-h-16 md:items-center md:gap-x-4 md:gap-y-0 md:py-2",
        DESKTOP_COLUMNS,
      )}
    >
      {/* Ikon yang tampil di situs (ikon tersimpan, atau tebakan dari nama). */}
      <span
        className={cn(
          "col-start-1 row-span-2 row-start-1 flex size-11 items-center justify-center rounded-control md:row-span-1",
          row.isActive ? "bg-brand-50 text-brand-600" : "bg-surface-2 text-subtle",
        )}
      >
        <Icon name={resolveAmenityIcon(row.name, row.icon)} className="size-5" />
      </span>

      <div className="col-start-2 row-start-1 flex min-w-0 flex-col items-start gap-1 self-center md:flex-row md:flex-wrap md:items-center md:gap-2">
        <span id={nameId} className={cn("max-w-full truncate font-semibold", row.isActive ? "text-ink" : "text-ink-2")}>
          {row.name}
        </span>
        {missingIcon ? (
          <Badge variant="warning">
            <TriangleAlert aria-hidden="true" />
            Ikon belum dipilih
          </Badge>
        ) : null}
      </div>

      <div className="col-span-2 col-start-2 row-start-2 flex flex-wrap items-center gap-x-2 text-caption text-muted md:contents">
        <span className="md:col-start-3 md:row-start-1 md:text-sm md:text-ink-2">{usageLabel(row.usage)}</span>
        <span aria-hidden="true" className="md:hidden">
          ·
        </span>
        <span className="tabular-nums md:col-start-4 md:row-start-1 md:text-sm md:text-ink-2">
          <span className="md:sr-only">Urutan </span>
          {row.sortOrder}
        </span>
      </div>

      <div className="col-span-3 col-start-1 row-start-3 mt-2 flex min-h-11 items-center justify-between gap-3 border-t border-line pt-2 md:col-span-1 md:col-start-5 md:row-start-1 md:mt-0 md:min-h-0 md:justify-start md:border-0 md:pt-0">
        <label id={switchLabelId} htmlFor={switchId} className="text-sm text-ink-2 md:sr-only">
          Tampil di halaman unit
        </label>
        <Switch
          id={switchId}
          checked={row.isActive}
          onCheckedChange={onToggle}
          aria-labelledby={`${nameId} ${switchLabelId}`}
        />
      </div>

      <div className="col-start-3 row-start-1 -mr-2 flex items-start justify-end gap-1 md:col-start-6 md:mr-0 md:items-center">
        <Button variant="quiet" size="icon" onClick={onEdit} aria-label={`Ubah ${row.name}`}>
          <Pencil aria-hidden="true" />
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="quiet" size="icon" aria-label={`Aksi untuk ${row.name}`}>
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
