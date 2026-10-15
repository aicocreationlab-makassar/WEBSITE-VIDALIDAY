"use client";

import Link from "next/link";
import { CalendarCheck, CalendarX, Copy, Ellipsis, ExternalLink, Pencil, Sparkles, StarOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminUnitRow } from "@/lib/admin/unit-query";
import { unitHref } from "@/lib/unit-display";
import { cn } from "@/lib/utils";
import type { RowActions } from "./types";

const ITEM =
  "min-h-11 gap-2.5 rounded-[10px] px-2.5 text-[15px] font-semibold text-ink-2 focus:bg-brand-50 focus:text-brand-700 not-data-[variant=destructive]:focus:**:text-brand-700 [&_svg]:size-5";

/** Menu aksi per unit (tombol ellipsis 44px): Ubah, Tandai penuh/tersedia, unggulan, Duplikat, Lihat di situs, Hapus. */
export function UnitRowMenu({ row, actions, className }: { row: AdminUnitRow; actions: RowActions; className?: string }) {
  const busy = actions.busyId === row.id;
  return (
    // Non-modal: dialog hapus dibuka dari menu tanpa kunci pointer-events yang tertinggal.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="quiet"
          size="icon"
          aria-label={`Aksi untuk ${row.name}`}
          className={cn("shrink-0", className)}
          disabled={busy}
        >
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-60 rounded-control p-1.5 shadow-raised">
        <DropdownMenuItem asChild className={ITEM}>
          <Link href={`/admin/units/${row.id}`}>
            <Pencil aria-hidden="true" />
            Ubah
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM} onSelect={() => actions.onToggleAvailable(row)}>
          {row.isAvailable ? <CalendarX aria-hidden="true" /> : <CalendarCheck aria-hidden="true" />}
          {row.isAvailable ? "Tandai penuh" : "Tandai tersedia"}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM} onSelect={() => actions.onToggleFeatured(row)}>
          {row.isFeatured ? <StarOff aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
          {row.isFeatured ? "Hapus dari unggulan" : "Jadikan unggulan"}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM} onSelect={() => actions.onDuplicate(row)}>
          <Copy aria-hidden="true" />
          Duplikat
        </DropdownMenuItem>
        {row.isPublished ? (
          <DropdownMenuItem asChild className={ITEM}>
            <a href={unitHref(row.slug)} target="_blank" rel="noopener">
              <ExternalLink aria-hidden="true" />
              Lihat di situs
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator className="bg-line" />
        <DropdownMenuItem
          variant="destructive"
          className={cn(ITEM, "text-danger focus:bg-brand-50 focus:text-danger [&_svg]:text-danger")}
          onSelect={() => actions.onDelete(row)}
        >
          <Trash2 aria-hidden="true" />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
