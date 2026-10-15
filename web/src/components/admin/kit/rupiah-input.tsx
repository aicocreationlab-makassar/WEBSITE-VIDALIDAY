"use client";

import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

const display = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function parseRupiah(text: string): number | null {
  const digits = text.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number(digits.slice(0, 12));
  return Number.isSafeInteger(value) ? value : null;
}

export function formatRupiahInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : display.format(value);
}

type Props = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
};

/** Input Rupiah: tampil "1.250.000" dengan awalan Rp, nilai tersimpan angka bulat (pola situs lama). */
export const RupiahInput = forwardRef<HTMLInputElement, Props>(function RupiahInput(
  { value, onChange, className, onBlur, onFocus, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const shown = focused ? draft : formatRupiahInput(value);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-base font-semibold text-muted">
        Rp
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={shown}
        onFocus={(event) => {
          setDraft(formatRupiahInput(value));
          setFocused(true);
          onFocus?.(event);
        }}
        onChange={(event) => {
          const next = parseRupiah(event.target.value);
          setDraft(formatRupiahInput(next));
          onChange(next);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        className={cn(
          "glass-input h-12 w-full rounded-control pr-3.5 pl-11 text-base text-ink tabular-nums aria-invalid:border-danger",
          className,
        )}
        {...props}
      />
    </div>
  );
});
