"use client";

import { cloneElement, isValidElement, useId } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  /** Pesan error (zod / server). */
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  /** Satu elemen kontrol (input/select/textarea). id dan aria-* disisipkan otomatis. */
  children: React.ReactElement<Record<string, unknown>>;
  className?: string;
  /** Teks di kanan label, mis. penghitung karakter. */
  aside?: React.ReactNode;
};

/**
 * Label di atas kontrol (14/600 ink-2), petunjuk 13 muted, error dengan ikon + teks danger
 * yang dihubungkan lewat aria-describedby (DESIGN 4.5, 8).
 */
export function Field({ label, error, hint, required, children, className, aside }: FieldProps) {
  const autoId = useId();
  const controlId = (isValidElement(children) && typeof children.props.id === "string" ? children.props.id : null) ?? `f${autoId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })
    : children;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={controlId} className="text-sm leading-5 font-semibold text-ink-2">
          {label}
          {required ? (
            <span className="text-brand-700" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </label>
        {aside ? <span className="text-caption text-muted">{aside}</span> : null}
      </div>
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-caption font-medium text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** <select> asli bergaya kontrol (andal di HP, cocok dengan react-hook-form). */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "glass-input h-12 w-full min-w-0 appearance-none rounded-control bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[length:16px] bg-[right_14px_center] bg-no-repeat px-3.5 pr-10 text-base text-ink disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
