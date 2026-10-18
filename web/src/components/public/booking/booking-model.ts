// Logika murni form sewa (PRD 6.5, UX 2.5). Tanpa React dan tanpa akses jam/penyimpanan:
// "hari ini" dan "sekarang" selalu dari luar supaya bisa diuji dan aman untuk render.

import { addDays, diffDays, formatDateShort, formatOfficeHours, formatRupiah, isDateString } from "@/lib/format";
import { estimateTotal, type RateKind } from "@/lib/pricing";
import type { BookingInput } from "@/lib/validation/booking";
import { MAX_GUESTS, type BookingField } from "@/lib/validation/booking-constants";
import type { LastLead, SavedGuest } from "@/lib/wa-redirect";
import type { BookingPrefill, BookingUnit } from "./types";

/** Nilai form (sebelum transform zod). */
export type BookingFormValues = BookingInput;

/** Check-in paling jauh dari hari ini, dan lama menginap paling panjang. */
export const MAX_ADVANCE_DAYS = 365;
export const MAX_NIGHTS = 365;

/** Tamu bawaan kalau tidak ada isian dari kartu sewa. */
export const DEFAULT_GUESTS = 2;

/** Panel "Permintaan terkirim" hanya untuk permintaan yang belum lama dikirim. */
export const LEAD_FRESH_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Tanggal
// ---------------------------------------------------------------------------

export type StayDates = { checkIn: string; checkOut: string };

/** Lama menginap 1-365 malam, atau null kalau tanggal belum lengkap/terbalik. */
export function stayNights(checkIn: string, checkOut: string): number | null {
  if (!isDateString(checkIn) || !isDateString(checkOut)) return null;
  const nights = diffDays(checkIn, checkOut);
  return nights >= 1 && nights <= MAX_NIGHTS ? nights : null;
}

function inCheckInRange(date: string | undefined, today: string): date is string {
  return Boolean(date && isDateString(date) && date >= today && date <= addDays(today, MAX_ADVANCE_DAYS));
}

/**
 * Tanggal awal: isian kartu sewa kalau masih masuk akal, kalau tidak hari ini dan besok
 * (supaya estimasi langsung tampil).
 */
export function defaultDates(today: string, prefill: BookingPrefill = {}): StayDates {
  const checkIn = inCheckInRange(prefill.checkIn, today) ? prefill.checkIn : today;
  const checkOut =
    prefill.checkOut && stayNights(checkIn, prefill.checkOut) !== null ? prefill.checkOut : addDays(checkIn, 1);
  return { checkIn, checkOut };
}

/**
 * Check-in diganti: kalau check-in baru menyentuh/melewati check-out (atau check-out kosong),
 * geser check-out supaya jumlah malam sebelumnya tetap (minimal 1).
 */
export function adjustCheckOut(previous: StayDates, nextCheckIn: string): string {
  if (!isDateString(nextCheckIn)) return previous.checkOut;
  if (isDateString(previous.checkOut) && nextCheckIn < previous.checkOut) return previous.checkOut;
  const nights = stayNights(previous.checkIn, previous.checkOut) ?? 1;
  return addDays(nextCheckIn, nights);
}

export type DateBounds = { checkInMin: string; checkInMax: string; checkOutMin: string; checkOutMax: string };

/** Atribut min/max input tanggal bawaan (kalender HP menandai tanggal di luar rentang). */
export function dateBounds(today: string, checkIn: string): DateBounds {
  const checkInMax = addDays(today, MAX_ADVANCE_DAYS);
  const base = inCheckInRange(checkIn, today) ? checkIn : today;
  return {
    checkInMin: today,
    checkInMax,
    checkOutMin: addDays(base, 1),
    checkOutMax: addDays(base, MAX_NIGHTS),
  };
}

/** "Sab, 17 Okt → Sen, 19 Okt · 2 malam" (format WITA, tidak ikut bahasa perangkat). */
export function staySummary(checkIn: string, checkOut: string): string | null {
  const nights = stayNights(checkIn, checkOut);
  if (nights === null) return null;
  return `${formatDateShort(checkIn)} → ${formatDateShort(checkOut)} · ${nights} malam`;
}

// ---------------------------------------------------------------------------
// Estimasi
// ---------------------------------------------------------------------------

export type RateUnit = Pick<BookingUnit, "effectivePrice" | "weeklyPrice" | "monthlyPrice">;

export type EstimateView =
  | { kind: "estimate"; amount: string; nights: number; rate: RateKind; suffix: string; text: string }
  | { kind: "empty"; text: string };

export const ESTIMATE_EMPTY_TEXT = "Pilih tanggal untuk melihat estimasi";

