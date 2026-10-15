"use client";

import { useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, CircleAlert, Minus, Plus, TriangleAlert, UserRound } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitLead, type SubmitLeadResult } from "@/lib/actions/booking";
import { track } from "@/lib/analytics";
import { buildBookingMessage } from "@/lib/booking-message";
import { diffDays, formatWhatsappDisplay, todayInMakassar } from "@/lib/format";
import { unitHref } from "@/lib/unit-display";
import { cn } from "@/lib/utils";
import {
  MAX_GUESTS,
  MAX_NOTES,
  PURPOSES,
  makeBookingSchema,
  type BookingData,
  type BookingField,
  type BookingInput,
  type Purpose,
} from "@/lib/validation/booking";
import {
  cancelWhatsappTab,
  goToWhatsapp,
  prepareWhatsappTab,
  readSavedGuest,
  rememberLastLead,
  saveGuest,
  type PendingTab,
} from "@/lib/wa-redirect";
import { waLink } from "@/lib/whatsapp";
import {
  adjustCheckOut,
  clampGuests,
  dateBounds,
  estimateView,
  exceedsCapacity,
  firstEmptyField,
  firstInvalidField,
  initialBookingState,
  isOutsideOfficeHours,
  largerUnitsLink,
  serverFieldErrors,
  stayNights,
  staySummary,
  type LeadSnapshot,
} from "./booking-model";
import type { BookingPrefill, BookingSettings, BookingUnit } from "./types";
import { notifyLeadChange } from "./use-active-lead";

type Props = {
  unit: BookingUnit;
  settings: BookingSettings;
  siteUrl: string;
  prefill: BookingPrefill;
  largerUnitsHref: string;
  /**
   * Permintaan sudah diarahkan ke WhatsApp: tampilkan keadaan sukses. Snapshot dikirim juga
   * supaya sukses tetap tampil walau sessionStorage diblokir (mode privat).
   */
  onSent: (snapshot: LeadSnapshot) => void;
  /** Tautan internal diklik (kebijakan privasi, unit lebih besar): tutup sheet. */
  onNavigate: () => void;
};

/** Batas tunggu Server Action di klien. Lewat dari ini tamu tetap diarahkan ke WhatsApp tanpa kode. */
const CLIENT_TIMEOUT_MS = 5_000;

const UNREACHABLE = { ok: false, reason: "UNAVAILABLE", message: null, blocking: false } as const satisfies SubmitLeadResult;
const TIMED_OUT = { ...UNREACHABLE, reason: "TIMEOUT" } as const satisfies SubmitLeadResult;

/** Server Action yang tidak pernah melempar dan tidak pernah menunggu terlalu lama. */
async function submitSafely(input: BookingInput): Promise<SubmitLeadResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      submitLead(input),
      new Promise<SubmitLeadResult>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), CLIENT_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return UNREACHABLE;
  } finally {
    clearTimeout(timer);
  }
}

const IDENTITY_FIELDS: BookingField[] = ["fullName", "whatsapp"];

/**
 * Form "Atur rencana menginap" (PRD 6.5, DESIGN 4.9, UX 2.5). Hanya dirender saat sheet/modal
 * terbuka (di klien), jadi "hari ini" WITA dan data tersimpan dibaca sekali saat form muncul.
 */
