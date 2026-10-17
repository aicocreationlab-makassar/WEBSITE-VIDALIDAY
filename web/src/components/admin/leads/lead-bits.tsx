"use client";

import { Ellipsis, Eye, NotebookPen, Trash2 } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { guestChatLink, type LeadRow, type LeadStatusValue } from "@/lib/admin/lead-query";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { notePreview, type LeadSelection } from "./lead-list-model";

/** Aksi per baris yang dibagi tabel (desktop) dan kartu (HP). */
export type LeadRowActions = {
  onStatus: (lead: LeadRow, status: LeadStatusValue) => void;
  /** Buka detail permintaan; `focusNotes` langsung ke kolom catatan admin. */
  onOpen: (lead: LeadRow, focusNotes?: boolean) => void;
  /** Dipanggil saat tombol chat diklik (tautan tetap terbuka di tab baru). */
  onChat: (lead: LeadRow) => void;
  /** Minta konfirmasi hapus permanen (satu baris atau pilihan). */
  onDelete: (leads: LeadRow[]) => void;
  savingIds: ReadonlySet<string>;
};

/** Mode "Pilih": checkbox per baris/kartu dan "pilih semua di halaman ini". */
export type LeadSelectionProps = {
  selecting: boolean;
  selection: LeadSelection;
  onToggle: (lead: LeadRow) => void;
  onTogglePage: (checked: boolean) => void;
};

const MENU_ITEM =
  "min-h-11 gap-2.5 rounded-[10px] px-2.5 text-[15px] font-semibold text-ink-2 focus:bg-brand-50 focus:text-brand-700 not-data-[variant=destructive]:focus:**:text-brand-700 [&_svg]:size-5";

/** Menu aksi per permintaan (tombol ellipsis 44px): Lihat detail, Catatan admin, Hapus permintaan. */
export function LeadRowMenu({ lead, actions, className }: { lead: LeadRow; actions: LeadRowActions; className?: string }) {
  return (
    // Non-modal: dialog hapus dibuka dari menu tanpa kunci pointer-events yang tertinggal (pola menu unit).
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="quiet" size="icon" aria-label={`Aksi untuk ${lead.code}`} className={cn("shrink-0", className)}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-60 rounded-control p-1.5 shadow-raised">
        <DropdownMenuItem className={MENU_ITEM} onSelect={() => actions.onOpen(lead)}>
          <Eye aria-hidden="true" />
          Lihat detail
        </DropdownMenuItem>
        <DropdownMenuItem className={MENU_ITEM} onSelect={() => actions.onOpen(lead, true)}>
          <NotebookPen aria-hidden="true" />
          Catatan admin
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-line" />
        <DropdownMenuItem
          variant="destructive"
          className={cn(MENU_ITEM, "text-danger focus:bg-brand-50 focus:text-danger [&_svg]:text-danger")}
          onSelect={() => actions.onDelete([lead])}
        >
          <Trash2 aria-hidden="true" />
          Hapus permintaan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function estimateText(lead: Pick<LeadRow, "estimated_total">): string {
  return lead.estimated_total != null ? formatRupiah(Number(lead.estimated_total)) : "–";
}

/** Tombol "Chat di WhatsApp" ke nomor tamu dengan sapaan pembuka (target _blank). */
export function ChatButton({
  lead,
  onChat,
  variant,
  className,
}: {
  lead: LeadRow;
  onChat: (lead: LeadRow) => void;
  variant: "icon" | "full";
  className?: string;
}) {
  const href = guestChatLink(lead);
  if (variant === "full") {
    return (
      <Button asChild size="lg" className={className}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Chat di WhatsApp dengan ${lead.full_name}`}
          onClick={() => onChat(lead)}
        >
          <WhatsappIcon className="size-5" />
          Chat di WhatsApp
        </a>
      </Button>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="quiet" size="icon" className={cn("text-success hover:text-success", className)}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Chat di WhatsApp dengan ${lead.full_name}`}
            onClick={() => onChat(lead)}
          >
            <WhatsappIcon className="size-5" />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Chat di WhatsApp</TooltipContent>
    </Tooltip>
  );
}

/** Tombol catatan admin di tabel: pratinjau catatan, atau ajakan menambah catatan. */
export function NotesButton({ lead, onOpen, className }: { lead: LeadRow; onOpen: LeadRowActions["onOpen"]; className?: string }) {
  const preview = notePreview(lead.admin_notes, 80);
  return (
    <button
      type="button"
      onClick={() => onOpen(lead, true)}
      aria-label={preview ? `Ubah catatan admin ${lead.code}: ${preview}` : `Tambah catatan admin ${lead.code}`}
      title={preview || undefined}
      className={cn(
        "inline-flex h-10 max-w-full min-w-0 items-center gap-2 rounded-control px-2.5 text-left text-sm transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-brand-500/20",
        preview ? "text-ink-2" : "text-muted",
        className,
      )}
    >
      <NotebookPen className={cn("size-4 shrink-0", preview ? "text-brand-600" : "text-subtle")} aria-hidden="true" />
      <span className="truncate">{preview || "Tambah"}</span>
    </button>
  );
}