const RATE_SUFFIX: Record<RateKind, string> = {
  harian: "",
  mingguan: " (tarif mingguan)",
  bulanan: " (tarif bulanan)",
};

/** "Estimasi Rp560.000 untuk 2 malam" (+ tarif mingguan/bulanan), rumus sama dengan submit_lead. */
export function estimateView(unit: RateUnit, checkIn: string, checkOut: string): EstimateView {
  const nights = stayNights(checkIn, checkOut);
  if (nights === null) return { kind: "empty", text: ESTIMATE_EMPTY_TEXT };
  const estimate = estimateTotal(
    { effective_price: unit.effectivePrice, weekly_price: unit.weeklyPrice, monthly_price: unit.monthlyPrice },
    nights,
  );
  if (estimate.total <= 0) {
    return { kind: "empty", text: `${nights} malam, harga dikonfirmasi admin` };
  }
  const amount = formatRupiah(estimate.total);
  const suffix = RATE_SUFFIX[estimate.rate];
  return {
    kind: "estimate",
    amount,
    nights,
    rate: estimate.rate,
    suffix,
    text: `Estimasi ${amount} untuk ${nights} malam${suffix}`,
  };
}

// ---------------------------------------------------------------------------
// Tamu
// ---------------------------------------------------------------------------

/** Bulat, 1 sampai 30. Nilai rusak → 1. */
export function clampGuests(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_GUESTS, Math.max(1, Math.round(value)));
}

/** Isian kartu sewa apa adanya (dibatasi 1-30); kalau kosong 2, tapi tidak melebihi kapasitas unit. */
export function defaultGuests(prefill: number | undefined, maxGuests: number): number {
  if (prefill !== undefined && Number.isFinite(prefill)) return clampGuests(prefill);
  const capacity = Number.isFinite(maxGuests) && maxGuests >= 1 ? maxGuests : DEFAULT_GUESTS;
  return clampGuests(Math.min(DEFAULT_GUESTS, capacity));
}

export function exceedsCapacity(guests: number, maxGuests: number): boolean {
  return maxGuests >= 1 && guests > maxGuests;
}

