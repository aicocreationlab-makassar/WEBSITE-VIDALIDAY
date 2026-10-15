"use client";

import { useEffect, useRef } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { successMessage, type LeadSnapshot } from "./booking-model";

type Props = {
  snapshot: LeadSnapshot;
  officeHours: string;
  /** Desktop: tautan "Buka WhatsApp lagi" di tab baru. HP: tab yang sama. */
  newTab: boolean;
  onDone: () => void;
  /** "sheet" = isi sheet/modal; "panel" = kartu menempel di bawah layar. */
  variant: "sheet" | "panel";
  /** Pindahkan fokus ke kalimat sukses saat muncul (form yang tadi difokus sudah hilang). */
  autoFocus?: boolean;
};

/** "Permintaan terkirim ke WhatsApp ..." setelah tamu diarahkan (PRD 6.5 langkah 6). */
export function BookingSuccess({ snapshot, officeHours, newTab, onDone, variant, autoFocus }: Props) {
  const { lead, outside } = snapshot;
  const panel = variant === "panel";
  const messageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (autoFocus) messageRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-3",
        panel ? "items-stretch" : "items-center px-4 py-8 text-center md:px-6",
      )}
    >
      <div className={cn("flex gap-3", panel ? "items-start" : "flex-col items-center")}>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-surface-2",
            panel ? "size-10" : "size-14",
          )}
        >
          <CircleCheck
            className={cn("text-success", panel ? "size-6" : "size-7")}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p
            ref={messageRef}
            tabIndex={autoFocus ? -1 : undefined}
            className={cn("font-bold text-ink outline-none", panel ? "text-[15px] leading-6" : "text-base leading-6")}
          >
            {successMessage(officeHours, outside)}
          </p>
          {lead.code ? (
            <p className="text-sm text-ink-2">
              Kode permintaan: <span className="font-bold text-ink tabular-nums">{lead.code}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "flex gap-2",
          panel
            ? "flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1"
            : "w-full max-w-sm flex-col-reverse items-stretch",
        )}
      >
        <a
          href={lead.url}
          target={newTab ? "_blank" : undefined}
          rel="noopener noreferrer"
          onClick={() => track("whatsapp_redirect", { unit: lead.unit, saved: lead.code !== null, context: "booking" })}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-2 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline",
            panel && "min-w-0 flex-1 justify-start px-0 text-left",
          )}
        >
          <WhatsappIcon className="size-4 shrink-0" />
          Belum terbuka? Buka WhatsApp lagi
        </a>
        <Button
          type="button"
          variant={panel ? "secondary" : "primary"}
          size={panel ? "md" : "lg"}
          onClick={onDone}
          className={panel ? undefined : "w-full"}
        >
          Selesai
        </Button>
      </div>
    </div>
  );
}
