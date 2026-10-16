// Kontrak form sewa (dipakai halaman detail unit, kartu sewa desktop, dan bar CTA mobile).

import type { CatalogUnit } from "@/types/domain";

export type BookingUnit = Pick<
  CatalogUnit,
  | "id"
  | "slug"
  | "name"
  | "locationSlug"
  | "locationShortName"
  | "category"
  | "tower"
  | "floorNumber"
  | "effectivePrice"
  | "normalPrice"
  | "promoPrice"
  | "isPromoActive"
  | "promoBadge"
  | "weeklyPrice"
  | "monthlyPrice"
  | "maxGuests"
  | "isAvailable"
  | "photos"
>;

export type BookingSettings = {
  whatsappNumber: string;
  bookingWhatsappTemplate: string;
  officeHours: string;
};

/** Isian awal dari kartu sewa desktop (tanggal & tamu). */
export type BookingPrefill = {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
};

export type BookingSource = "sticky" | "card" | "hero";

export type BookingContextValue = {
  /** Buka form sewa (bottom sheet di mobile, modal di desktop). */
  open: (prefill?: BookingPrefill, source?: BookingSource) => void;
  /** Unduh modul form lebih awal (hover/fokus/sentuh tombol pembuka), supaya terbuka tanpa jeda. */
  preload: () => void;
};