/** Tautan "Lihat unit untuk n tamu": parameter `tamu` diganti jumlah tamu sekarang. */
export function largerUnitsLink(href: string, guests: number): string {
  const [beforeHash, hash = ""] = href.split("#", 2);
  const [path, query = ""] = beforeHash.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("tamu", String(clampGuests(guests)));
  return `${path}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

// ---------------------------------------------------------------------------
// Isian awal
// ---------------------------------------------------------------------------

export type InitialBookingState = {
  today: string;
  values: BookingFormValues;
  /** Ada data tersimpan: nama dan nomor diringkas jadi satu baris "Atas nama ...". */
  identityCollapsed: boolean;
  remember: boolean;
};

export function initialBookingState(options: {
  today: string;
  unit: Pick<BookingUnit, "id" | "slug" | "maxGuests">;
  prefill?: BookingPrefill;
  saved?: SavedGuest | null;
  sourcePath: string;
}): InitialBookingState {
  const { today, unit, prefill = {}, sourcePath } = options;
  const saved = options.saved?.fullName.trim() && options.saved.whatsapp.trim() ? options.saved : null;
  const savedCity = saved?.originCity?.trim() ?? "";
  const dates = defaultDates(today, prefill);
  return {
    today,
    values: {
      unitId: unit.id,
      fullName: saved?.fullName ?? "",
      originCity: savedCity,
      whatsapp: saved?.whatsapp ?? "",
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      guests: defaultGuests(prefill.guests, unit.maxGuests),
      purpose: null,
      notes: "",
      website: "",
      sourcePath,
    },
    // Data tersimpan sebelum ada kota asal: identitas tetap terbuka supaya kotanya diisi.
    identityCollapsed: saved !== null && savedCity !== "",
    remember: saved !== null,
  };
}

// ---------------------------------------------------------------------------
// Urutan field (fokus ke error pertama, fokus awal)
// ---------------------------------------------------------------------------

export const FIELD_ORDER: readonly BookingField[] = [
  "fullName",
  "originCity",
  "whatsapp",
  "checkIn",
  "checkOut",
  "guests",
  "purpose",
  "notes",
];

/** Field dari server yang dipetakan ke error per isian. */
export const SERVER_ERROR_FIELDS: readonly BookingField[] = [
  "fullName",
  "originCity",
  "whatsapp",
  "checkIn",
  "checkOut",
  "guests",
  "notes",
];

export function firstInvalidField(keys: Iterable<string>): BookingField | null {
  const set = new Set(keys);
  return FIELD_ORDER.find((field) => set.has(field)) ?? null;
}

/** Error server → pasangan [field, pesan] sesuai urutan form, hanya field yang dikenal. */
export function serverFieldErrors(
  fieldErrors: Partial<Record<BookingField, string>> | undefined,
): [BookingField, string][] {
  if (!fieldErrors) return [];
  return SERVER_ERROR_FIELDS.flatMap((field) => {
    const message = fieldErrors[field];
    return message ? [[field, message] as [BookingField, string]] : [];
  });
}

export type FocusableField = "fullName" | "originCity" | "whatsapp" | "checkIn" | "checkOut";

/** Fokus awal: isian kosong pertama; kalau semua terisi, check-in. */
export function firstEmptyField(
  values: Pick<BookingFormValues, FocusableField>,
  identityCollapsed: boolean,
): FocusableField {
  const order: FocusableField[] = identityCollapsed
    ? ["checkIn", "checkOut"]
    : ["fullName", "originCity", "whatsapp", "checkIn", "checkOut"];
  return order.find((field) => !String(values[field] ?? "").trim()) ?? "checkIn";
}

// ---------------------------------------------------------------------------
// Setelah kembali dari WhatsApp
// ---------------------------------------------------------------------------

/** Isi sessionStorage "vdl:lastLead" → permintaan unit ini yang belum lewat 30 menit. */
export function activeLead(raw: string | null, slug: string, now: number): LastLead | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<LastLead> | null;
    if (!value || value.unit !== slug || typeof value.url !== "string" || typeof value.at !== "number") return null;
    const age = now - value.at;
    if (age < 0 || age > LEAD_FRESH_MS) return null;
    return { unit: value.unit, url: value.url, at: value.at, code: typeof value.code === "string" ? value.code : null };
  } catch {
    return null;
  }
}

export type OfficeHours = { start: number; end: number; startLabel: string };

/** "Setiap Hari: 08.00 - 23.00 WITA" → menit sejak 00.00 (null kalau tidak terbaca). */
export function parseOfficeHours(raw: string): OfficeHours | null {
  const match = /(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})/.exec(raw);
  if (!match) return null;
  const [sh, sm, eh, em] = match.slice(1).map(Number);
  if (sh > 24 || eh > 24 || sm > 59 || em > 59) return null;
  return {
    start: sh * 60 + sm,
    end: eh * 60 + em,
    startLabel: `${String(sh).padStart(2, "0")}.${String(sm).padStart(2, "0")}`,
  };
}

/** Menit sejak 00.00 WITA (UTC+8, tanpa musim panas). */
export function makassarMinutes(now: number): number {
  const minutes = Math.floor(now / 60_000) + 8 * 60;
  return ((minutes % 1440) + 1440) % 1440;
}

/** true hanya kalau jam layanan terbaca dan sekarang di luar rentangnya. */
export function isOutsideOfficeHours(raw: string, now: number): boolean {
  const hours = parseOfficeHours(raw);
  if (!hours || hours.start === hours.end) return false;
  const minute = makassarMinutes(now);
  const open =
    hours.start < hours.end
      ? minute >= hours.start && minute < hours.end
      : minute >= hours.start || minute < hours.end;
  return !open;
}

export const SUCCESS_PREFIX = "Permintaan terkirim ke WhatsApp.";

/** Kalimat panel sukses (PRD 6.5 langkah 6, UX 2.5). */
export function successMessage(officeHours: string, outside: boolean): string {
  const hours = parseOfficeHours(officeHours);
  if (outside && hours) {
    return `${SUCCESS_PREFIX} Saat ini di luar jam layanan. Admin membalas mulai ${hours.startLabel} WITA.`;
  }
  const label = formatOfficeHours(officeHours);
  return label
    ? `${SUCCESS_PREFIX} Admin membalas di jam layanan, ${label}.`
    : `${SUCCESS_PREFIX} Admin membalas di jam layanan.`;
}

export type LeadSnapshot = { lead: LastLead; outside: boolean };

/** Nilai stabil (string) untuk useSyncExternalStore; null kalau tidak ada permintaan aktif. */
export function leadSnapshotKey(raw: string | null, slug: string, officeHours: string, now: number): string | null {
  const lead = activeLead(raw, slug, now);
  if (!lead) return null;
  const snapshot: LeadSnapshot = { lead, outside: isOutsideOfficeHours(officeHours, now) };
  return JSON.stringify(snapshot);
}

export function parseLeadSnapshot(key: string | null): LeadSnapshot | null {
  if (!key) return null;
  try {
    return JSON.parse(key) as LeadSnapshot;
  } catch {
    return null;
  }
}
