// Skema form sewa (PRD 6.5), dipakai di klien (react-hook-form) dan di server (submitLead).

import { z } from "zod";
import "./locale";
import { addDays, diffDays, isDateString, isValidWhatsapp, normalizeWhatsapp } from "@/lib/format";
import { BOOKING_MESSAGES, MAX_CITY, MAX_GUESTS, MAX_NOTES, PURPOSES } from "./booking-constants";

export {
  BOOKING_MESSAGES,
  MAX_CITY,
  MAX_GUESTS,
  MAX_NOTES,
  PURPOSES,
  type BookingField,
  type Purpose,
} from "./booking-constants";

/** Skema dengan "hari ini" (WITA) dari luar supaya bisa diuji dan sama di klien/server. */
export function makeBookingSchema(today: string) {
  const lastCheckIn = addDays(today, 365);
  return z
    .object({
      unitId: z.number().int().positive(),
      fullName: z
        .string()
        .trim()
        .min(2, BOOKING_MESSAGES.name)
        .max(100, BOOKING_MESSAGES.nameLong),
      /** Kota asal tamu (wajib, teks bebas) supaya admin tahu dari mana tamunya. */
      originCity: z
        .string()
        .trim()
        .min(2, BOOKING_MESSAGES.city)
        .max(MAX_CITY, BOOKING_MESSAGES.cityLong),
      whatsapp: z
        .string()
        .trim()
        // Kosong: minta diisi; terisi tapi salah format: "belum benar".
        .min(1, BOOKING_MESSAGES.phoneEmpty)
        .transform((value) => normalizeWhatsapp(value))
        .refine((value) => isValidWhatsapp(value), BOOKING_MESSAGES.phone),
      checkIn: z
        .string()
        .refine((value) => isDateString(value), BOOKING_MESSAGES.checkInInvalid)
        .refine((value) => !isDateString(value) || value >= today, BOOKING_MESSAGES.checkInPast)
        .refine((value) => !isDateString(value) || value <= lastCheckIn, BOOKING_MESSAGES.checkInFar),
      checkOut: z.string().refine((value) => isDateString(value), BOOKING_MESSAGES.checkOutInvalid),
      guests: z
        .number({ error: BOOKING_MESSAGES.guests })
        .int(BOOKING_MESSAGES.guests)
        .min(1, BOOKING_MESSAGES.guests)
        .max(MAX_GUESTS, BOOKING_MESSAGES.guests),
      purpose: z.enum(PURPOSES).nullable().optional(),
      notes: z.string().trim().max(MAX_NOTES, BOOKING_MESSAGES.notes).optional().default(""),
      /** Honeypot: harus kosong. Diisi bot → penyimpanan dilewati. */
      website: z.string().optional().default(""),
      sourcePath: z.string().max(300).optional(),
    })
    .superRefine((value, ctx) => {
      if (!isDateString(value.checkIn) || !isDateString(value.checkOut)) return;
      const nights = diffDays(value.checkIn, value.checkOut);
      if (nights <= 0) {
        ctx.addIssue({ code: "custom", path: ["checkOut"], message: BOOKING_MESSAGES.checkOutOrder });
      } else if (nights > 365) {
        ctx.addIssue({ code: "custom", path: ["checkOut"], message: BOOKING_MESSAGES.stayTooLong });
      }
    });
}

export type BookingSchema = ReturnType<typeof makeBookingSchema>;
export type BookingInput = z.input<BookingSchema>;
export type BookingData = z.output<BookingSchema>;
