"use client";

import Image from "next/image";
import { useId } from "react";
import { ArrowDown, ArrowUp, Ellipsis, Pencil, Trash2, TriangleAlert } from "lucide-react";
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
import { Icon, isKnownIconName, resolveFacilityIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { AdminFacilityRow } from "./facility-model";

// Satu struktur untuk HP dan desktop: kartu bertumpuk di bawah md, baris tabel 64px di md ke atas
// (grid yang sama, posisi sel diatur per breakpoint). Tidak ada elemen ganda di DOM.
export const FACILITY_COLUMNS = "md:grid-cols-[4rem_minmax(0,1fr)_4.5rem_6.25rem_6rem]";

/** Foto 4:3 seperti di halaman apartemen, atau tile ikon kalau tanpa foto. */
export function FacilityThumb({ row, className }: { row: AdminFacilityRow; className?: string }) {
  return (
    <span
      className={cn(
        "relative block aspect-[4/3] shrink-0 overflow-hidden rounded-control ring-1 ring-line/70",
        row.imageUrl ? "bg-surface-2" : row.isActive ? "bg-brand-50 text-brand-600" : "bg-surface-2 text-subtle",
        className,
      )}
    >
      {row.imageUrl ? (
        <Image
          src={row.imageUrl}
          alt=""
          fill
          sizes="80px"
          className={cn("object-cover", !row.isActive && "opacity-70 grayscale-[60%]")}
        />
      ) : (
        <span className="flex size-full items-center justify-center">
          <Icon name={resolveFacilityIcon(row.name, row.icon)} fallback="sparkles" className="size-6" />
        </span>
      )}
    </span>
  );
}

type Props = {
  row: AdminFacilityRow;
  isFirst: boolean;
  isLast: boolean;
  /** Selama urutan lain disimpan, atau daftar sedang dicari/disaring status. */
  reorderDisabled: boolean;
  onToggle: (isActive: boolean) => void;
  onMove: (direction: "up" | "down") => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** Satu fasilitas: foto/ikon, nama, deskripsi satu baris, switch aktif, naik/turun, ubah, hapus. */
export function FacilityItem({ row, isFirst, isLast, reorderDisabled, onToggle, onMove, onEdit, onDelete }: Props) {
  const uid = useId();
  const nameId = `${uid}-nama`;
  const switchId = `${uid}-aktif`;
  const switchLabelId = `${uid}-aktif-label`;
  const missingIcon = !isKnownIconName(row.icon);

  return (
    <li
      className={cn(
        "grid grid-cols-[5rem_minmax(0,1fr)_auto] gap-x-3 px-4 py-3.5 transition-colors hover:bg-surface md:min-h-16 md:items-center md:gap-x-4 md:py-2",
        FACILITY_COLUMNS,
      )}
    >
      <FacilityThumb row={row} className="col-start-1 row-start-1 w-20 self-start md:w-16 md:self-center" />

      <div className="col-start-2 row-start-1 flex min-w-0 flex-col items-start gap-0.5 self-center">
        <p className="flex max-w-full min-w-0 items-center gap-1.5">
          {/* Dengan foto, ikon tetap tampil di samping nama di situs. */}
          {row.imageUrl ? (
            <Icon
              name={resolveFacilityIcon(row.name, row.icon)}
              fallback="sparkles"
              className={cn("size-4 shrink-0", row.isActive ? "text-ink-2" : "text-subtle")}
            />
          ) : null}
          <span id={nameId} className={cn("truncate font-semibold", row.isActive ? "text-ink" : "text-ink-2")}>
            {row.name}
          </span>
        </p>
        <p className={cn("w-full truncate text-sm", row.description ? "text-muted" : "text-subtle")}>
          {row.description ?? "Belum ada deskripsi"}
        </p>
        {missingIcon ? (
          <Badge variant="warning" className="mt-1">
            <TriangleAlert aria-hidden="true" />
            Ikon belum dipilih
          </Badge>
        ) : null}
      </div>

      {/* HP: bar bawah (switch kiri, urutan kanan). Desktop: kolom Aktif dan Urutan. */}
      <div className="col-span-3 col-start-1 row-start-2 mt-3 flex min-h-11 items-center justify-between gap-3 border-t border-line pt-2 md:contents">
        <div className="flex items-center gap-3 md:col-start-3 md:row-start-1">
          <label id={switchLabelId} htmlFor={switchId} className="text-sm text-ink-2 md:sr-only">
            Aktif
          </label>
          <Switch
            id={switchId}
            checked={row.isActive}
            onCheckedChange={onToggle}
            aria-labelledby={`${nameId} ${switchLabelId}`}
          />
        </div>
        <div className="-mr-2 flex items-center gap-1 md:col-start-4 md:row-start-1 md:mr-0">
          <Button
            variant="quiet"
            size="icon"
            data-reorder={`${row.id}:up`}
            aria-label={`Naikkan urutan ${row.name}`}
            disabled={isFirst || reorderDisabled}
            onClick={() => onMove("up")}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            variant="quiet"
            size="icon"
            data-reorder={`${row.id}:down`}
            aria-label={`Turunkan urutan ${row.name}`}
            disabled={isLast || reorderDisabled}
            onClick={() => onMove("down")}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="col-start-3 row-start-1 -mr-2 flex items-start justify-end gap-1 md:col-start-5 md:mr-0 md:items-center">
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
