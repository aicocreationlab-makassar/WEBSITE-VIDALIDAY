"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useId, useOptimistic, useRef, useState, useTransition } from "react";
import { Building2, Ellipsis, MapPin, Pencil, Plus, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/kit/confirm-dialog";
import { NativeSelect } from "@/components/admin/kit/field";
import { AdminPageHeader } from "@/components/admin/kit/form-card";
import { SearchInput } from "@/components/admin/kit/search-input";
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
import { deleteLandmark, reorderLandmark, toggleLandmarkActive } from "@/lib/actions/admin/landmarks";
import { Icon, resolveLandmarkIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { LandmarkFormDialog } from "./landmark-form-dialog";
import {
  ALL_LOCATIONS,
  STATUS_CHIPS,
  countByLocation,
  defaultLocationId,
  filterLandmarks,
  groupByLocation,
  inScope,
  isFiltering,
  landmarkCountLabel,
  landmarkDeleteDescription,
  parseLocationScope,
  statusCounts,
  type AdminLandmarkRow,
  type LandmarkLocation,
  type LocationScope,
  type StatusChip,
} from "./landmark-model";
import { FilterChips, OrderButtons, useReorderFocus, type Direction } from "./list-bits";

type DialogState = { landmark: AdminLandmarkRow | null; locationId: number | null; key: string } | null;
type Patch = { kind: "active"; id: number; isActive: boolean } | { kind: "order"; updates: SortItem[] };

const NETWORK_ERROR = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";
const REORDER_PAUSED = "Hapus pencarian dan pilih saringan Semua untuk mengubah urutan.";

// Satu struktur untuk HP dan desktop: kartu bertumpuk kalau kartu sempit, baris tabel 64px kalau lebar
// (container query, karena lebar kartu bergantung pada sidebar, bukan hanya lebar layar).
const DESKTOP_COLUMNS = "@2xl:grid-cols-[2.75rem_minmax(0,1fr)_6rem_4.5rem_6rem]";

/**
 * Landmark per apartemen (PRD 7.7): tab/pilihan apartemen (?lokasi=, bawaan apartemen pertama,
 * "semua" untuk semua), pencarian, saring status, aktif/nonaktif langsung, urutan naik/turun,
 * tambah/ubah/hapus. Semua landmark dimuat sekali; cari dan saring terjadi di klien.
 */
export function LandmarksManager({ landmarks, locations }: { landmarks: AdminLandmarkRow[]; locations: LandmarkLocation[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = parseLocationScope(searchParams.get("lokasi"), locations);

  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<StatusChip>("semua");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Nomor urut pembukaan dialog: form dimulai ulang dari nilai awal setiap kali dibuka.
  const dialogSeq = useRef(0);
  const [toDelete, setToDelete] = useState<AdminLandmarkRow | null>(null);
  const [deleting, startDelete] = useTransition();
  const [, startToggle] = useTransition();
  const [moving, startMove] = useTransition();
  const [rows, applyPatch] = useOptimistic(landmarks, (state: AdminLandmarkRow[], patch: Patch) =>
    patch.kind === "active"
      ? state.map((row) => (row.id === patch.id ? { ...row, isActive: patch.isActive } : row))
      : applySortUpdates(state, patch.updates),
  );
  const rememberFocus = useReorderFocus(moving, rows);

  const locationById = new Map(locations.map((location) => [location.id, location]));
  const current = scope === ALL_LOCATIONS ? null : (locationById.get(scope) ?? null);
  const perLocation = countByLocation(rows);
  const scopeTotal = rows.filter((row) => inScope(row, scope)).length;
  const counts = statusCounts(rows, scope, query);
  const visible = filterLandmarks(rows, { scope, query, chip });
  const groups = groupByLocation(visible, locations);
  const filtering = isFiltering(query, chip);

  /** Ganti apartemen tanpa memuat ulang data: URL ikut berubah (bisa di-bookmark, Next 16 history API). */
  function setScope(next: LocationScope) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lokasi", String(next));
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  function openDialog(landmark: AdminLandmarkRow | null, locationId?: number) {
    dialogSeq.current += 1;
    setDialog({
      landmark,
      locationId: landmark?.locationId ?? locationId ?? defaultLocationId(scope, locations),
      key: `${landmark?.id ?? "baru"}-${dialogSeq.current}`,
    });
    setDialogOpen(true);
  }

  function toggleActive(row: AdminLandmarkRow, isActive: boolean) {
    startToggle(async () => {
      applyPatch({ kind: "active", id: row.id, isActive });
      try {
        const result = await toggleLandmarkActive({ id: row.id, isActive });
        if (result.ok) toast.success(result.message ?? "Perubahan disimpan");
        else toast.error(result.error);
      } catch {
        toast.error(NETWORK_ERROR);
      }
    });
  }

  function move(row: AdminLandmarkRow, direction: Direction) {
    const siblings = rows.filter((item) => item.locationId === row.locationId);
    const plan = planReorder(siblings, row.id, direction);
    if (!plan) return;
    rememberFocus(row.id, direction);
    startMove(async () => {
      applyPatch({ kind: "order", updates: plan });
      try {
        const result = await reorderLandmark({ id: row.id, direction });
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
        const result = await deleteLandmark(target.id);
        if (result.ok) {
          toast.success(result.message ?? "Landmark dihapus");
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
    <Button onClick={() => openDialog(null)} disabled={locations.length === 0}>
      <Plus aria-hidden="true" />
      Tambah landmark
    </Button>
  );

  const scopeOptions = [
    { value: ALL_LOCATIONS, label: "Semua apartemen", fullName: "Semua apartemen", count: rows.length, isActive: true },
    ...locations.map((location) => ({
      value: String(location.id),
      label: location.shortName,
      fullName: location.name,
      count: perLocation.get(location.id) ?? 0,
      isActive: location.isActive,
    })),
  ];

  return (
    <>
      {/* Saat apartemen ini kosong, tombol tambah hanya ada di empty state (satu tombol per layar). */}
      <AdminPageHeader
        description="Tempat penting di sekitar apartemen beserta jarak atau waktu tempuhnya. Tampil di halaman apartemen dan detail unit."
        actions={locations.length > 0 && scopeTotal > 0 ? addButton : undefined}
      />

      {locations.length === 0 ? (
        <div className="glass-card rounded-card">
          <EmptyState
            icon={Building2}
            title="Belum ada apartemen"
            description="Tambah apartemen dulu, lalu isi landmark di sekitarnya."
            action={
              <Button asChild>
                <Link href="/admin/locations">Kelola apartemen</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tab apartemen (desktop), seperti admin lama; di HP diganti select di bawah. */}
          <div
            role="group"
            aria-label="Pilih apartemen"
            className="glass-card hidden flex-wrap gap-1 rounded-card p-1.5 md:flex"
          >
            {scopeOptions.map((option) => {
              const active = String(scope) === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  title={option.fullName}
                  onClick={() => setScope(option.value === ALL_LOCATIONS ? ALL_LOCATIONS : Number(option.value))}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-control border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-brand-500/20 focus-visible:outline-none",
                    active
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  {option.value === ALL_LOCATIONS ? (
                    <Building2 className={cn("size-4", active ? "text-brand-600" : "text-subtle")} aria-hidden="true" />
                  ) : (
                    <MapPin className={cn("size-4", active ? "text-brand-600" : "text-subtle")} aria-hidden="true" />
                  )}
                  {option.label}
                  {!option.isActive ? <span className="text-caption font-normal text-muted">nonaktif</span> : null}
                  <span
                    className={cn(
                      "min-w-6 rounded-full px-1.5 text-center text-caption tabular-nums",
                      active ? "bg-white text-brand-700" : "bg-surface-2 text-ink-2",
                    )}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <NativeSelect
              aria-label="Apartemen"
              className="md:hidden"
              value={String(scope)}
              onChange={(event) =>
                setScope(event.target.value === ALL_LOCATIONS ? ALL_LOCATIONS : Number(event.target.value))
              }
            >
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.isActive ? option.fullName : `${option.fullName} (nonaktif)`} ({option.count})
                </option>
              ))}
            </NativeSelect>
            <SearchInput
              value={query}
              onSearch={setQuery}
              label="Cari landmark"
              placeholder="Cari nama, jarak, atau catatan…"
              debounceMs={150}
              className="sm:max-w-md sm:flex-1"
            />
          </div>

          <FilterChips items={STATUS_CHIPS} value={chip} counts={counts} onChange={setChip} label="Saring status landmark" />

          {filtering && visible.length > 1 ? <p className="text-sm text-ink-2">{REORDER_PAUSED}</p> : null}

          <div className="@container glass-card overflow-clip rounded-card" aria-busy={moving || undefined}>
            {scopeTotal === 0 ? (
              <EmptyState
                icon={MapPin}
                title={current ? `Belum ada landmark di ${current.name}` : "Belum ada landmark"}
                description="Tambah tempat penting terdekat, mis. mal, rumah sakit, atau kampus, supaya tamu cepat paham lokasinya."
                action={addButton}
              />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Tidak ada landmark yang cocok"
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
                  <span>Ikon</span>
                  <span>Landmark</span>
                  <span>Urutan</span>
                  <span>Aktif</span>
                  <span className="text-right">Aksi</span>
                </div>
                {groups.map((group) => (
                  <LandmarkGroupSection
                    key={group.location.id}
                    location={group.location}
                    rows={group.rows}
                    showHeader={scope === ALL_LOCATIONS}
                    reorderDisabled={filtering || moving}
                    onOpen={() => setScope(group.location.id)}
                    onAdd={() => openDialog(null, group.location.id)}
                    onEdit={(row) => openDialog(row)}
                    onDelete={setToDelete}
                    onToggle={toggleActive}
                    onMove={move}
                    filtering={filtering}
                  />
                ))}
              </>
            )}
          </div>

          {scopeTotal > 0 ? (
            <p className="text-caption text-muted">
              {visible.length} dari {landmarkCountLabel(scopeTotal)} ditampilkan
              {current ? ` di ${current.name}` : ""}.
            </p>
          ) : null}
        </div>
      )}

      <LandmarkFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        landmark={dialog?.landmark ?? null}
        locations={locations}
        rows={landmarks}
        defaultLocationId={dialog?.locationId ?? defaultLocationId(scope, locations)}
        formKey={dialog?.key ?? "kosong"}
        onSaved={(locationId) => {
          // Tampilkan apartemen tempat landmark disimpan supaya hasilnya langsung terlihat.
          if (scope !== ALL_LOCATIONS && scope !== locationId) setScope(locationId);
        }}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title={toDelete ? `Hapus landmark ${toDelete.name}?` : "Hapus landmark?"}
        description={toDelete ? landmarkDeleteDescription(locationById.get(toDelete.locationId)?.name) : undefined}
        confirmLabel="Hapus landmark"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}

type GroupProps = {
  location: LandmarkLocation;
  rows: AdminLandmarkRow[];
  showHeader: boolean;
  reorderDisabled: boolean;
  filtering: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onEdit: (row: AdminLandmarkRow) => void;
  onDelete: (row: AdminLandmarkRow) => void;
  onToggle: (row: AdminLandmarkRow, isActive: boolean) => void;
  onMove: (row: AdminLandmarkRow, direction: Direction) => void;
};

/** Daftar landmark satu apartemen; di tampilan "Semua apartemen" diberi judul per apartemen. */
function LandmarkGroupSection({
  location,
  rows,
  showHeader,
  reorderDisabled,
  filtering,
  onOpen,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  onMove,
}: GroupProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={showHeader ? headingId : undefined} className="border-line not-first:border-t">
      {showHeader ? (
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-1.5">
          <h2 id={headingId} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold text-ink">
            <MapPin className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
            <button type="button" onClick={onOpen} className="min-w-0 truncate text-left underline-offset-2 hover:underline">
              {location.name}
            </button>
            <span className="font-normal text-muted">· {landmarkCountLabel(rows.length)}</span>
            {!location.isActive ? <Badge variant="neutral">Apartemen nonaktif</Badge> : null}
          </h2>
          <Button variant="ghost" size="sm" onClick={onAdd} aria-label={`Tambah landmark di ${location.name}`}>
            <Plus aria-hidden="true" />
            Tambah
          </Button>
        </div>
      ) : null}
      <ul className="divide-y divide-line">
        {rows.map((row, index) => (
          <LandmarkRowItem
            key={row.id}
            row={row}
            isFirst={index === 0}
            isLast={index === rows.length - 1}
            reorderDisabled={reorderDisabled}
            reorderReason={filtering ? REORDER_PAUSED : undefined}
            onEdit={() => onEdit(row)}
            onDelete={() => onDelete(row)}
            onToggle={(next) => onToggle(row, next)}
            onMove={(direction) => onMove(row, direction)}
          />
        ))}
      </ul>
    </section>
  );
}

type RowProps = {
  row: AdminLandmarkRow;
  isFirst: boolean;
  isLast: boolean;
  reorderDisabled: boolean;
  reorderReason?: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (isActive: boolean) => void;
  onMove: (direction: Direction) => void;
};

function LandmarkRowItem({ row, isFirst, isLast, reorderDisabled, reorderReason, onEdit, onDelete, onToggle, onMove }: RowProps) {
  const uid = useId();
  const nameId = `${uid}-nama`;
  const switchId = `${uid}-aktif`;
  const switchLabelId = `${uid}-aktif-label`;

  return (
    <li
      className={cn(
        "grid grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3.5 transition-colors hover:bg-surface @2xl:min-h-16 @2xl:items-center @2xl:gap-x-4 @2xl:gap-y-0 @2xl:py-2",
        DESKTOP_COLUMNS,
      )}
    >
      {/* Ikon yang tampil di situs (ikon tersimpan, atau tebakan dari nama). */}
      <span
        className={cn(
          "col-start-1 row-start-1 flex size-11 items-center justify-center rounded-full",
          row.isActive ? "bg-brand-50 text-brand-600" : "bg-surface-2 text-subtle",
        )}
      >
        <Icon name={resolveLandmarkIcon(row.name, row.icon)} fallback="map-pin" className="size-5" />
      </span>

      <div className="col-start-2 row-start-1 min-w-0 self-center">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span id={nameId} className={cn("min-w-0 font-semibold break-words", row.isActive ? "text-ink" : "text-ink-2")}>
            {row.name}
          </span>
          <span className="inline-flex max-w-full items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-caption font-semibold text-brand-700 tabular-nums">
            <span className="sr-only">Jarak: </span>
            <span className="truncate">{row.distanceTime}</span>
          </span>
          {!row.isActive ? <Badge variant="neutral">Nonaktif</Badge> : null}
        </p>
        {row.notes ? <p className="mt-0.5 line-clamp-2 text-sm text-muted">{row.notes}</p> : null}
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
            aria-labelledby={`${switchLabelId} ${nameId}`}
          />
        </div>
        <OrderButtons
          id={row.id}
          name={row.name}
          isFirst={isFirst}
          isLast={isLast}
          disabled={reorderDisabled}
          disabledReason={reorderReason}
          onMove={onMove}
          className="-mr-2 @2xl:col-start-3 @2xl:row-start-1 @2xl:mr-0"
        />
      </div>

      <div className="col-start-3 row-start-1 -mr-2 flex items-start justify-end gap-1 @2xl:col-start-5 @2xl:mr-0 @2xl:items-center">
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
