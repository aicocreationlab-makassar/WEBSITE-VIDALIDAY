"use client";

// Event analitik (PRD 6.10). Tipe sengaja hanya mengizinkan data non-pribadi:
// tidak ada nama, nomor telepon, atau catatan tamu.

import { track as vercelTrack } from "@vercel/analytics";

type Primitive = string | number | boolean | null;

export type AnalyticsEvents = {
  search_submit: { lokasi: string | null; tipe: string | null; budget: string | null };
  filter_apply: { filters: number; lokasi: string | null; urut: string };
  unit_view: { unit: string; apartemen: string };
  gallery_open: { unit: string; index: number };
  booking_open: { unit: string; source: "sticky" | "card" | "hero" };
  booking_submit: { unit: string; code: string | null; nights: number; guests: number; saved: boolean };
  whatsapp_redirect: { unit: string | null; saved: boolean; context: "booking" | "general" };
  recommendation_click: { from: string; to: string; position: number };
  // Bot chat (PRD 6.11): hanya jenis pertanyaan, tidak pernah teksnya.
  chat_open: { page: string };
  chat_question: { intent: string; matched: boolean; lokasi: string | null };
  chat_unit_click: { unit: string; position: number };
  chat_handoff: { intent: string | null; reason: "fallback" | "button" };
};

const FORBIDDEN = /nama|name|phone|telepon|whatsapp_number|wa_number|catatan|notes|email/i;

/** Kirim event; kunci yang tampak seperti data pribadi dibuang sebagai lapis pengaman kedua. */
export function track<E extends keyof AnalyticsEvents>(event: E, props: AnalyticsEvents[E]): void {
  const safe: Record<string, Primitive> = {};
  for (const [key, value] of Object.entries(props as Record<string, Primitive>)) {
    if (!FORBIDDEN.test(key)) safe[key] = value;
  }
  try {
    vercelTrack(event, safe);
  } catch {
    // Analitik tidak boleh mengganggu alur tamu.
  }
}
