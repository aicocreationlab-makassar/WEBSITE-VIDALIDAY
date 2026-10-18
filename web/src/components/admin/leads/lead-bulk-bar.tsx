"use client";

import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LeadRow } from "@/lib/admin/lead-query";

type Props = {
  selected: LeadRow[];
  pending: boolean;
  onClear: () => void;
  onExit: () => void;
  onDelete: (leads: LeadRow[]) => void;
};

/** Bar aksi massal permintaan sewa yang menempel di bawah (mode "Pilih", PRD 7.8): hapus yang dipilih. */
export function LeadBulkBar({ selected, pending, onClear, onExit, onDelete }: Props) {
  const count = selected.length;
  return (
    <section
      aria-label="Aksi massal permintaan sewa"
      className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-line bg-white/95 px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-sticky backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-ink tabular-nums" aria-live="polite">
          {count ? `${count} dipilih` : "Belum ada permintaan dipilih"}
        </p>
        {count ? (
          <Button type="button" variant="link" onClick={onClear} disabled={pending}>
            Kosongkan
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={count === 0 || pending}
            loading={pending}
            onClick={() => onDelete(selected)}
          >
            {pending ? null : <Trash2 aria-hidden="true" />}
            Hapus yang dipilih
          </Button>
          <Button
            type="button"
            variant="quiet"
            size="icon"
            aria-label="Selesai memilih"
            onClick={onExit}
            disabled={pending}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
