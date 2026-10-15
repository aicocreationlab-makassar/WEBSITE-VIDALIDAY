"use client";

import { useId, useState } from "react";
import { useFormContext } from "react-hook-form";
import { CircleCheck, Minus, Plus, TriangleAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { UnitData, UnitInput } from "@/lib/validation/admin";
import { formatNumberText, parseNumberText, sanitizeNumberText, type Note } from "./unit-form-model";

/** Konteks react-hook-form form unit (dipakai setiap kartu). */
export function useUnitFormContext() {
  return useFormContext<UnitInput, unknown, UnitData>();
}

/** Teks petunjuk bernada: biasa (muted), peringatan (ikon amber), atau beres (ikon hijau). Isi <p> hint. */
export function NoteText({ note }: { note: Note | null }) {
  if (!note) return null;
  if (note.tone === "muted") return <>{note.text}</>;
  const Icon = note.tone === "warning" ? TriangleAlert : CircleCheck;
  return (
    <span className="inline-flex items-start gap-1.5 text-ink-2">
      <Icon
        className={cn("mt-0.5 size-3.5 shrink-0", note.tone === "warning" ? "text-warning" : "text-success")}
        aria-hidden="true"
      />
      <span>{note.text}</span>
    </span>
  );
}

/** Kotak catatan peringatan di dalam kartu (mis. label promo lama). */
export function WarningBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-control border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-ink-2",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

type NumberInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "inputMode"> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  /** Izinkan desimal (koma), mis. luas 24,5 m². */
  decimal?: boolean;
  /** Satuan di kanan, mis. "m²". */
  suffix?: string;
};

/** Input angka 48px untuk HP: keyboard angka, tanpa scroll-wheel, nilai tersimpan number | null. */
export function NumberInput({ value, onChange, decimal = false, suffix, className, onFocus, onBlur, ref, ...props }: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? formatNumberText(value);

  return (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        autoComplete="off"
        value={shown}
        onFocus={(event) => {
          setDraft(formatNumberText(value));
          onFocus?.(event);
        }}
        onChange={(event) => {
          const text = sanitizeNumberText(event.target.value, decimal);
          setDraft(text);
          onChange(parseNumberText(text));
        }}
        onBlur={(event) => {
          setDraft(null);
          onBlur?.(event);
        }}
        className={cn(
          "glass-input h-12 w-full min-w-0 rounded-control px-3.5 text-base text-ink tabular-nums aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-surface-2",
          suffix && "pr-12",
          className,
        )}
        {...props}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-base font-semibold text-muted">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

type GuestStepperProps = Omit<NumberInputProps, "decimal" | "suffix"> & { min?: number; max?: number };

/** Kapasitas tamu: tombol kurang/tambah 48px + input angka (id dan aria-* diteruskan ke input). */
export function GuestStepper({ value, onChange, min = 1, max = 30, disabled, ...props }: GuestStepperProps) {
  const current = value ?? null;
  const step = (delta: number) => {
    const base = current ?? (delta > 0 ? min - 1 : min + 1);
    onChange(Math.min(max, Math.max(min, base + delta)));
  };
  const button =
    "inline-flex size-12 shrink-0 items-center justify-center rounded-control border-[1.5px] border-line bg-white text-ink transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-3 focus-visible:ring-brand-500/20";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={button}
        onClick={() => step(-1)}
        disabled={disabled || (current !== null && current <= min)}
        aria-label="Kurangi tamu"
      >
        <Minus className="size-5" aria-hidden="true" />
      </button>
      <NumberInput value={value} onChange={onChange} disabled={disabled} className="text-center" {...props} />
      <button
        type="button"
        className={button}
        onClick={() => step(1)}
        disabled={disabled || (current !== null && current >= max)}
        aria-label="Tambah tamu"
      >
        <Plus className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

type SwitchRowProps = {
  label: string;
  description: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
};

/** Baris switch: label (bisa diketuk selebar baris) + satu kalimat penjelasan, min. 56px. */
export function SwitchRow({ label, description, checked, onCheckedChange, onBlur, disabled, className }: SwitchRowProps) {
  const id = useId();
  const descriptionId = `${id}-ket`;
  return (
    <div className={cn("flex min-h-14 items-start gap-4 py-2", className)}>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block cursor-pointer py-1 text-sm leading-5 font-semibold text-ink">
          {label}
        </label>
        <p id={descriptionId} className="text-caption text-muted">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        onBlur={onBlur}
        disabled={disabled}
        aria-describedby={descriptionId}
        className="mt-1.5"
      />
    </div>
  );
}
