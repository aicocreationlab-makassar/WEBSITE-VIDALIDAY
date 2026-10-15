// Permintaan sewa di admin (PRD 7.8): filter dari URL, batas tanggal WITA, baris CSV, sapaan WhatsApp.
// Fungsi murni (ada test). Query ke DB dibangun di lib/data/admin/leads.ts dengan nilai dari sini.

import type { CsvValue } from "@/lib/csv";
import { formatDate, formatDateTime, formatRupiah, formatWhatsappDisplay, isDateString } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

export const LEAD_STATUS_VALUES = ["baru", "dihubungi", "deal", "batal"] as const;
export type LeadStatusValue = (typeof LEAD_STATUS_VALUES)[number];

export const LEADS_PAGE_SIZE = 25;
export const LEADS_EXPORT_LIMIT = 5000;

export type LeadFilter = {
  q: string;
  status: LeadStatusValue | null;
  /** Nama apartemen (snapshot `leads.location_name`; tabel leads tidak punya location_id). */
  apartemen: string | null;
  masukDari: string | null;
  masukSampai: string | null;
  checkinDari: string | null;
  checkinSampai: string | null;
  hal: number;
};

export const EMPTY_LEAD_FILTER: LeadFilter = {
  q: "",
  status: null,
  apartemen: null,
  masukDari: null,
  masukSampai: null,
  checkinDari: null,
  checkinSampai: null,
  hal: 1,
};

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function get(params: RawParams, key: string): string | null {
  if (params instanceof URLSearchParams) return params.get(key);
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

function date(value: string | null): string | null {
  return value && isDateString(value) ? value : null;
}

export function parseLeadFilter(params: RawParams): LeadFilter {
  const status = get(params, "status");
  const page = Number(get(params, "hal"));
  const apartemen = (get(params, "apartemen") ?? "").trim().slice(0, 120);
  return {
    q: (get(params, "q") ?? "").trim().slice(0, 80),
    status: (LEAD_STATUS_VALUES as readonly string[]).includes(status ?? "") ? (status as LeadStatusValue) : null,
    apartemen: apartemen || null,
    masukDari: date(get(params, "masuk_dari")),
    masukSampai: date(get(params, "masuk_sampai")),
    checkinDari: date(get(params, "checkin_dari")),
    checkinSampai: date(get(params, "checkin_sampai")),
    hal: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1,
  };
}

export function leadFilterParams(filter: Partial<LeadFilter>): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.status) params.set("status", filter.status);
  if (filter.apartemen) params.set("apartemen", filter.apartemen);
  if (filter.masukDari) params.set("masuk_dari", filter.masukDari);
  if (filter.masukSampai) params.set("masuk_sampai", filter.masukSampai);
  if (filter.checkinDari) params.set("checkin_dari", filter.checkinDari);
  if (filter.checkinSampai) params.set("checkin_sampai", filter.checkinSampai);
  if (filter.hal && filter.hal > 1) params.set("hal", String(filter.hal));
  return params;
}

/** Awal hari kalender di WITA sebagai timestamp ISO (UTC+8, tanpa DST). */
export function witaDayStart(day: string): string {
  return `${day}T00:00:00+08:00`;
}

/** Batas atas eksklusif: awal hari berikutnya di WITA. */
export function witaDayEndExclusive(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return `${next}T00:00:00+08:00`;
}

/**
 * Pola pencarian aman untuk PostgREST or(): huruf/angka/spasi/tanda hubung saja
 * (koma dan kurung akan merusak sintaks or()).
 */
export function sanitizeSearch(q: string): string {
  return q.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
}

/** Filter or() untuk nama, kode, dan nomor (nomor juga dicocokkan versi 62…). */
export function leadSearchOr(q: string): string | null {
  const term = sanitizeSearch(q);
  if (!term) return null;
  const parts = [`full_name.ilike.*${term}*`, `code.ilike.*${term}*`];
  const digits = term.replace(/\D/g, "");
  if (digits.length >= 4) {
    parts.push(`whatsapp.ilike.*${digits.replace(/^0/, "")}*`);
  }
  return parts.join(",");
}

export type LeadRow = {
  id: string;
  code: string;
  created_at: string;
  full_name: string;
  whatsapp: string;
  unit_id: number | null;
  unit_name: string | null;
  location_name: string | null;
  nightly_price: number | null;
  check_in: string;
  check_out: string;
  nights: number | null;
  guests: number;
  purpose: string | null;
  notes: string | null;
  estimated_total: number | null;
  status: string;
  admin_notes: string | null;
};

export const LEAD_CSV_HEADER = [
  "Waktu masuk",
  "Kode",
  "Nama",
  "WhatsApp",
  "Unit",
  "Apartemen",
  "Check-in",
  "Check-out",
  "Malam",
  "Tamu",
  "Keperluan",
  "Catatan tamu",
  "Estimasi",
  "Status",
  "Catatan admin",
];

const STATUS_LABEL: Record<string, string> = { baru: "Baru", dihubungi: "Dihubungi", deal: "Deal", batal: "Batal" };

export function leadCsvRow(lead: LeadRow): CsvValue[] {
  return [
    formatDateTime(lead.created_at),
    lead.code,
    lead.full_name,
    formatWhatsappDisplay(lead.whatsapp),
    lead.unit_name ?? "",
    lead.location_name ?? "",
    formatDate(lead.check_in),
    formatDate(lead.check_out),
    lead.nights ?? "",
    lead.guests,
    lead.purpose ?? "",
    lead.notes ?? "",
    lead.estimated_total != null ? formatRupiah(Number(lead.estimated_total)) : "",
    STATUS_LABEL[lead.status] ?? lead.status,
    lead.admin_notes ?? "",
  ];
}

/** Tombol "Chat di WhatsApp" ke tamu dengan sapaan pembuka (PRD 7.8). */
export function guestChatLink(lead: Pick<LeadRow, "whatsapp" | "full_name" | "unit_name" | "code" | "check_in">): string {
  const firstName = lead.full_name.trim().split(/\s+/)[0] || lead.full_name;
  const unit = lead.unit_name ? ` untuk unit ${lead.unit_name}` : "";
  return waLink(
    lead.whatsapp,
    `Halo ${firstName}, terima kasih sudah mengirim permintaan sewa${unit} di VIDALIDAY (kode ${lead.code}, check-in ${formatDate(lead.check_in)}). Kami bantu cek ketersediaannya ya.`,
  );
}
