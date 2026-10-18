"use client";

// Pemuatan data bot chat di browser: sekali per tab (layout publik bertahan antar navigasi), lewat
// GET /chat-data. Gagal → promise ditolak dan cache dikosongkan supaya "Coba lagi" bisa mengulang.

import type { ChatKnowledge } from "./types";

let pending: Promise<ChatKnowledge> | null = null;

function isKnowledge(value: unknown): value is ChatKnowledge {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.v === 1 && Array.isArray(v.units) && Array.isArray(v.locations) && typeof v.settings === "object";
}

export function loadKnowledge(): Promise<ChatKnowledge> {
  if (!pending) {
    pending = fetch("/chat-data", { credentials: "omit" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`chat-data ${response.status}`);
        const data: unknown = await response.json();
        if (!isKnowledge(data)) throw new Error("chat-data invalid");
        return data;
      })
      .catch((error: unknown) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}

/** Saat launcher disorot/difokus/disentuh: unduh modul panel dan data lebih awal. */
export function preloadChat(): void {
  void import("@/components/public/chat/chat-panel");
  void loadKnowledge().catch(() => undefined);
}
