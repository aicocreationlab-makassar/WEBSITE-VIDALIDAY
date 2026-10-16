"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { track } from "@/lib/analytics";
import type { BookingContextValue, BookingPrefill, BookingSettings, BookingSource, BookingUnit } from "./types";
import { useActiveLead } from "./use-active-lead";

// Form sewa (Dialog/Sheet, react-hook-form, zod) baru diunduh saat pertama dibuka atau saat ada
// niat membuka (hover/fokus/sentuh tombol sewa), supaya tidak membebani muatan awal halaman.
const BookingSheet = dynamic(() => import("./booking-sheet").then((mod) => mod.BookingSheet), { ssr: false });

function preloadBookingSheet() {
  void import("./booking-sheet");
}

const BookingContext = createContext<BookingContextValue | null>(null);

type Props = {
  unit: BookingUnit;
  settings: BookingSettings;
  /** URL situs kanonik (untuk tautan unit di pesan WhatsApp). */
  siteUrl: string;
  /** Tautan ke unit yang lebih besar saat jumlah tamu melebihi kapasitas. */
  largerUnitsHref: string;
  children: React.ReactNode;
};

/**
 * Menyediakan form sewa untuk halaman detail unit. Bar CTA mobile dan kartu sewa desktop
 * memanggil useBooking().open(prefill) untuk membuka form (bottom sheet / modal).
 */
export function BookingProvider({ unit, settings, siteUrl, largerUnitsHref, children }: Props) {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  const [prefill, setPrefill] = useState<BookingPrefill>({});
  // Tamu kembali dari WhatsApp: panel "Permintaan terkirim" ada di modul form, jadi ikut dimuat.
  const activeLead = useActiveLead(unit.slug, settings.officeHours);

  const openBooking = useCallback(
    (next: BookingPrefill = {}, source: BookingSource = "sticky") => {
      setPrefill(next);
      setRequested(true);
      setOpen(true);
      track("booking_open", { unit: unit.slug, source });
    },
    [unit.slug],
  );

  // Rute disembunyikan (Activity, navigasi ke halaman lain) atau dilepas: tutup form supaya
  // overlay dan kunci scroll tidak tertinggal, dan form tidak terbuka lagi saat kembali.
  useEffect(() => () => setOpen(false), []);

  const value = useMemo<BookingContextValue>(() => ({ open: openBooking, preload: preloadBookingSheet }), [openBooking]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      {requested || activeLead ? (
        <BookingSheet
          open={open}
          onOpenChange={setOpen}
          unit={unit}
          settings={settings}
          siteUrl={siteUrl}
          prefill={prefill}
          largerUnitsHref={largerUnitsHref}
        />
      ) : null}
    </BookingContext.Provider>
  );
}

export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) throw new Error("useBooking harus dipakai di dalam <BookingProvider>.");
  return context;
}
