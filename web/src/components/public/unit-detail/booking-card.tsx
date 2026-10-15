"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { Clock, Minus, Plus, TriangleAlert } from "lucide-react";
import { useBooking } from "@/components/public/booking/booking-provider";
import { PriceTag } from "@/components/public/unit/price";
import { UnitBadges } from "@/components/public/unit/unit-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDays, formatNights, formatRupiah, isDateString, todayInMakassar } from "@/lib/format";
import { clampGuests, MAX_NIGHTS, rateNote, shiftCheckOut, stayEstimate } from "@/lib/unit-detail";
import { BOOKING_MESSAGES, MAX_GUESTS } from "@/lib/validation/booking";
import type { CatalogUnit } from "@/types/domain";

type CardUnit = Pick<
  CatalogUnit,
  | "name"
  | "normalPrice"
  | "promoPrice"
  | "isPromoActive"
  | "effectivePrice"
  | "promoBadge"
  | "isFeatured"
  | "isAvailable"
  | "weeklyPrice"
  | "monthlyPrice"
  | "maxGuests"
>;

type Props = {
  unit: CardUnit;
  /** /sewa untuk unit yang lebih besar (tamu melebihi kapasitas). */
  largerUnitsHref: string;
  /** Jam layanan admin, sudah diformat. */
  officeHours: string;
};

const noopSubscribe = () => () => {};

/** "Hari ini" (WITA) hanya di browser: server/prerender memakai "" (tanpa jam sistem saat render). */
function useToday(): string {
  return useSyncExternalStore(noopSubscribe, () => todayInMakassar(), () => "");
}

function plusDays(date: string, days: number): string | undefined {
  return isDateString(date) ? addDays(date, days) : undefined;
}

/**
 * Kartu sewa desktop (PRD 6.4, UX 2.4): harga, check-in/check-out, jumlah tamu, estimasi langsung,
 * "Sewa sekarang" membuka form sewa dengan data terisi. Menempel di bawah header (top 88px).
 */
export function BookingCard({ unit, largerUnitsHref, officeHours }: Props) {
  const { open } = useBooking();
  const ids = { checkIn: useId(), checkOut: useId(), guests: useId(), estimate: useId() };
  const today = useToday();
  const [dates, setDates] = useState<{ checkIn: string; checkOut: string } | null>(null);
  const [guests, setGuests] = useState(() => clampGuests(Math.min(2, unit.maxGuests)));

  // Bawaan: hari ini dan besok, supaya estimasi langsung terlihat.
  const checkIn = dates?.checkIn ?? today;
  const checkOut = dates?.checkOut ?? (plusDays(today, 1) ?? "");
  const estimate = stayEstimate(unit, checkIn, checkOut);
  const pastCheckIn = Boolean(today && isDateString(checkIn) && checkIn < today);
  const overCapacity = guests > unit.maxGuests;
  const ctaLabel = unit.isAvailable ? "Sewa sekarang" : "Tanya ketersediaan";

  const onCheckIn = (value: string) => setDates({ checkIn: value, checkOut: shiftCheckOut(checkIn, checkOut, value) });
  const onCheckOut = (value: string) => setDates({ checkIn, checkOut: value });

  const submit = () => {
    open(
      {
        checkIn: isDateString(checkIn) ? checkIn : undefined,
        checkOut: isDateString(checkOut) ? checkOut : undefined,
        guests,
      },
      "card",
    );
  };

  let estimateText: React.ReactNode;
  if (pastCheckIn) {
    estimateText = BOOKING_MESSAGES.checkInPast;
  } else if (estimate.status === "ok") {
    const note = rateNote(estimate.estimate);
    estimateText = (
      <>
        Estimasi <strong className="font-extrabold text-ink tabular-nums">{formatRupiah(estimate.estimate.total)}</strong>{" "}
        untuk {formatNights(estimate.estimate.nights)}
        {note ? <span className="text-muted"> ({note})</span> : null}
      </>
    );
  } else if (estimate.status === "invalid") {
    estimateText = BOOKING_MESSAGES.checkOutOrder;
  } else {
    estimateText = "Pilih tanggal untuk melihat estimasi";
  }

  return (
    <aside
      data-testid="booking-card"
      aria-label="Sewa unit ini"
      className="sticky top-[88px] rounded-card bg-white p-5 shadow-card ring-1 ring-line/80 lg:p-6"
    >
      <PriceTag unit={unit} size="detail" />
      <UnitBadges unit={unit} className="mt-2" />

      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={ids.checkIn}>Check-in</Label>
          <Input
            id={ids.checkIn}
            type="date"
            value={checkIn}
            min={today || undefined}
            max={plusDays(today, 365)}
            onChange={(event) => onCheckIn(event.target.value)}
            aria-describedby={ids.estimate}
            className="appearance-none px-3 text-left"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={ids.checkOut}>Check-out</Label>
          <Input
            id={ids.checkOut}
            type="date"
            value={checkOut}
            min={plusDays(checkIn, 1) ?? (today || undefined)}
            max={plusDays(checkIn, MAX_NIGHTS)}
            onChange={(event) => onCheckOut(event.target.value)}
            aria-describedby={ids.estimate}
            className="appearance-none px-3 text-left"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span id={ids.guests} className="text-sm leading-5 font-semibold text-ink-2">
          Jumlah tamu
        </span>
        <div role="group" aria-labelledby={ids.guests} className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="rounded-full"
            aria-label="Kurangi tamu"
            disabled={guests <= 1}
            onClick={() => setGuests((value) => clampGuests(value - 1))}
          >
            <Minus aria-hidden="true" />
          </Button>
          <span aria-live="polite" aria-atomic="true" className="min-w-10 text-center text-lg font-bold text-ink tabular-nums">
            {guests}
            <span className="sr-only"> tamu</span>
          </span>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="rounded-full"
            aria-label="Tambah tamu"
            disabled={guests >= MAX_GUESTS}
            onClick={() => setGuests((value) => clampGuests(value + 1))}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </div>

      {overCapacity ? (
        <p className="mt-3 flex items-start gap-2 rounded-control border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-ink-2">
          <TriangleAlert className="mt-px size-4 shrink-0 text-[#b45309]" aria-hidden="true" />
          <span>
            Unit ini untuk maks. {unit.maxGuests} tamu.{" "}
            <Link href={largerUnitsHref} className="font-semibold text-brand-700 underline underline-offset-2">
              Lihat unit yang lebih besar
            </Link>
          </span>
        </p>
      ) : null}

      <p
        id={ids.estimate}
        aria-live="polite"
        className="mt-4 rounded-control bg-surface px-3.5 py-3 text-[15px] leading-6 text-ink-2"
      >
        {estimateText}
      </p>

      <Button type="button" size="lg" className="mt-4 w-full" onClick={submit}>
        {ctaLabel}
      </Button>

      <ul className="mt-4 flex flex-col gap-1.5 text-caption text-muted">
        <li>Harga final dikonfirmasi admin. Belum ada pembayaran di sini.</li>
        {officeHours ? (
          <li className="flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
            Admin membalas via WhatsApp setiap hari, {officeHours}
          </li>
        ) : null}
      </ul>
    </aside>
  );
}