export function BookingForm({ unit, settings, siteUrl, prefill, largerUnitsHref, onSent, onNavigate }: Props) {
  const uid = useId();
  const idFor = (name: string) => `${uid}-${name}`;
  const errorIdFor = (name: string) => `${uid}-${name}-error`;

  const [initial] = useState(() =>
    initialBookingState({
      today: todayInMakassar(),
      unit,
      prefill,
      saved: readSavedGuest(),
      sourcePath: unitHref(unit.slug),
    }),
  );
  const { today } = initial;
  const schema = useMemo(() => makeBookingSchema(today), [today]);

  const {
    register,
    control,
    getValues,
    setValue,
    setError,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingInput, unknown, BookingData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: initial.values,
    shouldFocusError: false,
  });

  const [fullName, whatsapp, checkIn, checkOut, guests, purpose, notes] = useWatch({
    control,
    name: ["fullName", "whatsapp", "checkIn", "checkOut", "guests", "purpose", "notes"],
  });

  const [identityCollapsed, setIdentityCollapsed] = useState(initial.identityCollapsed);
  const [remember, setRemember] = useState(initial.remember);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const autoFocusField = firstEmptyField(initial.values, initial.identityCollapsed);
  const bounds = dateBounds(today, checkIn);
  const summary = staySummary(checkIn, checkOut);
  const estimate = estimateView(unit, checkIn, checkOut);
  const overCapacity = exceedsCapacity(guests, unit.maxGuests);
  const notesLength = (notes ?? "").length;

  // -------------------------------------------------------------------------
  // Fokus
  // -------------------------------------------------------------------------

  function focusElement(id: string) {
    const element = document.getElementById(id);
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: "center" });
  }

  function focusField(field: BookingField) {
    if (identityCollapsed && IDENTITY_FIELDS.includes(field)) {
      flushSync(() => setIdentityCollapsed(false));
    }
    focusElement(idFor(field));
  }

  function onInvalid(fieldErrors: FieldErrors<BookingInput>) {
    const field = firstInvalidField(Object.keys(fieldErrors));
    if (field) focusField(field);
  }

  function editIdentity() {
    flushSync(() => setIdentityCollapsed(false));
    document.getElementById(idFor("fullName"))?.focus();
  }

  // -------------------------------------------------------------------------
  // Isian
  // -------------------------------------------------------------------------

  const fullNameField = register("fullName");
  const whatsappField = register("whatsapp");
  const checkInField = register("checkIn");
  const checkOutField = register("checkOut");

  function onCheckInChange(event: React.ChangeEvent<HTMLInputElement>) {
    const adjusted = adjustCheckOut({ checkIn, checkOut }, event.target.value);
    void checkInField.onChange(event);
    if (adjusted !== checkOut) {
      setValue("checkOut", adjusted, { shouldDirty: true, shouldValidate: Boolean(errors.checkOut) });
    } else if (errors.checkOut) {
      // Error urutan tanggal ada di check-out; periksa ulang setelah check-in berubah.
      void trigger("checkOut");
    }
  }

  function stepGuests(delta: number) {
    setValue("guests", clampGuests(guests + delta), { shouldDirty: true, shouldValidate: Boolean(errors.guests) });
  }

  function togglePurpose(value: Purpose) {
    setValue("purpose", purpose === value ? null : value, { shouldDirty: true });
  }

  // -------------------------------------------------------------------------
  // Kirim (PRD 6.5): validasi sinkron → tab WA disiapkan di dalam event → simpan → arahkan
  // -------------------------------------------------------------------------

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    setFormError(null);

    const values = getValues();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      // Tandai form sudah dikirim (validasi ulang saat mengetik) dan tampilkan error per field.
      void handleSubmit(() => undefined, onInvalid)();
      return;
    }

    // Harus sinkron di dalam event submit supaya tab baru desktop tidak diblok popup blocker.
    const pending = prepareWhatsappTab();
    submittingRef.current = true;
    setSubmitting(true);
    void send(parsed.data, values.website ?? "", pending);
  }

  async function send(data: BookingData, website: string, pending: PendingTab) {
    const result = await submitSafely({
      unitId: unit.id,
      fullName: data.fullName,
      whatsapp: data.whatsapp,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests: data.guests,
      purpose: data.purpose ?? null,
      notes: data.notes,
      website,
      sourcePath: unitHref(unit.slug),
    });

    if (!result.ok && result.blocking) {
      cancelWhatsappTab(pending);
      submittingRef.current = false;
      setSubmitting(false);
      const pairs = serverFieldErrors(result.fieldErrors);
      for (const [field, message] of pairs) setError(field, { type: "server", message });
      flushSync(() => setFormError(result.message ?? "Periksa lagi isian yang ditandai."));
      if (pairs.length) focusField(pairs[0][0]);
      else focusElement(idFor("form-error"));
      return;
    }

    const code = result.ok ? result.code : null;
    const nights = stayNights(data.checkIn, data.checkOut) ?? diffDays(data.checkIn, data.checkOut);
    let message: string;
    try {
      message = buildBookingMessage(
        settings.bookingWhatsappTemplate,
        unit,
        {
          fullName: data.fullName,
          whatsapp: data.whatsapp,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          nights,
          guests: data.guests,
          purpose: data.purpose ?? null,
          notes: data.notes || null,
          code,
          estimatedTotal: result.ok ? result.estimatedTotal : null,
        },
        siteUrl,
      );
    } catch {
      // Template rusak tidak boleh menghalangi tamu.
      message = `Halo Admin VIDALIDAY, saya mau sewa unit ${unit.name} (${unit.locationShortName}).`;
    }
    const url = waLink(settings.whatsappNumber, message);

    const lead = { unit: unit.slug, code, url, at: Date.now() };
    rememberLastLead(lead);
    saveGuest(remember ? { fullName: data.fullName, whatsapp: data.whatsapp } : null);
    track("booking_submit", { unit: unit.slug, code, nights, guests: data.guests, saved: result.ok });
    track("whatsapp_redirect", { unit: unit.slug, saved: result.ok, context: "booking" });
    goToWhatsapp(pending, url);

    submittingRef.current = false;
    setSubmitting(false);
    onSent({ lead, outside: isOutsideOfficeHours(settings.officeHours, lead.at) });
    notifyLeadChange();
  }

  // -------------------------------------------------------------------------
  // Tampilan
  // -------------------------------------------------------------------------

  const describedBy = (field: BookingField, ...extra: string[]) =>
    [errors[field] ? errorIdFor(field) : null, ...extra].filter(Boolean).join(" ") || undefined;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label="Form sewa"
      className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
    >
      <div className="flex flex-1 flex-col gap-5 px-4 pt-4 pb-6 md:px-6">
        {formError ? (
          <div
            id={idFor("form-error")}
            role="alert"
            tabIndex={-1}
            className="flex items-start gap-2 rounded-control border-[1.5px] border-danger/30 bg-white p-3 text-sm leading-5 font-medium text-danger outline-none"
          >
            <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
            <p>{formError}</p>
          </div>
        ) : null}

        {identityCollapsed ? (
          <div className="flex items-center gap-3 rounded-control bg-surface-2 py-1 pr-1 pl-3.5">
            <UserRound className="size-5 shrink-0 text-subtle" strokeWidth={1.75} aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm leading-5 text-ink-2">
              Atas nama <span className="font-semibold text-ink">{fullName}</span>
              {" · "}
              <span className="whitespace-nowrap">{formatWhatsappDisplay(whatsapp)}</span>
            </p>
            <Button type="button" variant="ghost" onClick={editIdentity} aria-label="Ubah nama dan nomor WhatsApp">
              Ubah
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={idFor("fullName")}>Nama lengkap</Label>
              <Input
                id={idFor("fullName")}
                type="text"
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                maxLength={100}
                aria-invalid={errors.fullName ? true : undefined}
                aria-describedby={describedBy("fullName")}
                data-autofocus={autoFocusField === "fullName" ? "true" : undefined}
                className="h-[52px]"
                {...fullNameField}
              />
              <FieldError id={errorIdFor("fullName")} message={errors.fullName?.message} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={idFor("whatsapp")}>Nomor WhatsApp</Label>
              <Input
                id={idFor("whatsapp")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="next"
                placeholder="0812 3456 7890"
                maxLength={25}
                aria-invalid={errors.whatsapp ? true : undefined}
                aria-describedby={describedBy("whatsapp")}
                data-autofocus={autoFocusField === "whatsapp" ? "true" : undefined}
                className="h-[52px]"
                {...whatsappField}
              />
              <FieldError id={errorIdFor("whatsapp")} message={errors.whatsapp?.message} />
            </div>
          </>
        )}

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor={idFor("checkIn")}>Check-in</Label>
              <Input
                id={idFor("checkIn")}
                type="date"
                min={bounds.checkInMin}
                max={bounds.checkInMax}
                aria-invalid={errors.checkIn ? true : undefined}
                aria-describedby={describedBy("checkIn", summary ? idFor("stay-summary") : "")}
                data-autofocus={autoFocusField === "checkIn" ? "true" : undefined}
                className={dateInputClass}
                {...checkInField}
                onChange={onCheckInChange}
              />
              <FieldError id={errorIdFor("checkIn")} message={errors.checkIn?.message} />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor={idFor("checkOut")}>Check-out</Label>
              <Input
                id={idFor("checkOut")}
                type="date"
                min={bounds.checkOutMin}
                max={bounds.checkOutMax}
                aria-invalid={errors.checkOut ? true : undefined}
                aria-describedby={describedBy("checkOut", summary ? idFor("stay-summary") : "")}
                data-autofocus={autoFocusField === "checkOut" ? "true" : undefined}
                className={dateInputClass}
                {...checkOutField}
              />
              <FieldError id={errorIdFor("checkOut")} message={errors.checkOut?.message} />
            </div>
          </div>
          {summary ? (
            <p id={idFor("stay-summary")} className="flex items-center gap-2 text-sm leading-5 font-medium text-ink-2">
              <CalendarDays className="size-4 shrink-0 text-subtle" strokeWidth={1.75} aria-hidden="true" />
              {summary}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <Label htmlFor={idFor("guests")}>Jumlah tamu</Label>
              {unit.maxGuests >= 1 ? (
                <p className="text-caption text-muted">Kapasitas unit ini maks. {unit.maxGuests} tamu</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StepButton label="Kurangi tamu" disabled={guests <= 1} onClick={() => stepGuests(-1)}>
                <Minus className="size-5" aria-hidden="true" />
              </StepButton>
              <output
                id={idFor("guests")}
                tabIndex={-1}
                aria-live="polite"
                aria-atomic="true"
                aria-describedby={describedBy("guests")}
                className="min-w-10 text-center text-lg font-bold text-ink tabular-nums outline-none"
              >
                {guests}
              </output>
              <StepButton label="Tambah tamu" disabled={guests >= MAX_GUESTS} onClick={() => stepGuests(1)}>
                <Plus className="size-5" aria-hidden="true" />
              </StepButton>
            </div>
          </div>
          <FieldError id={errorIdFor("guests")} message={errors.guests?.message} />
          <div aria-live="polite">
            {overCapacity ? (
              <p className="flex items-start gap-2 rounded-control border-[1.5px] border-warning/40 bg-white px-3 py-2.5 text-sm leading-5 text-ink-2">
                <TriangleAlert className="mt-px size-4 shrink-0 text-warning" strokeWidth={1.75} aria-hidden="true" />
                <span>
                  Unit ini untuk maks. {unit.maxGuests} tamu.{" "}
                  <Link
                    href={largerUnitsLink(largerUnitsHref, guests)}
                    onClick={onNavigate}
                    className="font-semibold text-brand-700 underline underline-offset-2"
                  >
                    Lihat unit untuk {guests} tamu
                  </Link>
                </span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span id={idFor("purpose-label")} className="text-sm leading-5 font-semibold text-ink-2">
            Keperluan (opsional)
          </span>
          <div
            id={idFor("purpose")}
            role="group"
            tabIndex={-1}
            aria-labelledby={idFor("purpose-label")}
            className="flex flex-wrap gap-2 outline-none"
          >
            {PURPOSES.map((option) => {
              const selected = purpose === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => togglePurpose(option)}
                  className={cn(
                    "inline-flex h-11 items-center justify-center rounded-full border-[1.5px] px-4 text-[15px] font-semibold transition-colors duration-150 ease-out",
                    selected
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-line bg-white text-ink hover:border-subtle hover:bg-surface",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={idFor("notes")}>Catatan (opsional)</Label>
          <Textarea
            id={idFor("notes")}
            rows={3}
            maxLength={MAX_NOTES}
            placeholder="Contoh: minta early check-in"
            aria-invalid={errors.notes ? true : undefined}
            aria-describedby={describedBy("notes", idFor("notes-count"))}
            {...register("notes")}
          />
          <div className="flex items-start justify-between gap-3">
            <FieldError id={errorIdFor("notes")} message={errors.notes?.message} />
            <p id={idFor("notes-count")} className="ml-auto text-caption text-muted tabular-nums">
              {notesLength}/{MAX_NOTES}
            </p>
          </div>
        </div>

        <div className="flex min-h-11 items-center gap-3">
          <Checkbox
            id={idFor("remember")}
            checked={remember}
            onCheckedChange={(value) => setRemember(value === true)}
            className="size-5"
          />
          <Label htmlFor={idFor("remember")} className="text-[15px] font-medium text-ink">
            Ingat data saya di perangkat ini
          </Label>
        </div>

        {/* Honeypot: tidak terlihat dan tidak bisa difokus oleh tamu; bot yang mengisinya dilewati. */}
        <div aria-hidden="true" className="pointer-events-none absolute top-0 -left-[10000px] size-px overflow-hidden opacity-0">
          <label htmlFor={idFor("website")}>Website</label>
          <input id={idFor("website")} type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" {...register("website")} />
        </div>

        <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4 text-caption text-muted">
          <p>Pesanmu akan terbuka di WhatsApp, tinggal tekan kirim.</p>
          <p>
            Data dipakai untuk memproses reservasi.{" "}
            <Link
              href="/kebijakan-privasi"
              onClick={onNavigate}
              className="font-semibold text-brand-700 underline underline-offset-2"
            >
              Kebijakan privasi
            </Link>
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-line bg-white px-4 pt-2.5 pb-3 shadow-sticky md:px-6 md:pb-5">
        <div className="flex flex-col">
          <p data-testid="booking-estimate" aria-live="polite" aria-atomic="true" className="text-[15px] leading-6 text-ink-2">
            {estimate.kind === "estimate" ? (
              <>
                Estimasi <span className="font-bold text-ink">{estimate.amount}</span> untuk {estimate.nights} malam
                {estimate.suffix}
              </>
            ) : (
              estimate.text
            )}
          </p>
          <p className="text-caption text-muted">Harga final dikonfirmasi admin via WhatsApp.</p>
        </div>
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? null : <WhatsappIcon className="size-5" />}
          {submitting ? "Menyiapkan pesan..." : "Kirim via WhatsApp"}
        </Button>
      </div>
    </form>
  );
}

// iOS: input tanggal kosong tidak punya tinggi dan teksnya rata tengah.
const dateInputClass =
  "h-[52px] min-h-[52px] appearance-none px-3 text-left [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em]";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-caption font-medium text-danger">
      <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  // aria-disabled (bukan disabled) supaya fokus keyboard tidak hilang saat mencapai batas.
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className="inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-line bg-white text-ink transition-colors duration-150 ease-out hover:border-subtle hover:bg-surface aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-line aria-disabled:hover:bg-white"
    >
      {children}
    </button>
  );
}
