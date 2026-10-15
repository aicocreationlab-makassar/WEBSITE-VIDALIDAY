"use client";

import Link from "next/link";
import { useId, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, CircleAlert, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/kit/confirm-dialog";
import { FormCard } from "@/components/admin/kit/form-card";
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
import { deleteRoomType, toggleRoomTypeActive } from "@/lib/actions/admin/room-types";
import { adminUnitParams } from "@/lib/admin/unit-query";
import { cn } from "@/lib/utils";
import {
  categoryLabel,
  nextSortOrder,
  roomTypeDeleteState,
  unitCountLabel,
  type AdminRoomTypeRow,
} from "./location-model";
import { RoomTypeDialog } from "./room-type-dialog";

type Props = {
  locationId: number;
  locationName: string;
  roomTypes: AdminRoomTypeRow[];
  /** Unit di apartemen ini yang belum punya tipe kamar. */
  unitsWithoutType: number;
};

type DialogState = { roomType: AdminRoomTypeRow | null; key: string } | null;
type ActivePatch = { id: number; isActive: boolean };

// Satu struktur untuk HP dan desktop: kartu bertumpuk kalau kartu sempit, baris tabel kalau lebar
// (container query, karena lebar kartu bergantung pada sidebar, bukan hanya lebar layar).
const DESKTOP_COLUMNS = "@2xl:grid-cols-[minmax(0,1fr)_7rem_6.5rem_4rem_5.5rem_3.5rem_6rem]";

function unitsHref(locationId: number, typeId?: number): string {
  return `/admin/units?${adminUnitParams({ lokasi: locationId, tipe: typeId ?? null }).toString()}`;
}

/** Kartu "Tipe kamar" di halaman apartemen (PRD 7.5): tambah, ubah, aktif/nonaktif, hapus kalau tidak dipakai. */
export function RoomTypesCard({ locationId, locationName, roomTypes, unitsWithoutType }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AdminRoomTypeRow | null>(null);
  const [deleting, startDelete] = useTransition();
  const [toggling, startToggle] = useTransition();
  const [rows, applyActive] = useOptimistic(roomTypes, (state: AdminRoomTypeRow[], patch: ActivePatch) =>
    state.map((row) => (row.id === patch.id ? { ...row, isActive: patch.isActive } : row)),
  );

  function openDialog(roomType: AdminRoomTypeRow | null) {
    setDialog({ roomType, key: `${roomType?.id ?? "baru"}-${Date.now()}` });
    setDialogOpen(true);
  }

  function setActive(row: AdminRoomTypeRow, isActive: boolean, onDone?: () => void) {
    startToggle(async () => {
      applyActive({ id: row.id, isActive });
      const result = await toggleRoomTypeActive({ id: row.id, isActive });
      if (result.ok) toast.success(result.message ?? "Perubahan disimpan");
      else toast.error(result.error);
      onDone?.();
    });
  }

  const deleteState = toDelete ? roomTypeDeleteState(toDelete.unitCount, toDelete.isActive) : null;

  function confirmDelete() {
    const target = toDelete;
    if (!target || !deleteState) return;
    if (!deleteState.canDelete) {
      if (deleteState.offerDeactivate) {
        setActive(target, false, () => setToDelete(null));
      } else {
        setToDelete(null);
        router.push(unitsHref(locationId, target.id));
      }
      return;
    }
    startDelete(async () => {
      const result = await deleteRoomType(target.id);
      if (result.ok) {
        toast.success(result.message ?? "Tipe kamar dihapus");
      } else {
        toast.error(result.error);
        router.refresh();
      }
      setToDelete(null);
    });
  }

  const addButton = (
    <Button onClick={() => openDialog(null)}>
      <Plus aria-hidden="true" />
      Tambah tipe kamar
    </Button>
  );

  return (
    <FormCard
      id="tipe-kamar"
      title="Tipe kamar"
      description="Dipilih di form unit dan dipakai untuk filter pencarian. Kategori menentukan rekomendasi unit serupa."
      action={rows.length > 0 ? <span className="hidden sm:block">{addButton}</span> : undefined}
      className="mt-5"
    >
      {unitsWithoutType > 0 ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control bg-amber-50 px-3.5 py-3 text-sm text-ink-2 ring-1 ring-amber-200">
          <CircleAlert className="size-4 shrink-0 text-[#b45309]" aria-hidden="true" />
          <span className="min-w-0 flex-1">{unitsWithoutType} unit di apartemen ini belum punya tipe kamar.</span>
          <Link href={unitsHref(locationId)} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline-offset-2 hover:underline">
            Lihat unit
          </Link>
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line">
          <EmptyState
            icon={BedDouble}
            title={`Belum ada tipe kamar di ${locationName}`}
            description="Tambah tipe kamar pertama, mis. Studio atau 2 Bedroom, supaya unit bisa dibuat."
            action={addButton}
          />
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="@container overflow-clip rounded-control border border-line">
            <div
              aria-hidden="true"
              className={cn(
                "hidden h-11 items-center gap-x-4 border-b border-line bg-surface px-4 text-caption font-semibold text-muted @2xl:grid",
                DESKTOP_COLUMNS,
              )}
            >
              <span>Nama</span>
              <span>Kategori</span>
              <span>Kapasitas default</span>
              <span>Urutan</span>
              <span>Dipakai</span>
              <span>Aktif</span>
              <span className="text-right">Aksi</span>
            </div>
            <ul className="divide-y divide-line">
              {rows.map((row) => (
                <RoomTypeRowItem
                  key={row.id}
                  row={row}
                  locationId={locationId}
                  onEdit={() => openDialog(row)}
                  onDelete={() => setToDelete(row)}
                  onToggle={(next) => setActive(row, next)}
                />
              ))}
            </ul>
          </div>
          {/* Di HP tombol tambah di bawah daftar (dekat jempol), di desktop di kanan judul kartu. */}
          <div className="sm:hidden">{addButton}</div>
        </div>
      )}

      <RoomTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        locationId={locationId}
        locationName={locationName}
        roomType={dialog?.roomType ?? null}
        defaultSortOrder={nextSortOrder(roomTypes)}
        formKey={dialog?.key ?? "kosong"}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title={
          toDelete
            ? deleteState?.canDelete
              ? `Hapus tipe kamar ${toDelete.name}?`
              : `Tipe ${toDelete.name} masih dipakai`
            : "Hapus tipe kamar?"
        }
        description={
          deleteState?.canDelete
            ? "Tipe ini tidak dipakai unit mana pun. Tindakan ini tidak bisa dibatalkan."
            : (deleteState?.message ?? undefined)
        }
        confirmLabel={
          deleteState?.canDelete ? "Hapus tipe kamar" : deleteState?.offerDeactivate ? "Nonaktifkan tipe kamar" : "Lihat unit"
        }
        destructive={Boolean(deleteState?.canDelete)}
        loading={deleting || (toggling && toDelete !== null)}
        onConfirm={confirmDelete}
      />
    </FormCard>
  );
}

