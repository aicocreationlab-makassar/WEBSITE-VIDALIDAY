"use client";

import { ArrowRight, MessageSquareText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { LeadRow } from "@/lib/admin/lead-query";
import { formatDate, formatDateCompact, formatTime, formatWhatsappDisplay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChatButton, estimateText, LeadRowMenu, NotesButton, type LeadRowActions, type LeadSelectionProps } from "./lead-bits";
import { leadPageSelectionState, notePreview, stayNights, stayRangeLabel } from "./lead-list-model";
import { LeadStatusSelect } from "./lead-status-select";

// Header menempel di bawah topbar 64px; kartu memakai overflow-clip supaya sticky tetap jalan (pola tabel unit).
const TH =
  "sticky top-16 z-10 h-11 bg-white px-2.5 text-left align-middle text-caption font-semibold whitespace-nowrap text-muted shadow-[inset_0_-1px_0_var(--color-line)]";
const TD = "border-b border-line px-2.5 py-2 align-middle";
// Kolom tambahan saat ruang daftar >= 1440px (container query terhadap pembungkus daftar).
const WIDE_CELL = "hidden @min-[90rem]:table-cell";

type Props = { rows: LeadRow[]; actions: LeadRowActions } & LeadSelectionProps;

/**
 * Tabel permintaan sewa desktop (DESIGN 5): baris 64px, hover surface, aksi di kanan. Dipakai kalau
 * lebar daftar >= 1024px. Di ruang sedang kode, WhatsApp, dan jumlah tamu menumpang di baris kecil;
 * di ruang lebar (>= 1440px) mendapat kolom sendiri. Mode "Pilih" menambah kolom checkbox.
 */
export function LeadTable({ rows, actions, selecting, selection, onToggle, onTogglePage }: Props) {
  const pageState = leadPageSelectionState(selection, rows);
  return (
    <div className="glass-card overflow-clip rounded-card">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {selecting ? (
              <th scope="col" className={cn(TH, "w-14 pr-0 pl-2")}>
                <label className="flex size-11 cursor-pointer items-center justify-center">
                  <Checkbox
                    aria-label="Pilih semua permintaan di halaman ini"
                    checked={pageState}
                    onCheckedChange={(checked) => onTogglePage(checked === true)}
                  />
                </label>
              </th>
            ) : null}
            <th scope="col" className={cn(TH, "pl-4")}>
              Waktu masuk
            </th>
            <th scope="col" className={cn(TH, WIDE_CELL)}>
              Kode
            </th>
            <th scope="col" className={TH}>
              Nama
            </th>
            <th scope="col" className={cn(TH, WIDE_CELL)}>
              WhatsApp
            </th>
            <th scope="col" className={TH}>
              Unit
            </th>
            <th scope="col" className={TH}>
              <span className="inline-flex items-center gap-1">
                Check-in
                <ArrowRight className="size-3.5" aria-hidden="true" />
                <span className="sr-only">sampai</span>
                Check-out
              </span>
            </th>
            <th scope="col" className={cn(TH, WIDE_CELL, "text-right")}>
              Tamu
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              Estimasi
            </th>
            <th scope="col" className={TH}>
              Status
            </th>
            <th scope="col" className={TH}>
              Catatan admin
            </th>
            <th scope="col" className={cn(TH, "pr-3")}>
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {rows.map((lead) => {
            const saving = actions.savingIds.has(lead.id);
            const nights = stayNights(lead);
            const whatsapp = formatWhatsappDisplay(lead.whatsapp);
            const guestNote = notePreview(lead.notes, 160);
            const selected = selection.has(lead.id);
            return (
              <tr
                key={lead.id}
                data-testid="admin-lead-row"
                aria-busy={saving || undefined}
                aria-selected={selecting ? selected : undefined}
                className={cn("h-16 transition-colors hover:bg-surface", selected && "bg-brand-50/60 hover:bg-brand-50/60")}
              >
                {selecting ? (
                  <td className={cn(TD, "pr-0 pl-2")}>
                    <label className="flex size-11 cursor-pointer items-center justify-center">
                      <Checkbox aria-label={`Pilih ${lead.code}`} checked={selected} onCheckedChange={() => onToggle(lead)} />
                    </label>
                  </td>
                ) : null}
                <td className={cn(TD, "pl-4 whitespace-nowrap")}>
                  <p className="text-ink-2">{formatDateCompact(lead.created_at)}</p>
                  <p className="text-caption text-muted">{formatTime(lead.created_at)}</p>
                </td>
                <td className={cn(TD, WIDE_CELL, "whitespace-nowrap")}>
                  <span className="font-mono text-[13px] text-ink-2">{lead.code}</span>
                </td>
                <td className={cn(TD, "w-full max-w-0 min-w-32")}>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => actions.onOpen(lead)}
                      className="truncate text-left text-[15px] font-bold text-ink underline-offset-2 outline-none hover:text-brand-700 hover:underline focus-visible:underline"
                    >
                      {lead.full_name}
                    </button>
                    {guestNote ? (
                      <span title={`Catatan tamu: ${guestNote}`} className="shrink-0 text-brand-600">
                        <MessageSquareText className="size-4" aria-hidden="true" />
                        <span className="sr-only">Ada catatan tamu</span>
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-caption text-muted">
                    {lead.origin_city ? <span className="font-medium text-ink-2">{lead.origin_city} · </span> : null}
                    <span className="@min-[90rem]:hidden">
                      <span className="font-mono">{lead.code}</span> · <span className="tabular-nums">{whatsapp}</span>
                    </span>
                    <span className="hidden @min-[90rem]:inline">{lead.purpose ?? "Keperluan tidak diisi"}</span>
                  </p>
                </td>
                <td className={cn(TD, WIDE_CELL, "whitespace-nowrap text-ink-2 tabular-nums")}>{whatsapp}</td>
                <td className={TD}>
                  <p
                    className={cn(
                      "max-w-32 truncate font-semibold @min-[90rem]:max-w-44",
                      lead.unit_name ? "text-ink-2" : "text-muted",
                    )}
                    title={lead.unit_name ?? undefined}
                  >
                    {lead.unit_name ?? "Unit tidak tercatat"}
                  </p>
                  {lead.location_name ? (
                    <p className="max-w-32 truncate text-caption text-muted @min-[90rem]:max-w-44">{lead.location_name}</p>
                  ) : null}
                </td>
                <td className={cn(TD, "whitespace-nowrap")} title={`${formatDate(lead.check_in)} sampai ${formatDate(lead.check_out)}`}>
                  <p className="text-ink-2">{stayRangeLabel(lead.check_in, lead.check_out)}</p>
                  <p className="text-caption text-muted">
                    {nights ? `${nights} malam` : "–"}
                    <span className="@min-[90rem]:hidden"> · {lead.guests} tamu</span>
                  </p>
                </td>
                <td className={cn(TD, WIDE_CELL, "text-right font-semibold text-ink-2 tabular-nums")}>{lead.guests}</td>
                <td className={cn(TD, "text-right font-semibold whitespace-nowrap text-ink tabular-nums")}>{estimateText(lead)}</td>
                <td className={cn(TD, "whitespace-nowrap")}>
                  <LeadStatusSelect
                    code={lead.code}
                    status={lead.status}
                    busy={saving}
                    onChange={(status) => actions.onStatus(lead, status)}
                  />
                </td>
                <td className={TD}>
                  <NotesButton lead={lead} onOpen={actions.onOpen} className="max-w-28 @min-[90rem]:max-w-48" />
                </td>
                <td className={cn(TD, "pr-2 pl-0 text-right whitespace-nowrap")}>
                  <ChatButton lead={lead} onChat={actions.onChat} variant="icon" />
                  <LeadRowMenu lead={lead} actions={actions} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
