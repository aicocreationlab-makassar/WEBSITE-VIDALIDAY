"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { LAST_LEAD_KEY } from "@/lib/wa-redirect";
import { leadSnapshotKey, parseLeadSnapshot, type LeadSnapshot } from "./booking-model";

// Permintaan yang baru dikirim (sessionStorage "vdl:lastLead"), dibaca ulang setiap kali
// halaman terlihat lagi: kembali dari WhatsApp (pageshow/bfcache, visibilitychange) atau
// setelah form mengirim/menutup panel sukses.

const LEAD_EVENT = "vdl:lead-change";

function subscribe(onChange: () => void) {
  window.addEventListener("pageshow", onChange);
  window.addEventListener("focus", onChange);
  window.addEventListener(LEAD_EVENT, onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("pageshow", onChange);
    window.removeEventListener("focus", onChange);
    window.removeEventListener(LEAD_EVENT, onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

function readRaw(): string | null {
  try {
    return window.sessionStorage.getItem(LAST_LEAD_KEY);
  } catch {
    return null;
  }
}

/** Beri tahu semua pembaca bahwa isi "vdl:lastLead" berubah. */
export function notifyLeadChange(): void {
  window.dispatchEvent(new Event(LEAD_EVENT));
}

/** Permintaan aktif untuk unit ini (< 30 menit). Server dan hidrasi pertama: null. */
export function useActiveLead(slug: string, officeHours: string): LeadSnapshot | null {
  const getSnapshot = useCallback(
    () => leadSnapshotKey(readRaw(), slug, officeHours, Date.now()),
    [slug, officeHours],
  );
  const key = useSyncExternalStore(subscribe, getSnapshot, () => null);
  return useMemo(() => parseLeadSnapshot(key), [key]);
}