type RowProps = {
  row: AdminRoomTypeRow;
  locationId: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (isActive: boolean) => void;
};

function RoomTypeRowItem({ row, locationId, onEdit, onDelete, onToggle }: RowProps) {
  const uid = useId();
  const nameId = `${uid}-nama`;
  const switchId = `${uid}-aktif`;
  const switchLabelId = `${uid}-aktif-label`;

  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3.5 transition-colors hover:bg-surface @2xl:min-h-16 @2xl:items-center @2xl:gap-x-4 @2xl:gap-y-0 @2xl:py-2",
        DESKTOP_COLUMNS,
      )}
    >
      <div className="col-start-1 row-start-1 min-w-0 self-center">
        <p className="flex flex-wrap items-center gap-2">
          <span id={nameId} className={cn("truncate font-semibold", row.isActive ? "text-ink" : "text-ink-2")}>
            {row.name}
          </span>
          {!row.isActive ? <Badge variant="neutral">Nonaktif</Badge> : null}
        </p>
        <p className="truncate text-caption text-muted">{row.slug}</p>
      </div>

      <div className="col-span-2 col-start-1 row-start-2 flex flex-wrap items-center gap-x-2 text-caption text-muted @2xl:contents">
        <span className="@2xl:col-start-2 @2xl:row-start-1 @2xl:text-sm @2xl:text-ink-2">{categoryLabel(row.category)}</span>
        <span aria-hidden="true" className="@2xl:hidden">
          ·
        </span>
        <span className="tabular-nums @2xl:col-start-3 @2xl:row-start-1 @2xl:text-sm @2xl:text-ink-2">
          {row.defaultMaxGuests ? (
            <>
              <span className="@2xl:hidden">maks. </span>
              {row.defaultMaxGuests} tamu
            </>
          ) : (
            <span className="text-muted">
              <span className="@2xl:hidden">Kapasitas </span>belum diisi
            </span>
          )}
        </span>
        <span aria-hidden="true" className="@2xl:hidden">
          ·
        </span>
        <span className="tabular-nums @2xl:col-start-4 @2xl:row-start-1 @2xl:text-sm @2xl:text-ink-2">
          <span className="@2xl:sr-only">Urutan </span>
          {row.sortOrder}
        </span>
        <span aria-hidden="true" className="@2xl:hidden">
          ·
        </span>
        <span className="@2xl:col-start-5 @2xl:row-start-1 @2xl:text-sm">
          {row.unitCount > 0 ? (
            <Link
              href={unitsHref(locationId, row.id)}
              className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              {unitCountLabel(row.unitCount)}
            </Link>
          ) : (
            <span className="@2xl:text-ink-2">{unitCountLabel(0)}</span>
          )}
        </span>
      </div>

      <div className="col-span-2 col-start-1 row-start-3 mt-2 flex min-h-11 items-center justify-between gap-3 border-t border-line pt-2 @2xl:col-span-1 @2xl:col-start-6 @2xl:row-start-1 @2xl:mt-0 @2xl:min-h-0 @2xl:justify-start @2xl:border-0 @2xl:pt-0">
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

      <div className="col-start-2 row-start-1 -mr-2 flex items-start justify-end gap-1 @2xl:col-start-7 @2xl:mr-0 @2xl:items-center">
        <Button variant="quiet" size="icon" onClick={onEdit} aria-label={`Ubah ${row.name}`}>
          <Pencil aria-hidden="true" />
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="quiet" size="icon" aria-label={`Aksi untuk ${row.name}`}>
              <Ellipsis aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem className="min-h-11 gap-2.5 px-3 text-[15px]" onSelect={onEdit}>
              <Pencil aria-hidden="true" />
              Ubah
            </DropdownMenuItem>
            {row.unitCount > 0 ? (
              <DropdownMenuItem asChild className="min-h-11 gap-2.5 px-3 text-[15px]">
                <Link href={unitsHref(locationId, row.id)}>
                  <BedDouble aria-hidden="true" />
                  Lihat {unitCountLabel(row.unitCount)}
                </Link>
              </DropdownMenuItem>
            ) : null}
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
