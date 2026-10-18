"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/kit/confirm-dialog";
import { Field } from "@/components/admin/kit/field";
import { LeadStatusBadge } from "@/components/admin/kit/status-badge";
import { ResponsiveDialog } from "@/components/admin/locations/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateLead } from "@/lib/actions/admin/leads";
import type { LeadRow } from "@/lib/admin/lead-query";
import { formatDate, formatDateTime, formatRupiah, formatWhatsappDisplay } from "@/lib/format";
import { leadUpdateSchema } from "@/lib/validation/admin";
import { ChatButton, estimateText } from "./lead-bits";
import { ADMIN_NOTES_MAX, notesChanged, stayNights } from "./lead-list-model";

const NETWORK_ERROR = "Catatan gagal disimpan. Periksa koneksi lalu coba lagi.";

type Props = {
  lead: LeadRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dibuka dari tombol catatan: kursor langsung di kolom catatan admin. */
  focusNotes: boolean;
  onChat: (lead: LeadRow) => void;
  /** Minta konfirmasi hapus permanen; daftar yang menutup dialog ini. */
  onDelete: (lead: LeadRow) => void;
};

function Item({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-caption font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 text-[15px] break-words text-ink">{children}</dd>
    </div>
  );
}

/**
 * Detail permintaan sewa (data tamu hanya-baca) + catatan admin yang bisa diubah (maks. 1000 karakter).
 * Modal di desktop, bottom sheet di HP. Dipasang ulang (key) setiap dibuka, jadi isian mulai dari data terbaru.
 */
export function LeadDetailDialog({ lead, open, onOpenChange, focusNotes, onChat, onDelete }: Props) {
  const [text, setText] = useState(lead.admin_notes ?? "");
  const [error, setError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const dirty = notesChanged(lead.admin_notes, text);
  const nights = stayNights(lead);

  function requestClose(next: boolean) {
    if (!next && dirty && !saving) {
      setConfirmOpen(true);
      return;
    }
    onOpenChange(next);
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = leadUpdateSchema.safeParse({ id: lead.id, adminNotes: text });
    if (!parsed.success) {
      setError(parsed.error.issues.find((issue) => issue.path[0] === "adminNotes")?.message ?? "Periksa lagi isian catatan.");
      return;
    }
    setError(undefined);
    startSaving(async () => {
      try {
        const result = await updateLead({ id: parsed.data.id, adminNotes: parsed.data.adminNotes ?? "" });
        if (result.ok) {
          toast.success(result.message ?? "Catatan admin disimpan");
          onOpenChange(false);
        } else {
          setError(result.fieldErrors?.adminNotes);
          toast.error(result.error);
        }
      } catch {
        toast.error(NETWORK_ERROR);
      }
    });
  }

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={requestClose}
        title={`Permintaan ${lead.code}`}
        description={`Masuk ${formatDateTime(lead.created_at)}`}
        busy={saving}
      >
        <div className="grid gap-5">
          <dl className="grid gap-x-6 gap-y-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-2">
            <Item label="Nama">{lead.full_name}</Item>
            <Item label="Kota asal">{lead.origin_city ?? <span className="text-muted">Tidak diisi</span>}</Item>
            <Item label="WhatsApp">
              <span className="tabular-nums">{formatWhatsappDisplay(lead.whatsapp)}</span>
            </Item>
            <Item label="Status">
              <LeadStatusBadge status={lead.status} />
            </Item>
            <Item label="Tamu">{lead.guests} orang</Item>
            <Item label="Keperluan">{lead.purpose ?? <span className="text-muted">Tidak diisi</span>}</Item>
            <Item label="Unit" wide>
              {lead.unit_name ?? "Unit tidak tercatat"}
              {lead.location_name ? <span className="text-muted"> · {lead.location_name}</span> : null}
            </Item>
            <Item label="Menginap" wide>
              <span className="inline-flex flex-wrap items-center gap-x-1.5">
                {formatDate(lead.check_in)}
                <ArrowRight className="size-4 text-muted" aria-hidden="true" />
                <span className="sr-only">sampai</span>
                {formatDate(lead.check_out)}
              </span>
              {nights ? <span className="text-muted"> · {nights} malam</span> : null}
            </Item>
            <Item label="Estimasi" wide>
              <span className="font-semibold tabular-nums">{estimateText(lead)}</span>
              {lead.nightly_price != null ? (
                <span className="text-sm text-muted"> · harga saat itu {formatRupiah(Number(lead.nightly_price))} per malam</span>
              ) : null}
            </Item>
            <Item label="Catatan tamu" wide>
              {lead.notes ? (
                <span className="whitespace-pre-line">{lead.notes}</span>
              ) : (
                <span className="text-muted">Tidak ada catatan dari tamu.</span>
              )}
            </Item>
          </dl>

          <form onSubmit={save} className="grid gap-4" noValidate>
            <Field
              label="Catatan admin"
              error={error}
              hint="Hanya terlihat oleh admin, mis. sudah transfer DP atau minta ganti tanggal."
              aside={
                <span className={text.length > ADMIN_NOTES_MAX ? "font-semibold text-danger" : undefined}>
                  {text.length}/{ADMIN_NOTES_MAX}
                </span>
              }
            >
              <Textarea
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  if (error) setError(undefined);
                }}
                maxLength={ADMIN_NOTES_MAX}
                rows={4}
                autoFocus={focusNotes}
                onFocus={(event) => {
                  // Saat dibuka dari tombol catatan, kursor di akhir catatan yang sudah ada.
                  if (!focusNotes) return;
                  const end = event.currentTarget.value.length;
                  event.currentTarget.setSelectionRange(end, end);
                }}
                disabled={saving}
                className="max-h-64"
              />
            </Field>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <ChatButton lead={lead} onChat={onChat} variant="icon" className="hidden sm:inline-flex" />
              <Button
                type="button"
                variant="quiet"
                className="text-danger hover:bg-brand-50 hover:text-danger"
                disabled={saving}
                onClick={() => onDelete(lead)}
              >
                <Trash2 aria-hidden="true" />
                Hapus permintaan
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
                <Button type="button" variant="secondary" onClick={() => requestClose(false)} disabled={saving}>
                  Batal
                </Button>
                <Button type="submit" loading={saving} disabled={!dirty}>
                  Simpan catatan
                </Button>
              </div>
            </div>
          </form>
        </div>
      </ResponsiveDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Buang perubahan catatan?"
        description="Catatan yang belum disimpan akan hilang."
        confirmLabel="Buang perubahan"
        cancelLabel="Lanjut menulis"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
