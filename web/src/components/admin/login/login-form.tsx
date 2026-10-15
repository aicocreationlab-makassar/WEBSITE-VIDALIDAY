"use client";

import { startTransition, Suspense, useActionState, useId, useRef, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type SignInState } from "@/lib/actions/admin/auth";
import { cn } from "@/lib/utils";
import { loginFieldErrors, loginSchema, type LoginField } from "@/lib/validation/auth";
import { AccessDeniedNotice } from "./access-denied-notice";
import { FieldError, FormAlert } from "./form-alert";

type FieldErrors = Partial<Record<LoginField, string>>;

export function LoginForm({ className }: { className?: string }) {
  const [state, formAction, isPending] = useActionState<SignInState | null, FormData>(signIn, null);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const uid = useId();
  const ids = {
    email: `${uid}-email`,
    emailError: `${uid}-email-error`,
    password: `${uid}-password`,
    passwordError: `${uid}-password-error`,
  };

  // Galat server disembunyikan selama permintaan baru berjalan; galat klien selalu menang.
  const serverState = !isPending && state && !state.ok ? state : null;
  const fieldErrors: FieldErrors = clientErrors ?? serverState?.fieldErrors ?? {};
  const generalError = clientErrors ? null : (serverState?.error ?? null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Setelah hidrasi, kirim lewat transition sendiri: validasi zod dulu di klien,
    // dan isian tidak di-reset otomatis oleh React saat kata sandi salah.
    event.preventDefault();
    if (isPending) return;
    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      const errors = loginFieldErrors(parsed.error);
      setClientErrors(errors);
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    setClientErrors(null);
    startTransition(() => formAction(formData));
  }

  function clearFieldError(field: LoginField) {
    if (clientErrors?.[field]) setClientErrors({ ...clientErrors, [field]: undefined });
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
        <AccessDeniedNotice hidden={Boolean(generalError) || isPending} />
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
          placeholder="nama@contoh.com"
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? ids.emailError : undefined}
          onChange={() => clearFieldError("email")}
        />
        {fieldErrors.email ? <FieldError id={ids.emailError}>{fieldErrors.email}</FieldError> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.password}>Kata sandi</Label>
        <div className="relative">
          <Input
            ref={passwordRef}
            id={ids.password}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            required
            className="pr-14"
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? ids.passwordError : undefined}
            onChange={() => clearFieldError("password")}
          />
          {/* Nama tombol lewat teks sr-only (bukan aria-label) supaya pencarian berdasarkan
              label "Kata sandi" hanya menemukan input-nya. */}
          <Button
            type="button"
            variant="quiet"
            size="icon"
            className="absolute top-0.5 right-0.5 active:not-disabled:translate-y-0"
            aria-controls={ids.password}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            <span className="sr-only">{showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}</span>
          </Button>
        </div>
        {fieldErrors.password ? (
          <FieldError id={ids.passwordError}>{fieldErrors.password}</FieldError>
        ) : null}
        <div className="flex justify-end">
          <Link
            href="/admin/lupa-password"
            className="-mr-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Lupa kata sandi?
          </Link>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" loading={isPending}>
        Masuk
      </Button>
    </form>
  );
}
