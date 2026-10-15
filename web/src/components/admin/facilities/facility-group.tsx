"use client";

import { useId } from "react";
import { Building2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FACILITY_COLUMNS, FacilityItem } from "./facility-item";
import { groupCountLabel, type AdminFacilityRow, type FacilityGroup } from "./facility-model";

type Props = {
  group: FacilityGroup;
  narrowed: boolean;
  edges: Map<number, { isFirst: boolean; isLast: boolean }>;
  reorderDisabled: boolean;
  onAdd: () => void;
  onToggle: (row: AdminFacilityRow, isActive: boolean) => void;
  onMove: (row: AdminFacilityRow, direction: "up" | "down") => void;
  onEdit: (row: AdminFacilityRow) => void;
  onDelete: (row: AdminFacilityRow) => void;
};

/** Satu kartu per apartemen (seperti admin lama): judul, jumlah, tabel/kartu fasilitas, atau ajakan menambah. */
export function FacilityGroupCard({ group, narrowed, edges, reorderDisabled, onAdd, onToggle, onMove, onEdit, onDelete }: Props) {
  const headingId = useId();
  const { location, items } = group;

  return (
    <section aria-labelledby={headingId} className="glass-card overflow-clip rounded-card">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Building2 className="size-5 shrink-0 text-subtle" aria-hidden="true" />
          <h2 id={headingId} className="min-w-0 truncate text-base font-bold text-ink">
            {location.name}
          </h2>
          {location.isActive ? null : <Badge variant="neutral">Apartemen nonaktif</Badge>}
        </div>
        <span className="text-caption text-muted tabular-nums">{groupCountLabel(group, narrowed)}</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-2">
            Belum ada fasilitas di {location.name}. Tambah kolam renang, gym, atau fasilitas lain supaya tampil di
            halaman apartemen.
          </p>
          <Button variant="outline" className="shrink-0" onClick={onAdd} aria-label={`Tambah fasilitas pertama di ${location.name}`}>
            <Plus aria-hidden="true" />
            Tambah fasilitas pertama
          </Button>
        </div>
      ) : (
        <>
          <div
            aria-hidden="true"
            className={cn(
              "sticky top-16 z-10 hidden h-11 items-center gap-x-4 border-b border-line bg-white px-4 text-caption font-semibold text-muted md:grid",
              FACILITY_COLUMNS,
            )}
          >
            <span>Foto</span>
            <span>Fasilitas</span>
            <span>Aktif</span>
            <span>Urutan</span>
            <span className="text-right">Aksi</span>
          </div>
          <ul className="divide-y divide-line">
            {items.map((row) => {
              const edge = edges.get(row.id) ?? { isFirst: true, isLast: true };
              return (
                <FacilityItem
                  key={row.id}
                  row={row}
                  isFirst={edge.isFirst}
                  isLast={edge.isLast}
                  reorderDisabled={reorderDisabled}
                  onToggle={(next) => onToggle(row, next)}
                  onMove={(direction) => onMove(row, direction)}
                  onEdit={() => onEdit(row)}
                  onDelete={() => onDelete(row)}
                />
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
