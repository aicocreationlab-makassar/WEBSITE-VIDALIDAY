"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useIsDesktop } from "@/hooks/use-media-query";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { clearLastLead } from "@/lib/wa-redirect";
import type { LeadSnapshot } from "./booking-model";
import { BookingForm } from "./booking-form";
import { BookingSuccess } from "./booking-success";
import type { BookingPrefill, BookingSettings, BookingUnit } from "./types";
import { notifyLeadChange, useActiveLead } from "./use-active-lead";

export type BookingSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: BookingUnit;
  settings: BookingSettings;
  siteUrl: string;
  prefill: BookingPrefill;
  largerUnitsHref: string;
};

/** Fokus awal ke isian kosong pertama (bertanda `data-autofocus`); tanpa tanda, perilaku bawaan Radix. */
function focusMarked(event: Event) {
  const root = event.currentTarget ?? event.target;
  if (!(root instanceof HTMLElement)) return;
  const target = root.querySelector<HTMLElement>('[data-autofocus="true"]');
  if (!target) return;
  event.preventDefault();
  target.focus({ preventScroll: true });
}

/**
 * Form sewa: bottom sheet tinggi penuh di mobile, modal di desktop (PRD 6.5, DESIGN 4.9).
 * Setelah tamu diarahkan ke WhatsApp dan kembali, tampil "Permintaan terkirim ke WhatsApp"
 * di dalam sheet/modal, atau sebagai panel menempel kalau sheet sudah tertutup.
 */
export function BookingSheet({
  open,
  onOpenChange,
  unit,
  settings,
  siteUrl,
  prefill,
  largerUnitsHref,
}: BookingSheetProps) {
  const isDesktop = useIsDesktop();
  const snapshot = useActiveLead(unit.slug, settings.officeHours);

  function finish() {
    clearLastLead();
    notifyLeadChange();
    onOpenChange(false);
  }

  const flow = (
    <BookingFlow
      unit={unit}
      settings={settings}
      siteUrl={siteUrl}
      prefill={prefill}
      largerUnitsHref={largerUnitsHref}
      isDesktop={isDesktop}
      snapshot={snapshot}
      onDone={finish}
      onNavigate={() => onOpenChange(false)}
    />
  );

  return (
    <>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            closeLabel="Tutup"
            onOpenAutoFocus={focusMarked}
            className="flex max-h-[min(90dvh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          >
            {flow}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            closeLabel="Tutup"
            onOpenAutoFocus={focusMarked}
            className="h-[100dvh] data-[side=bottom]:max-h-[100dvh]"
          >
            {flow}
          </SheetContent>
        </Sheet>
      )}

      {!open && snapshot ? (
        <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] md:inset-x-auto md:right-6 md:bottom-6 md:w-[400px] md:p-0">
          <div className="rounded-sheet bg-white p-4 shadow-raised ring-1 ring-line">
            <BookingSuccess
              snapshot={snapshot}
              officeHours={settings.officeHours}
              newTab={isDesktop}
              onDone={finish}
              variant="panel"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

type FlowProps = Omit<BookingSheetProps, "open" | "onOpenChange"> & {
  isDesktop: boolean;
  snapshot: LeadSnapshot | null;
  onDone: () => void;
  onNavigate: () => void;
};

/** Isi sheet/modal. Dirender hanya saat terbuka, jadi form selalu mulai dari keadaan segar. */
function BookingFlow({ unit, settings, siteUrl, prefill, largerUnitsHref, isDesktop, snapshot, onDone, onNavigate }: FlowProps) {
  // Sukses dari form ini; snapshot dari sessionStorage didahulukan (bisa ditutup lewat "Selesai").
  const [sent, setSent] = useState<LeadSnapshot | null>(null);
  const success = sent ? (snapshot ?? sent) : null;

  return (
    <>
      <BookingHeader unit={unit} isDesktop={isDesktop} />
      {success ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <BookingSuccess
            snapshot={success}
            officeHours={settings.officeHours}
            newTab={isDesktop}
            onDone={onDone}
            variant="sheet"
            autoFocus
          />
        </div>
      ) : (
        <BookingForm
          unit={unit}
          settings={settings}
          siteUrl={siteUrl}
          prefill={prefill}
          largerUnitsHref={largerUnitsHref}
          onSent={setSent}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}

/** Judul + ringkasan unit: thumbnail 56px, nama 15/700, "Vida View · Rp280.000/malam". */
function BookingHeader({ unit, isDesktop }: { unit: BookingUnit; isDesktop: boolean }) {
  const Title = isDesktop ? DialogTitle : SheetTitle;
  const Description = isDesktop ? DialogDescription : SheetDescription;
  const photo = unit.photos[0];

  return (
    <div
      className={cn(
        "shrink-0 border-b border-line",
        isDesktop ? "px-6 pt-6 pr-16 pb-4" : "px-4 pt-2 pr-14 pb-3",
      )}
    >
      <Title>Atur rencana menginap</Title>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-control bg-surface-2">
          {photo ? (
            <Image src={photo} alt="" fill sizes="56px" className="object-cover object-[50%_55%]" />
          ) : (
            <span className="flex size-full items-center justify-center">
              <Building2 className="size-6 text-subtle" strokeWidth={1.75} aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[15px] leading-5 font-bold text-ink">{unit.name}</p>
          <Description className="mt-0.5 truncate text-sm leading-5 text-ink-2">
            {unit.locationShortName} · <span className="font-semibold text-ink">{formatRupiah(unit.effectivePrice)}</span>
            /malam
          </Description>
        </div>
      </div>
      {!unit.isAvailable ? (
        <p className="mt-3 flex items-start gap-2 rounded-control bg-surface-2 px-3 py-2.5 text-sm leading-5 text-ink-2">
          <Info className="mt-px size-4 shrink-0 text-subtle" strokeWidth={1.75} aria-hidden="true" />
          Unit ini sedang penuh. Kirim permintaan untuk cek tanggal lain.
        </p>
      ) : null}
    </div>
  );
}
