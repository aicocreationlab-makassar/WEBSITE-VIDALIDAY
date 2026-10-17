// Logika murni daftar permintaan sewa admin (PRD 7.8): filter panel <-> URL, rentang tanggal + preset,
// tautan ekspor CSV, teks ringkas, dan pembaruan optimistis baris. Dipakai komponen klien; ada unit test.

import {
  LEAD_STATUS_VALUES,
  leadFilterParams,
  type LeadFilter,
  type LeadRow,
  type LeadStatusValue,
} from "@/lib/admin/lead-query";
import { addDays, diffDays, formatDateCompact, isDateString } from "@/lib/format";

export const LEAD_EXPORT_PATH = "/admin/leads/export";
export const ADMIN_NOTES_MAX = 1000;

// ---------------------------------------------------------------------------
// Filter panel (selain pencarian) <-> URL
// ---------------------------------------------------------------------------

export type LeadPanel = {
  status: LeadStatusValue | null;
  apartemen: string | null;
  masukDari: string | null;
  masukSampai: string | null;
  checkinDari: string | null;
  checkinSampai: string | null;
};

export const EMPTY_LEAD_PANEL: LeadPanel = {
  status: null,
  apartemen: null,
  masukDari: null,
  masukSampai: null,
  checkinDari: null,
  checkinSampai: null,
};

export type UrlChanges = Record<string, string | null>;

export function panelFromFilter(filter: LeadFilter): LeadPanel {
  return {
    status: filter.status,
    apartemen: filter.apartemen,
    masukDari: filter.masukDari,
    masukSampai: filter.masukSampai,
    checkinDari: filter.checkinDari,
    checkinSampai: filter.checkinSampai,
  };
}

/** Rentang tanggal yang terbalik (dari > sampai) ditukar supaya hasilnya tetap masuk akal. */
export function orderRange(from: string | null, to: string | null): [string | null, string | null] {
  if (from && to && from > to) return [to, from];
  return [from, to];
}

/** Perubahan URL untuk rentang tanggal masuk. */
export function masukChanges(from: string | null, to: string | null): UrlChanges {
  const [dari, sampai] = orderRange(from || null, to || null);
  return { masuk_dari: dari, masuk_sampai: sampai };
}

/** Perubahan URL untuk rentang check-in. */
export function checkinChanges(from: string | null, to: string | null): UrlChanges {
  const [dari, sampai] = orderRange(from || null, to || null);
  return { checkin_dari: dari, checkin_sampai: sampai };
}

/** Seluruh isi panel (sheet filter di HP) -> perubahan URL. */
export function panelChanges(panel: LeadPanel): UrlChanges {
  return {
    status: panel.status,
    apartemen: panel.apartemen || null,
    ...masukChanges(panel.masukDari, panel.masukSampai),
    ...checkinChanges(panel.checkinDari, panel.checkinSampai),
  };
}

/** Jumlah filter panel yang aktif (satu rentang tanggal dihitung satu). Untuk badge tombol Filter. */
export function panelFilterCount(filter: LeadPanel): number {
  return [
    filter.status,
    filter.apartemen,
    filter.masukDari || filter.masukSampai,
    filter.checkinDari || filter.checkinSampai,
  ].filter(Boolean).length;
}

export function hasActiveLeadFilters(filter: LeadFilter): boolean {
  return Boolean(filter.q) || panelFilterCount(filter) > 0;
}

export function toStatus(value: string): LeadStatusValue | null {
  return (LEAD_STATUS_VALUES as readonly string[]).includes(value) ? (value as LeadStatusValue) : null;
}

/** Opsi apartemen: daftar apartemen + nilai dari URL yang tidak ada di daftar (nama lama di data permintaan). */
export function apartmentOptions(names: string[], current: string | null): string[] {
  const list = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (current && !list.includes(current)) list.push(current);
  return list;
}

// ---------------------------------------------------------------------------
// Ekspor CSV
// ---------------------------------------------------------------------------

