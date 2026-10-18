"use client";

import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  LoaderCircle,
  MessageSquareText,
  NotebookPen,
  Trash2,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LeadStatusBadge } from "@/components/admin/kit/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { LeadRow } from "@/lib/admin/lead-query";
import { formatDateShort, formatDateTime, formatWhatsappDisplay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChatButton, estimateText, type LeadRowActions, type LeadSelectionProps } from "./lead-bits";
import { leadPageSelectionState, notePreview, stayNights } from "./lead-list-model";
import { LeadStatusSelect } from "./lead-status-select";

type Props = { rows: LeadRow[]; actions: LeadRowActions } & LeadSelectionProps;

function Detail({ icon: IconComponent, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2.5">
      <IconComponent className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden="true" />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 text-ink-2">{children}</dd>
    </div>
  );
}

/**
 * Kartu permintaan sewa untuk HP dan tablet: nama + badge status, ringkasan menginap, catatan,
 * lalu tombol besar (status, catatan, Chat di WhatsApp). Dua kolom kalau ruangnya cukup.
 */
export function LeadCards({ rows, actions, selecting, selection, onToggle, onTogglePage }: Props) {
  const pageState = leadPageSelectionState(selection, rows);
  return (
    <div className="@container">
      {selecting ? (
        <label className="mb-2 flex min-h-11 w-fit cursor-pointer items-center gap-3 rounded-control pr-3 pl-3.5 text-sm font-semibold text-ink-2 hover:bg-surface-2">
          <Checkbox
            aria-label="Pilih semua permintaan di halaman ini"
            checked={pageState}
            onCheckedChange={(checked) => onTogglePage(checked === true)}
          />
          <span aria-hidden="true">Pilih semua di halaman ini</span>
        </label>
      ) : null}
      <ul className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
        {rows.map((lead) => {
          const saving = actions.savingIds.has(lead.id);
          const nights = stayNights(lead);
          const guestNote = notePreview(lead.notes, 140);
          const adminNote = notePreview(lead.admin_notes, 140);
          const selected = selection.has(lead.id);
          return (
            <li
              key={lead.id}
              data-testid="admin-lead-row"
              aria-busy={saving || undefined}
              data-selected={selected || undefined}
              className={cn("glass-card flex min-w-0 flex-col rounded-card p-4", selected && "ring-2 ring-brand-500")}
            >
              <div className="flex items-start justify-between gap-3">
                {selecting ? (
                  <label className="-my-1 -ml-1 flex size-11 shrink-0 cursor-pointer items-center justify-center self-center">
                    <Checkbox aria-label={`Pilih ${lead.code}`} checked={selected} onCheckedChange={() => onToggle(lead)} />
                  </label>
                ) : null}
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => actions.onOpen(lead)}
                    className="block max-w-full truncate text-left text-base leading-6 font-bold text-ink underline-offset-2 outline-none hover:underline focus-visible:underline"
                  >
                    {lead.full_name}
                  </button>
                  <p className="truncate text-caption text-muted">
                    {lead.origin_city ? <span className="font-medium text-ink-2">{lead.origin_city} · </span> : null}
                    <span className="font-mono">{lead.code}</span> · <span className="tabular-nums">{formatWhatsappDisplay(lead.whatsapp)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {saving ? <LoaderCircle className="size-4 animate-spin text-muted" aria-hidden="true" /> : null}
                  <LeadStatusBadge status={lead.status} />
                </div>
              </div>

              <dl className="mt-3 grid gap-2 border-t border-line pt-3 text-sm">
                <Detail icon={BedDouble} label="Unit">
                  <span className={cn("font-semibold", !lead.unit_name && "text-muted")}>{lead.unit_name ?? "Unit tidak tercatat"}</span>
                  {lead.location_name ? <span className="text-muted"> · {lead.location_name}</span> : null}
                </Detail>
                <Detail icon={CalendarDays} label="Menginap">
                  <span className="inline-flex flex-wrap items-center gap-x-1">
                    {formatDateShort(lead.check_in)}
                    <ArrowRight className="size-3.5 text-muted" aria-hidden="true" />
                    <span className="sr-only">sampai</span>
                    {formatDateShort(lead.check_out)}
                  </span>
                  <span className="text-muted">
                    {" "}
                    · {nights ? `${nights} malam · ` : ""}
                    {lead.guests} tamu
                  </span>
                </Detail>
                <Detail icon={Wallet} label="Estimasi">
                  <span className="font-semibold text-ink tabular-nums">{estimateText(lead)}</span>
                </Detail>
                {lead.purpose || guestNote ? (
                  <Detail icon={MessageSquareText} label="Dari tamu">
                    {lead.purpose ? <span className="font-semibold">{lead.purpose}</span> : null}
                    {lead.purpose && guestNote ? <span className="text-muted"> · </span> : null}
                    {guestNote ? <span>{guestNote}</span> : null}
                  </Detail>
                ) : null}
                {adminNote ? (
                  <Detail icon={NotebookPen} label="Catatan admin">
                    <span className="text-ink">{adminNote}</span>
                  </Detail>
                ) : null}
              </dl>
              <p className="mt-2 text-caption text-muted">Masuk {formatDateTime(lead.created_at)}</p>

              <div className="mt-auto grid gap-2 pt-3">
                <div className="flex gap-2">
                  <LeadStatusSelect
                    size="card"
                    code={lead.code}
                    status={lead.status}
                    busy={saving}
                    onChange={(status) => actions.onStatus(lead, status)}
                    className="min-w-0 flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 shrink-0"
                    aria-label={`Catatan admin ${lead.code}`}
                    onClick={() => actions.onOpen(lead, true)}
                  >
                    <NotebookPen aria-hidden="true" />
                    Catatan
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 w-12 shrink-0 px-0 text-danger hover:text-danger"
                    aria-label={`Hapus permintaan ${lead.code}`}
                    onClick={() => actions.onDelete([lead])}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <ChatButton lead={lead} onChat={actions.onChat} variant="full" className="w-full" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
