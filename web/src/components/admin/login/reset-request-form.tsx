"use client";

import { startTransition, Suspense, useActionState, useEffect, useId, useRef, useState } from "react";
import { MailCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, type ResetRequestState } from "@/lib/actions/admin/auth";
import { cn } from "@/lib/utils";
import { FieldError, FormAlert } from "./form-alert";
import { firstFieldErrors, resetRequestSchema, type ResetRequestField } from "./password-schema";

type FieldErrors = Partial<Record<ResetRequestField, string>>;

/** Jeda sebelum boleh kirim ulang (Supabase membatasi email atur ulang per akun). */
const RESEND_COOLDOWN_S = 60;

export const RESET_SENT_TEXT = "Kalau email terdaftar, link atur ulang sudah dikirim. Cek kotak masuk dan folder spam.";

/** Form "Lupa kata sandi": kirim link atur ulang ke email admin (PRD 7.1, P1). */
export function ResetRequestForm({ className }: { className?: string }) {
  const [state, formAction, isPending] = useActionState<ResetRequestState | null, FormData>(requestPasswordReset, null);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  // Hasil sukses yang sudah "ditutup" lewat tombol kirim ulang (form tampil lagi).
  const [dismissed, setDismissed] = useState<ResetRequestState | null>(null);
  const [lastEmail, setLastEmail] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  const uid = useId();
  const ids = { email: `${uid}-email`, emailError: `${uid}-email-error` };

  const sent = Boolean(state?.ok) && state !== dismissed && !isPending;
  const serverState = !isPending && state && !state.ok ? state : null;
  const fieldErrors: FieldErrors = clientErrors ?? serverState?.fieldErrors ?? {};
  const generalError = clientErrors ? null : (serverState?.error ?? null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    const formData = new FormData(event.currentTarget);
    const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
    if (!parsed.success) {
      setClientErrors(firstFieldErrors(parsed.error, ["email"] as const));
      emailRef.current?.focus();
      return;
    }
    setClientErrors(null);
    setLastEmail(parsed.data.email);
    startTransition(() => formAction(formData));
  }

  if (sent) {
    return <SentPanel className={className} onResend={() => setDismissed(state)} />;
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-5", className)}
      aria-busy={isPending || undefined}
    >
      {generalError ? <FormAlert>{generalError}</FormAlert> : null}
      <Suspense fallback={null}>
        <ExpiredLinkNotice hidden={Boolean(generalError) || isPending} />
      </Suspense>

      <div className="space-y-1.5">
        <Label htmlFor={ids.email}>Email</Label>
        <Input
          ref={emailRef}
          id={ids.email}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={lastEmail}
          placeholder="nama@contoh.com"
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? ids.emailError : undefined}
          onChange={() => {
            if (clientErrors?.email) setClientErrors(null);
          }}
        />
        {fieldErrors.email ? <FieldError id={ids.emailError}>{fieldErrors.email}</FieldError> : null}
      </div>

      <Button type="submit" size="lg" className="w-full" loading={isPending}>
        Kirim link atur ulang
      </Button>
    </form>
  );
}

function SentPanel({ className, onResend }: { className?: string; onResend: () => void }) {
  const [remaining, setRemaining] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return (
    <div className={cn("space-y-5", className)}>
      <div role="status" className="flex flex-col items-center gap-3 rounded-card border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-white text-success">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <p className="text-base font-bold text-ink">Cek email kamu</p>
        <p className="text-sm leading-6 text-ink-2">{RESET_SENT_TEXT}</p>
      </div>
      <p className="text-center text-caption text-muted">
        Link hanya bisa dipakai sekali. Kalau tidak ada email dalam beberapa menit, kirim ulang.
      </p>
      <Button type="button" variant="secondary" size="lg" className="w-full" disabled={remaining > 0} onClick={onResend}>
        {remaining > 0 ? `Kirim ulang dalam ${remaining} detik` : "Kirim ulang link"}
      </Button>
    </div>
  );
}

/** Pesan untuk `?gagal=1` (link kedaluwarsa / sudah dipakai). Wajib di dalam <Suspense>. */
function ExpiredLinkNotice({ hidden = false }: { hidden?: boolean }) {
  const searchParams = useSearchParams();
  if (hidden || searchParams.get("gagal") !== "1") return null;
  return <FormAlert>Link atur ulang sudah tidak berlaku atau sudah dipakai. Minta link baru di bawah.</FormAlert>;
}