/** /admin/leads/export dengan filter yang sama (tanpa nomor halaman). */
export function exportHref(filter: LeadFilter): string {
  const query = leadFilterParams({ ...filter, hal: 1 }).toString();
  return query ? `${LEAD_EXPORT_PATH}?${query}` : LEAD_EXPORT_PATH;
}

// ---------------------------------------------------------------------------
// Rentang tanggal: preset + label ringkas
// ---------------------------------------------------------------------------

export type DateRangeKind = "masuk" | "checkin";

export type DatePreset = { key: string; label: string; from: string; to: string };

/** Preset cepat. Tanggal masuk melihat ke belakang, check-in melihat ke depan. `today` dalam WITA. */
export function datePresets(kind: DateRangeKind, today: string): DatePreset[] {
  if (kind === "masuk") {
    return [
      { key: "hari-ini", label: "Hari ini", from: today, to: today },
      { key: "kemarin", label: "Kemarin", from: addDays(today, -1), to: addDays(today, -1) },
      { key: "7-hari", label: "7 hari terakhir", from: addDays(today, -6), to: today },
      { key: "30-hari", label: "30 hari terakhir", from: addDays(today, -29), to: today },
    ];
  }
  return [
    { key: "hari-ini", label: "Hari ini", from: today, to: today },
    { key: "besok", label: "Besok", from: addDays(today, 1), to: addDays(today, 1) },
    { key: "7-hari", label: "7 hari ke depan", from: today, to: addDays(today, 6) },
    { key: "30-hari", label: "30 hari ke depan", from: today, to: addDays(today, 29) },
  ];
}

export function matchingPreset(presets: DatePreset[], from: string | null, to: string | null): string | null {
  return presets.find((preset) => preset.from === from && preset.to === to)?.key ?? null;
}

/** "16 Okt 2026", "16 Okt – 20 Okt 2026", "Sejak 16 Okt 2026", "Sampai 20 Okt 2026", atau null kalau kosong. */
export function rangeLabel(from: string | null, to: string | null): string | null {
  const validFrom = from && isDateString(from) ? from : null;
  const validTo = to && isDateString(to) ? to : null;
  if (validFrom && validTo) {
    if (validFrom === validTo) return formatDateCompact(validFrom);
    const fromText = formatDateCompact(validFrom);
    const toText = formatDateCompact(validTo);
    const sameYear = validFrom.slice(0, 4) === validTo.slice(0, 4);
    return `${sameYear ? fromText.replace(/\s\d{4}$/, "") : fromText} – ${toText}`;
  }
  if (validFrom) return `Sejak ${formatDateCompact(validFrom)}`;
  if (validTo) return `Sampai ${formatDateCompact(validTo)}`;
  return null;
}

// ---------------------------------------------------------------------------
// Tampilan baris
// ---------------------------------------------------------------------------

/** Jumlah malam (kolom generated di DB; dihitung ulang kalau kosong). null kalau tidak masuk akal. */
export function stayNights(lead: Pick<LeadRow, "nights" | "check_in" | "check_out">): number | null {
  const nights = lead.nights ?? diffDays(lead.check_in, lead.check_out);
  return Number.isFinite(nights) && nights > 0 ? nights : null;
}

/** Rentang menginap ringkas tanpa tahun: "18–20 Okt" (bulan sama) atau "30 Okt – 2 Nov". */
export function stayRangeLabel(checkIn: string, checkOut: string): string {
  if (!isDateString(checkIn) || !isDateString(checkOut)) return `${checkIn} – ${checkOut}`;
  const [fromDay, fromMonth] = formatDateCompact(checkIn).split(" ");
  const [toDay, toMonth] = formatDateCompact(checkOut).split(" ");
  if (checkIn.slice(0, 7) === checkOut.slice(0, 7)) return `${fromDay}–${toDay} ${toMonth}`;
  return `${fromDay} ${fromMonth} – ${toDay} ${toMonth}`;
}

