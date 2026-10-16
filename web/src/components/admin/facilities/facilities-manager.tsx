"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Building2, Info, Plus, RotateCcw, SearchX, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/kit/confirm-dialog";
import { NativeSelect } from "@/components/admin/kit/field";
import { AdminPageHeader } from "@/components/admin/kit/form-card";
import { SearchInput } from "@/components/admin/kit/search-input";
import { EmptyState } from "@/components/public/shared/empty-state";
import { Button } from "@/components/ui/button";
import { deleteFacility, reorderFacility, toggleFacilityActive } from "@/lib/actions/admin/facilities";
import { cn } from "@/lib/utils";
import { FacilityFormDialog } from "./facility-form-dialog";
import { FacilityGroupCard } from "./facility-group";
import {
  applyFacilityOrder,
  deleteFacilityDescription,
  FACILITY_STATUS_CHIPS,
  groupFacilities,
  hasActiveFilter,
  isNarrowed,
  orderEdges,
  planFacilityReorder,
  sanitizeFilter,
  statusCounts,
  type AdminFacilityRow,
  type FacilityLocation,
} from "./facility-model";
import { useFacilityFilter } from "./use-facility-filter";

const NETWORK_ERROR = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";

type DialogState = { facility: AdminFacilityRow | null; locationId: number | null; seq: number };
type Patch =
  | { kind: "active"; id: number; isActive: boolean }
  | { kind: "order"; updates: { id: number; sortOrder: number }[] };

function patchRows(state: AdminFacilityRow[], patch: Patch): AdminFacilityRow[] {
  if (patch.kind === "active") {
    return state.map((row) => (row.id === patch.id ? { ...row, isActive: patch.isActive } : row));
  }
  return applyFacilityOrder(state, patch.updates);
}

type Props = { facilities: AdminFacilityRow[]; locations: FacilityLocation[] };

/**
 * Fasilitas gedung (PRD 7.7): grup per apartemen seperti admin lama, filter apartemen + pencarian + status
 * (semua di URL), switch aktif langsung, urutan naik/turun di dalam apartemen, tambah/ubah/hapus lewat dialog.
 */
