// Riwayat unit yang dilihat di perangkat ini (localStorage "vdl:recent", maks. 12).
// Tidak pernah dikirim ke server (PRD 6.6).

import type { RecentEntry } from "@/lib/recommend";

export const RECENT_KEY = "vdl:recent";
export const RECENT_MAX = 12;
const CHANGE_EVENT = "vdl:recent-change";

function isEntry(value: unknown): value is RecentEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "number" &&
    typeof v.slug === "string" &&
    typeof v.l === "string" &&
    typeof v.c === "string" &&
    typeof v.p === "number" &&
    typeof v.v === "number" &&
    typeof v.name === "string" &&
    (typeof v.photo === "string" || v.photo === null) &&
    typeof v.place === "string"
  );
}

/** Parse isi localStorage dengan aman (data rusak → kosong). */
export function parseRecent(raw: string | null): RecentEntry[] {
  if (!raw) return [];
  try {
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(isEntry).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

/** Tambah entri di depan, buang duplikat, batasi 12 (fungsi murni). */
export function addRecent(list: RecentEntry[], entry: RecentEntry): RecentEntry[] {
  return [entry, ...list.filter((item) => item.id !== entry.id)].slice(0, RECENT_MAX);
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

let cachedRaw: string | null | undefined;
let cachedList: RecentEntry[] = [];

/** Snapshot stabil untuk useSyncExternalStore. */
export function getRecentSnapshot(): RecentEntry[] {
  const raw = storage()?.getItem(RECENT_KEY) ?? null;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parseRecent(raw);
  }
  return cachedList;
}

const EMPTY: RecentEntry[] = [];
export function getRecentServerSnapshot(): RecentEntry[] {
  return EMPTY;
}

export function subscribeRecent(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === RECENT_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function write(list: RecentEntry[]) {
  const store = storage();
  if (!store) return;
  try {
    if (list.length) store.setItem(RECENT_KEY, JSON.stringify(list));
    else store.removeItem(RECENT_KEY);
  } catch {
    // Penyimpanan penuh/diblokir: riwayat bersifat opsional.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function rememberUnit(entry: Omit<RecentEntry, "v">, viewedAt: number = Date.now()) {
  write(addRecent(getRecentSnapshot(), { ...entry, v: viewedAt }));
}

export function clearRecent() {
  write([]);
}