/** Teks satu baris untuk pratinjau catatan (spasi dirapikan, dipotong dengan elipsis). */
export function notePreview(text: string | null | undefined, max = 60): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed.split(/\s+/)[0] || trimmed;
}

/** Catatan admin berubah dibanding yang tersimpan (spasi di tepi diabaikan, sama seperti skema zod). */
export function notesChanged(saved: string | null, draft: string): boolean {
  return (saved ?? "").trim() !== draft.trim();
}

// ---------------------------------------------------------------------------
// Chip status
// ---------------------------------------------------------------------------

export type LeadStatusCounts = Record<LeadStatusValue, number>;
export type StatusChipKey = LeadStatusValue | "semua";

export const STATUS_CHIP_KEYS: readonly StatusChipKey[] = ["semua", ...LEAD_STATUS_VALUES];

/** Jumlah per chip; "semua" = total semua status. null kalau hitungan tidak tersedia. */
export function chipCount(counts: LeadStatusCounts | null, key: StatusChipKey): number | null {
  if (!counts) return null;
  if (key === "semua") return LEAD_STATUS_VALUES.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  return counts[key] ?? 0;
}

// ---------------------------------------------------------------------------
// Pembaruan optimistis
// ---------------------------------------------------------------------------

export type LeadPatch =
  | { id: string; status?: LeadStatusValue; adminNotes?: string | null }
  /** Baris dihapus: langsung hilang dari daftar sambil menunggu server. */
  | { remove: string[] };

export function applyLeadPatch(rows: LeadRow[], patch: LeadPatch): LeadRow[] {
  if ("remove" in patch) {
    const gone = new Set(patch.remove);
    return rows.filter((row) => !gone.has(row.id));
  }
  return rows.map((row) => {
    if (row.id !== patch.id) return row;
    return {
      ...row,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.adminNotes !== undefined ? { admin_notes: patch.adminNotes } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Pilih banyak + hapus (PRD 7.8)
// ---------------------------------------------------------------------------

export type LeadSelection = ReadonlyMap<string, LeadRow>;

export function toggleLeadSelected(selection: LeadSelection, row: LeadRow): Map<string, LeadRow> {
  const next = new Map(selection);
  if (next.has(row.id)) next.delete(row.id);
  else next.set(row.id, row);
  return next;
}

export function setLeadsPageSelected(selection: LeadSelection, rows: LeadRow[], checked: boolean): Map<string, LeadRow> {
  const next = new Map(selection);
  for (const row of rows) {
    if (checked) next.set(row.id, row);
    else next.delete(row.id);
  }
  return next;
}

/** Status checkbox "pilih semua di halaman ini". */
export function leadPageSelectionState(selection: LeadSelection, rows: LeadRow[]): boolean | "indeterminate" {
  if (!rows.length) return false;
  const count = rows.filter((row) => selection.has(row.id)).length;
  if (count === 0) return false;
  return count === rows.length ? true : "indeterminate";
}

/** Data terbaru untuk baris terpilih (bisa lintas halaman): baris di halaman ini menggantikan salinan lama. */
export function freshLeadSelection(selection: LeadSelection, rows: LeadRow[]): LeadRow[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return [...selection.values()].map((row) => byId.get(row.id) ?? row);
}

/** Teks dialog konfirmasi hapus (satu permintaan disebut kodenya, banyak disebut jumlahnya). */
export function deleteConfirmCopy(leads: readonly Pick<LeadRow, "code" | "full_name">[]): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  const description =
    "Data tamu terhapus permanen dari database dan tidak bisa dikembalikan. Hitungan popularitas unit ikut berkurang.";
  if (leads.length === 1) {
    return {
      title: `Hapus permintaan ${leads[0].code}?`,
      description: `Permintaan atas nama ${leads[0].full_name}. ${description}`,
      confirmLabel: "Hapus permanen",
    };
  }
  return { title: `Hapus ${leads.length} permintaan?`, description, confirmLabel: `Hapus ${leads.length} permintaan` };
}
