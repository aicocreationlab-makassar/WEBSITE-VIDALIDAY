"use client";

// Pengalihan ke WhatsApp yang tidak boleh gagal (PRD 6.5 langkah 4-6):
// - Mobile: tab yang sama.
// - Desktop: buka tab kosong SECARA SINKRON di dalam klik (supaya tidak diblok popup blocker),
//   isi URL-nya setelah Server Action selesai. Kalau tab tidak terbuka, pakai tab yang sama.

export type PendingTab = { window: Window | null; mobile: boolean };

/** Perangkat sentuh/HP: buka WA di tab yang sama (aplikasi WhatsApp mengambil alih). */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const narrow = window.matchMedia?.("(max-width: 767px)").matches ?? false;
  const ua = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return ua || (coarse && narrow);
}

/** Panggil langsung di handler klik/submit, sebelum await apa pun. */
export function prepareWhatsappTab(): PendingTab {
  if (isMobileDevice()) return { window: null, mobile: true };
  // Tanpa "noopener" supaya kita mendapat referensi window; opener diputus manual.
  const tab = window.open("", "_blank");
  if (tab) {
    try {
      tab.opener = null;
      tab.document.title = "Membuka WhatsApp...";
    } catch {
      // Akses dokumen bisa ditolak; tidak masalah.
    }
  }
  return { window: tab, mobile: false };
}

/** Arahkan ke URL WhatsApp. Tab desktop gagal dibuka/tertutup → tab yang sama. */
export function goToWhatsapp(pending: PendingTab, url: string): void {
  if (!pending.mobile && pending.window && !pending.window.closed) {
    try {
      pending.window.location.href = url;
      return;
    } catch {
      // jatuh ke tab yang sama
    }
  }
  window.location.href = url;
}

/** Tutup tab kosong kalau pengiriman dibatalkan (mis. ada isian yang harus diperbaiki). */
export function cancelWhatsappTab(pending: PendingTab): void {
  try {
    if (pending.window && !pending.window.closed) pending.window.close();
  } catch {
    // abaikan
  }
}

// ---------------------------------------------------------------------------
// Pesan "Permintaan terkirim" setelah kembali dari WhatsApp (PRD 6.5 langkah 6)
// ---------------------------------------------------------------------------

export const LAST_LEAD_KEY = "vdl:lastLead";

export type LastLead = { unit: string; code: string | null; url: string; at: number };

export function rememberLastLead(lead: LastLead): void {
  try {
    sessionStorage.setItem(LAST_LEAD_KEY, JSON.stringify(lead));
  } catch {
    // opsional
  }
}

export function readLastLead(): LastLead | null {
  try {
    const raw = sessionStorage.getItem(LAST_LEAD_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as LastLead;
    return typeof value?.unit === "string" && typeof value?.url === "string" ? value : null;
  } catch {
    return null;
  }
}

export function clearLastLead(): void {
  try {
    sessionStorage.removeItem(LAST_LEAD_KEY);
  } catch {
    // opsional
  }
}

// ---------------------------------------------------------------------------
// "Ingat data saya": nama dan nomor di localStorage perangkat ini (PRD 6.5)
// ---------------------------------------------------------------------------

export const GUEST_KEY = "vdl:guest";

/** Kota asal opsional supaya data yang tersimpan sebelum field itu ada tetap terbaca. */
export type SavedGuest = { fullName: string; whatsapp: string; originCity?: string };

export function readSavedGuest(): SavedGuest | null {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as SavedGuest;
    return typeof value?.fullName === "string" && typeof value?.whatsapp === "string" ? value : null;
  } catch {
    return null;
  }
}

export function saveGuest(guest: SavedGuest | null): void {
  try {
    if (guest) localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    // opsional
  }
}
