"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { BadgePercent, ChevronRight, X } from "lucide-react";

const STORAGE_KEY = "vdl:announcement";
const CHANGE_EVENT = "vdl:announcement-change";

// Cadangan kalau sessionStorage diblokir (mode privat, cookie diblokir): tetap tertutup selama halaman hidup.
let dismissedInMemory: string | null = null;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Teks pengumuman yang terakhir ditutup di tab ini. */
function getDismissedText(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? dismissedInMemory;
  } catch {
    return dismissedInMemory;
  }
}

/** Server dan hidrasi pertama selalu menganggap pengumuman tampil, supaya HTML sama. */
function getServerDismissedText(): string | null {
  return null;
}

function dismissAnnouncement(text: string) {
  dismissedInMemory = text;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, text);
  } catch {
    // Penyimpanan tidak tersedia; nilai di memori sudah cukup untuk halaman ini.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Pengumuman tipis di atas header (setting `promo_banner_text`). Satu baris statis,
 * seluruh bar menuju unit diskon, bisa ditutup. Yang diingat adalah teks yang ditutup,
 * jadi pengumuman baru tampil lagi.
 */
export function AnnouncementBar({ text }: { text: string }) {
  const message = text.trim();
  const dismissed = useSyncExternalStore(subscribe, getDismissedText, getServerDismissedText);

  if (!message || dismissed === message) return null;

  return (
    <div className="relative z-41 border-b border-brand-200 bg-brand-50 text-brand-700">
      <div className="mx-auto flex h-9 max-w-[1200px] items-center pl-4 sm:pr-2 sm:pl-6 lg:pr-4 lg:pl-8">
        <Link
          href="/sewa?urut=diskon"
          className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-control text-caption font-semibold underline-offset-2 hover:underline focus-visible:outline-offset-0"
        >
          <BadgePercent className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{message}</span>
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => dismissAnnouncement(message)}
          aria-label="Tutup pengumuman"
          className="relative inline-flex h-9 w-11 shrink-0 items-center justify-center rounded-control text-brand-700 transition-colors duration-150 before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] hover:bg-brand-100 focus-visible:outline-offset-0"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
