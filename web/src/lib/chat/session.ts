// Riwayat chat di perangkat tamu (sessionStorage "vdl:chat", maks. 30 pesan, 24 jam). Tidak pernah
// dikirim ke server maupun analitik (PRD 6.11). Fungsi parse/serialize murni (ada test); akses
// penyimpanan dibungkus try/catch (mode privat, kuota penuh).

import type { ChatState } from "./engine";
import type { BotReply } from "./respond";

export const CHAT_KEY = "vdl:chat";
export const CHAT_MAX = 30;
export const CHAT_TTL_MS = 24 * 60 * 60 * 1000;

export type StoredMessage =
  | { id: string; role: "user"; text: string; at: number }
  | { id: string; role: "bot"; reply: BotReply; at: number };

export type StoredSession = { v: 1; at: number; messages: StoredMessage[]; state: ChatState };

function isMessage(value: unknown): value is StoredMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.at !== "number") return false;
  if (v.role === "user") return typeof v.text === "string";
  if (v.role === "bot") {
    const reply = v.reply as Record<string, unknown> | undefined;
    return Boolean(reply && Array.isArray(reply.blocks) && Array.isArray(reply.chips));
  }
  return false;
}

function isState(value: unknown): value is ChatState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.slots === "object" && v.slots !== null && typeof v.turns === "number";
}

/** Isi penyimpanan → sesi; data rusak atau kedaluwarsa → null. Pesan dipotong ke 30 terakhir. */
export function parseSession(raw: string | null, now: number): StoredSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredSession> | null;
    if (!value || value.v !== 1 || typeof value.at !== "number" || !Array.isArray(value.messages) || !isState(value.state)) {
      return null;
    }
    if (now - value.at > CHAT_TTL_MS || now < value.at) return null;
    const messages = value.messages.filter(isMessage).slice(-CHAT_MAX);
    return { v: 1, at: value.at, messages, state: value.state };
  } catch {
    return null;
  }
}

export function serializeSession(messages: StoredMessage[], state: ChatState, now: number): string {
  const session: StoredSession = { v: 1, at: now, messages: messages.slice(-CHAT_MAX), state };
  return JSON.stringify(session);
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readSession(now: number = Date.now()): StoredSession | null {
  const store = storage();
  if (!store) return null;
  try {
    return parseSession(store.getItem(CHAT_KEY), now);
  } catch {
    return null;
  }
}

export function writeSession(messages: StoredMessage[], state: ChatState, now: number = Date.now()): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(CHAT_KEY, serializeSession(messages, state, now));
  } catch {
    // Penyimpanan penuh/diblokir: riwayat bersifat opsional.
  }
}

export function clearSession(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(CHAT_KEY);
  } catch {
    // opsional
  }
}
