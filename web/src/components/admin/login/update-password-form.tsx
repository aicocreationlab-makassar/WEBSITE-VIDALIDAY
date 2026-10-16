"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword, type UpdatePasswordState } from "@/lib/actions/admin/auth";
import { cn } from "@/lib/utils";
import { FieldError, FormAlert } from "./form-alert";
import { firstFieldErrors, newPasswordSchema, PASSWORD_MAX, PASSWORD_MIN, type NewPasswordField } from "./password-schema";

type FieldErrors = Partial<Record<NewPasswordField, string>>;

/** Form "Atur kata sandi baru" setelah membuka link email (PRD 7.1, P1). */
export function UpdatePasswordForm({ email, className }: { email: string | null; className?: string }) {
  const [state, formAction, isPending] = useActionState<UpdatePasswordState | null, FormData>(updatePassword, null);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const uid = useId();
  const ids = {
    password: `${uid}-password`,
    passwordError: `${uid}-password-error`,
    passwordHint: `${uid}-password-hint`,
    confirm: `${uid}-confirm`,
    confirmError: `${uid}-confirm-error`,
  };

  const saved = Boolean(state?.ok);
  const serverState = !isPending && state && !state.ok ? state : null;
  const fieldErrors: FieldErrors = clientErrors ?? serverState?.fieldErrors ?? {};
  const generalError = clientErrors ? null : (serverState?.error ?? null);
  const expired = !clientErrors && Boolean(serverState?.expired);

  useEffect(() => {
    if (!saved) return;
    toast.success("Kata sandi baru disimpan");
    router.replace("/admin");
  }, [saved, router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || saved) return;
    const formData = new FormData(event.currentTarget);
    const parsed = newPasswordSchema.safeParse({
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });
    if (!parsed.success) {
      const errors = firstFieldErrors(parsed.error, ["password", "confirm"] as const);
      setClientErrors(errors);
      (errors.password ? passwordRef : confirmRef).current?.focus();
      return;
    }
    setClientErrors(null);
    startTransition(() => formAction(formData));
  }

  function clearFieldError(field: NewPasswordField) {
    if (clientErrors?.[field]) setClientErrors({ ...clientErrors, [field]: undefined });
  }

  if (saved) {
    return (
      <div role="status" className={cn("space-y-4 text-center", className)}>
        <p className="text-sm leading-6 text-ink-2">Kata sandi baru tersimpan. Membuka dashboard…</p>
        <Button asChild size="lg" className="w-full">
          <Link href="/admin">Buka dashboard</Link>
        </Button>
      </div>
    );
  }

  const longEnough = password.length >= PASSWORD_MIN;
  const matches = confirm.length > 0 && confirm === password;

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-5", className)}
      aria-busy={isPending || undefined}
    >
      {generalError ? (
        <FormAlert>
          {generalError}
          {expired ? (
            <>
              {" "}
              <Link href="/admin/lupa-password" className="font-semibold underline underline-offset-4">
                Minta link baru
              </Link>
            </>
          ) : null}
        </FormAlert>
      ) : null}

      {/* Membantu pengelola kata sandi menyimpan pasangan email + kata sandi baru. */}
      {email ? (
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      ) : null}
      {email ? (
        <p className="rounded-control bg-surface px-3.5 py-2.5 text-center text-sm text-ink-2">
          Akun: <span className="font-semibold break-all text-ink">{email}</span>
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor={ids.password}>Kata sandi baru</Label>
        <div className="relative">
          <Input
            ref={passwordRef}
            id={ids.password}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={PASSWORD_MIN}
            maxLength={PASSWORD_MAX}
            className="pr-14"
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? ids.passwordError : ids.passwordHint}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError("password");
            }}
          />
          {/* Nama tombol lewat teks sr-only supaya pencarian label hanya menemukan input-nya. */}
          <Button
            type="button"
            variant="quiet"
            size="icon"
            className="absolute top-0.5 right-0.5 active:not-disabled:translate-y-0"
            aria-controls={`${ids.password} ${ids.confirm}`}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            <span className="sr-only">{showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}</span>
          </Button>
        </div>
        {fieldErrors.password ? (
          <FieldError id={ids.passwordError}>{fieldErrors.password}</FieldError>
        ) : (
          <Requirement id={ids.passwordHint} met={longEnough}>
            Minimal {PASSWORD_MIN} karakter
          </Requirement>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.confirm}>Ulangi kata sandi</Label>
        <Input
          ref={confirmRef}
          id={ids.confirm}
          name="confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={PASSWORD_MAX}
          aria-invalid={fieldErrors.confirm ? true : undefined}
          aria-describedby={fieldErrors.confirm ? ids.confirmError : undefined}
          onChange={(event) => {
            setConfirm(event.target.value);
            clearFieldError("confirm");
          }}
        />
        {fieldErrors.confirm ? (
          <FieldError id={ids.confirmError}>{fieldErrors.confirm}</FieldError>
        ) : confirm.length > 0 ? (
          <Requirement met={matches}>{matches ? "Kata sandi sama" : "Belum sama dengan kata sandi baru"}</Requirement>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" loading={isPending}>
        Simpan kata sandi
      </Button>
    </form>
  );
}

function Requirement({ id, met, children }: { id?: string; met: boolean; children: React.ReactNode }) {
  return (
    <p id={id} className={cn("flex items-center gap-1.5 text-caption", met ? "font-medium text-emerald-700" : "text-muted")}>
      <Check className={cn("size-4 shrink-0", met ? "opacity-100" : "opacity-40")} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
