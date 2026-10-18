"use server";

import { todayInMakassar } from "@/lib/format";
import { createPublicClient } from "@/lib/supabase/public";
import { BOOKING_MESSAGES, makeBookingSchema, type BookingField, type BookingInput } from "@/lib/validation/booking";

/**
 * Simpan permintaan sewa lewat RPC submit_lead (PRD 6.5).
 * TIDAK PERNAH melempar error ke UI. Kegagalan penyimpanan (jaringan, timeout, rate limit,
 * error tak dikenal) dikembalikan sebagai `blocking: false` supaya klien tetap membuka WhatsApp.
 * Hanya kesalahan isian yang perlu diperbaiki tamu yang `blocking: true`.
 */

export type LeadErrorCode =
  | "INVALID_PHONE"
  | "INVALID_NAME"
  | "INVALID_DATES"
  | "INVALID_GUESTS"
  | "UNIT_NOT_FOUND"
  | "TEXT_TOO_LONG"
  | "TOO_MANY_REQUESTS"
  | "VALIDATION"
  | "HONEYPOT"
  | "TIMEOUT"
  | "UNAVAILABLE";

export type SubmitLeadResult =
  | { ok: true; code: string; estimatedTotal: number | null; nights: number | null }
  | {
      ok: false;
      reason: LeadErrorCode;
      /** Pesan untuk tamu; null = tidak ditampilkan (langsung lanjut ke WhatsApp). */
      message: string | null;
      fieldErrors?: Partial<Record<BookingField, string>>;
      /** true = tamu harus memperbaiki isian dulu; false = tetap lanjut ke WhatsApp tanpa kode. */
      blocking: boolean;
    };

const RPC_TIMEOUT_MS = 4_000;

const RPC_ERRORS: Record<string, { message: string | null; field?: BookingField; blocking: boolean }> = {
  INVALID_PHONE: { message: BOOKING_MESSAGES.phone, field: "whatsapp", blocking: true },
  INVALID_NAME: { message: BOOKING_MESSAGES.name, field: "fullName", blocking: true },
  INVALID_DATES: {
    message: "Tanggal check-out harus setelah check-in, dan check-in tidak boleh lewat.",
    field: "checkIn",
    blocking: true,
  },
  INVALID_GUESTS: { message: BOOKING_MESSAGES.guests, field: "guests", blocking: true },
  UNIT_NOT_FOUND: { message: "Unit ini sudah tidak tersedia. Coba unit serupa di bawah.", blocking: true },
  TEXT_TOO_LONG: { message: BOOKING_MESSAGES.notes, field: "notes", blocking: true },
  TOO_MANY_REQUESTS: { message: null, blocking: false },
};

function fail(
  reason: LeadErrorCode,
  message: string | null,
  blocking: boolean,
  fieldErrors?: Partial<Record<BookingField, string>>,
): SubmitLeadResult {
  return { ok: false, reason, message, blocking, ...(fieldErrors ? { fieldErrors } : {}) };
}

export async function submitLead(input: BookingInput): Promise<SubmitLeadResult> {
  try {
    const parsed = makeBookingSchema(todayInMakassar()).safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<BookingField, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !(key in fieldErrors)) fieldErrors[key as BookingField] = issue.message;
      }
      return fail("VALIDATION", "Periksa lagi isian yang ditandai.", true, fieldErrors);
    }

    const data = parsed.data;
    if (data.website.trim() !== "") return fail("HONEYPOT", null, false);

    const supabase = createPublicClient();
    const { data: result, error } = await supabase
      .rpc("submit_lead", {
        p_unit_id: data.unitId,
        p_full_name: data.fullName,
        p_whatsapp: data.whatsapp,
        p_check_in: data.checkIn,
        p_check_out: data.checkOut,
        p_guests: data.guests,
        p_purpose: data.purpose ?? null,
        p_notes: data.notes || null,
        p_source_path: data.sourcePath ?? null,
        p_origin_city: data.originCity,
      })
      .abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS));

    if (error) {
      const known = Object.keys(RPC_ERRORS).find((code) => error.message?.includes(code));
      if (known) {
        const mapped = RPC_ERRORS[known];
        return fail(
          known as LeadErrorCode,
          mapped.message,
          mapped.blocking,
          mapped.field && mapped.message ? { [mapped.field]: mapped.message } : undefined,
        );
      }
      const aborted = /abort|timeout/i.test(`${error.message} ${(error as { name?: string }).name ?? ""}`);
      return fail(aborted ? "TIMEOUT" : "UNAVAILABLE", null, false);
    }

    const payload = (result ?? {}) as { code?: unknown; estimated_total?: unknown; nights?: unknown };
    if (typeof payload.code !== "string") return fail("UNAVAILABLE", null, false);
    return {
      ok: true,
      code: payload.code,
      estimatedTotal: typeof payload.estimated_total === "number" ? payload.estimated_total : Number(payload.estimated_total) || null,
      nights: typeof payload.nights === "number" ? payload.nights : null,
    };
  } catch (cause) {
    const aborted = cause instanceof Error && /abort|timeout/i.test(`${cause.name} ${cause.message}`);
    return fail(aborted ? "TIMEOUT" : "UNAVAILABLE", null, false);
  }
}