export function FacilitiesManager({ facilities, locations }: Props) {
  const { filter: urlFilter, setFilter } = useFacilityFilter();
  const filter = sanitizeFilter(urlFilter, locations);
  const [rows, applyPatch] = useOptimistic(facilities, patchRows);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AdminFacilityRow | null>(null);
  const [deleting, startDelete] = useTransition();
  const [, startToggle] = useTransition();
  const [moving, startMove] = useTransition();
  // Tombol urutan yang terakhir dipakai: setelah selesai, fokus keyboard dikembalikan ke baris yang dipindah.
  const pendingFocus = useRef<string | null>(null);

  const narrowed = isNarrowed(filter);
  const groups = groupFacilities(rows, filter, locations);
  const counts = statusCounts(rows, filter, locations);
  const edges = orderEdges(rows);
  const visibleCount = groups.reduce((sum, group) => sum + group.items.length, 0);

  useEffect(() => {
    const key = pendingFocus.current;
    if (!key || moving) return;
    pendingFocus.current = null;
    const [id, direction] = key.split(":");
    const button = document.querySelector<HTMLButtonElement>(`[data-reorder="${id}:${direction}"]`);
    const other = document.querySelector<HTMLButtonElement>(`[data-reorder="${id}:${direction === "up" ? "down" : "up"}"]`);
    (button && !button.disabled ? button : other)?.focus();
  }, [rows, moving]);

  function openDialog(facility: AdminFacilityRow | null, locationId: number | null = null) {
    // Nomor urut yang selalu naik: form mulai dari nilai awal lagi setiap kali dibuka.
    setDialog((current) => ({ facility, locationId, seq: (current?.seq ?? 0) + 1 }));
    setDialogOpen(true);
  }

  function toggleActive(row: AdminFacilityRow, isActive: boolean) {
    startToggle(async () => {
      applyPatch({ kind: "active", id: row.id, isActive });
      try {
        const result = await toggleFacilityActive({ id: row.id, isActive });
        if (result.ok) toast.success(result.message ?? "Perubahan disimpan");
        else toast.error(result.error);
      } catch {
        toast.error(NETWORK_ERROR);
      }
    });
  }

  function move(row: AdminFacilityRow, direction: "up" | "down") {
    const plan = planFacilityReorder(rows, row.id, direction);
    if (!plan) return;
    pendingFocus.current = `${row.id}:${direction}`;
    startMove(async () => {
      applyPatch({ kind: "order", updates: plan });
      try {
        const result = await reorderFacility({ id: row.id, direction });
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
        const result = await deleteFacility(target.id);
        if (result.ok) {
          toast.success(result.message ?? "Fasilitas dihapus");
          setToDelete(null);
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error(NETWORK_ERROR);
      }
    });
  }

  const addButton = (
    <Button onClick={() => openDialog(null, filter.lokasi)}>
      <Plus aria-hidden="true" />
      Tambah fasilitas
    </Button>
  );

  const header = (
    <AdminPageHeader
      description="Fasilitas bersama di setiap apartemen, mis. kolam renang, gym, dan keamanan 24 jam. Tampil di halaman apartemen dengan foto atau ikonnya."
      actions={locations.length > 0 && facilities.length > 0 ? addButton : undefined}
    />
  );

  // Fasilitas menempel ke apartemen: tanpa apartemen, arahkan ke halaman apartemen dulu.
  if (locations.length === 0) {
    return (
      <>
        {header}
        <div className="glass-card rounded-card">
          <EmptyState
            icon={Building2}
            title="Belum ada apartemen"
            description="Fasilitas gedung selalu milik satu apartemen. Tambah apartemen dulu, lalu kembali ke sini."
            action={
              <Button asChild>
                <Link href="/admin/locations">Buka apartemen</Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      {header}

      {facilities.length === 0 ? (
        <div className="glass-card rounded-card">
          <EmptyState
            icon={Sparkles}
            title="Belum ada fasilitas gedung"
            description="Tambah fasilitas pertama, mis. kolam renang, gym, atau keamanan 24 jam, supaya tampil di halaman apartemen."
            action={addButton}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <SearchInput
                value={filter.q}
                onSearch={(q) => setFilter({ q })}
                label="Cari fasilitas"
                placeholder="Cari nama atau deskripsi…"
                debounceMs={150}
                className="sm:max-w-md sm:flex-1"
              />
              <NativeSelect
                aria-label="Apartemen"
                className={cn("sm:w-60", filter.lokasi && "font-semibold ring-2 ring-brand-200")}
                value={filter.lokasi ?? ""}
                onChange={(event) => {
                  const id = Number(event.target.value);
                  setFilter({ lokasi: Number.isInteger(id) && id > 0 ? id : null });
                }}
              >
                <option value="">Semua apartemen</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.isActive ? location.name : `${location.name} (nonaktif)`}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label="Saring status" className="flex flex-wrap gap-2">
                {FACILITY_STATUS_CHIPS.map((item) => {
                  const active = filter.status === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter({ status: item.value })}
                      className={cn(
                        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-brand-500/20",
                        active
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-line bg-white text-ink-2 hover:bg-surface-2",
                      )}
                    >
                      {item.label}
                      <span
                        className={cn(
                          "min-w-6 rounded-full px-1.5 text-center text-caption tabular-nums",
                          active ? "bg-white text-brand-700" : "bg-surface-2 text-ink-2",
                        )}
                      >
                        {counts[item.value]}
                      </span>
                    </button>
                  );
                })}
              </div>
              {hasActiveFilter(filter) ? (
                <Button variant="ghost" className="px-3" onClick={() => setFilter({ lokasi: null, q: "", status: "semua" })}>
                  <RotateCcw aria-hidden="true" />
                  Reset filter
                </Button>
              ) : null}
            </div>

            {narrowed && visibleCount > 0 ? (
              <p className="flex items-start gap-2 text-sm text-ink-2">
                <Info className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden="true" />
                <span>
                  Tombol urutan nonaktif selama pencarian atau filter status dipakai.{" "}
                  <button
                    type="button"
                    onClick={() => setFilter({ q: "", status: "semua" })}
                    className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                  >
                    Tampilkan semua
                  </button>
                </span>
              </p>
            ) : null}
          </div>

          {groups.length === 0 ? (
            <div className="glass-card rounded-card">
              <EmptyState
                icon={SearchX}
                title="Tidak ada fasilitas yang cocok"
                description={filter.q ? `Tidak ada hasil untuk "${filter.q}".` : "Coba pilihan saring lain."}
                action={
                  <Button variant="secondary" onClick={() => setFilter({ q: "", status: "semua" })}>
                    {filter.q ? "Hapus pencarian" : "Tampilkan semua"}
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-4" aria-busy={moving || undefined}>
              {groups.map((group) => (
                <FacilityGroupCard
                  key={group.location.id}
                  group={group}
                  narrowed={narrowed}
                  edges={edges}
                  reorderDisabled={moving || narrowed}
                  onAdd={() => openDialog(null, group.location.id)}
                  onToggle={toggleActive}
                  onMove={move}
                  onEdit={(row) => openDialog(row)}
                  onDelete={setToDelete}
                />
              ))}
            </div>
          )}

          <p className="text-caption text-muted" aria-live="polite">
            {visibleCount} dari {facilities.length} fasilitas ditampilkan.
          </p>
        </div>
      )}

      <FacilityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        facility={dialog?.facility ?? null}
        defaultLocationId={dialog?.locationId ?? null}
        locations={locations}
        facilities={rows}
        formKey={dialog ? `${dialog.facility?.id ?? "baru"}-${dialog.seq}` : "kosong"}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title={toDelete ? `Hapus fasilitas ${toDelete.name}?` : "Hapus fasilitas?"}
        description={toDelete ? deleteFacilityDescription(toDelete) : undefined}
        confirmLabel="Hapus fasilitas"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
