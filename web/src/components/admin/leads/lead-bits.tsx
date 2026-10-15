"use client";

import { NotebookPen } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { guestChatLink, type LeadRow, type LeadStatusValue } from "@/lib/admin/lead-query";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { notePreview } from "./lead-list-model";

/** Aksi per baris yang dibagi tabel (desktop) dan kartu (HP). */
export type LeadRowActions = {
  onStatus: (lead: LeadRow, status: LeadStatusValue) => void;
  /** Buka detail permintaan; `focusNotes` langsung ke kolom catatan admin. */
  onOpen: (lead: LeadRow, focusNotes?: boolean) => void;
  /** Dipanggil saat tombol chat diklik (tautan tetap terbuka di tab baru). */
  onChat: (lead: LeadRow) => void;
  savingIds: ReadonlySet<string>;
};

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
        "inline-flex h-10 max-w-full min-w-0 items-center gap-2 rounded-control px-2.5 text-left text-sm transition-colors outline-none hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-brand-500/20",
        preview ? "text-ink-2" : "text-muted",
        className,
      )}
    >
      <NotebookPen className={cn("size-4 shrink-0", preview ? "text-brand-600" : "text-subtle")} aria-hidden="true" />
      <span className="truncate">{preview || "Tambah"}</span>
    </button>
  );
}
