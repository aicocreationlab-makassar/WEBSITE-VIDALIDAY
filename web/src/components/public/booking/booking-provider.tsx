"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import { BookingSheet } from "./booking-sheet";
import type { BookingContextValue, BookingPrefill, BookingSettings, BookingSource, BookingUnit } from "./types";

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
  const [prefill, setPrefill] = useState<BookingPrefill>({});

  const openBooking = useCallback(
    (next: BookingPrefill = {}, source: BookingSource = "sticky") => {
      setPrefill(next);
      setOpen(true);
      track("booking_open", { unit: unit.slug, source });
    },
    [unit.slug],
  );

  // Rute disembunyikan (Activity, navigasi ke halaman lain) atau dilepas: tutup form supaya
  // overlay dan kunci scroll tidak tertinggal, dan form tidak terbuka lagi saat kembali.
  useEffect(() => () => setOpen(false), []);

  const value = useMemo<BookingContextValue>(() => ({ open: openBooking }), [openBooking]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      <BookingSheet
        open={open}
        onOpenChange={setOpen}
        unit={unit}
        settings={settings}
        siteUrl={siteUrl}
        prefill={prefill}
        largerUnitsHref={largerUnitsHref}
      />
    </BookingContext.Provider>
  );
}

export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) throw new Error("useBooking harus dipakai di dalam <BookingProvider>.");
  return context;
}
