// Bangun pesan WhatsApp form sewa dari template setting (PRD 6.5 langkah 3). Fungsi murni.

import { formatDate, formatRupiah, formatWhatsappDisplay, normalizeWhatsapp } from "@/lib/format";
import { estimateTotal } from "@/lib/pricing";
import { formatUnitSpot, unitHref } from "@/lib/unit-display";
import { fillTemplate, type TemplateValues } from "@/lib/whatsapp";
import type { CatalogUnit } from "@/types/domain";

export type BookingMessageUnit = Pick<
  CatalogUnit,
  | "name"
  | "slug"
  | "locationShortName"
  | "tower"
  | "floorNumber"
  | "effectivePrice"
  | "weeklyPrice"
  | "monthlyPrice"
  | "isAvailable"
>;

export type BookingMessageInput = {
  fullName: string;
  /** Kota asal tamu; kosong (data lama) → baris "Kota asal" dihapus dari pesan. */
  originCity?: string | null;
  whatsapp: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  purpose?: string | null;
  notes?: string | null;
  /** Kode dari submit_lead; kosong kalau penyimpanan gagal (baris "Kode permintaan" dihapus). */
  code?: string | null;
  /** Estimasi dari server kalau ada; kalau tidak, dihitung dengan rumus yang sama. */
  estimatedTotal?: number | null;
};

export const FULL_UNIT_NOTE =
  "Unit ini tertulis penuh di situs. Mohon info ketersediaan, atau rekomendasi unit serupa.";

export function bookingTemplateValues(
  unit: BookingMessageUnit,
  input: BookingMessageInput,
  siteUrl: string,
): TemplateValues {
  const total =
    input.estimatedTotal ??
    estimateTotal(
      { effective_price: unit.effectivePrice, weekly_price: unit.weeklyPrice, monthly_price: unit.monthlyPrice },
      input.nights,
    ).total;
  return {
    unit: unit.name,
    apartemen: unit.locationShortName,
    lokasi_unit: formatUnitSpot(unit),
    harga: formatRupiah(unit.effectivePrice),
    nama: input.fullName.trim(),
    kota: input.originCity?.trim() || null,
    whatsapp: formatWhatsappDisplay(normalizeWhatsapp(input.whatsapp)),
    checkin: formatDate(input.checkIn),
    checkout: formatDate(input.checkOut),
    malam: input.nights,
    tamu: input.guests,
    keperluan: input.purpose ?? null,
    catatan: input.notes?.trim() || null,
    estimasi: total > 0 ? formatRupiah(total) : null,
    kode: input.code ?? null,
    link: `${siteUrl.replace(/\/+$/, "")}${unitHref(unit.slug)}`,
  };
}

/** Pesan lengkap siap dikirim. Unit penuh mendapat catatan tambahan di akhir. */
export function buildBookingMessage(
  template: string,
  unit: BookingMessageUnit,
  input: BookingMessageInput,
  siteUrl: string,
): string {
  const message = fillTemplate(template, bookingTemplateValues(unit, input, siteUrl));
  return unit.isAvailable ? message : `${message}\n\n${FULL_UNIT_NOTE}`;
}
