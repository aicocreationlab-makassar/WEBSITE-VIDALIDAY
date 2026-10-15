"use client";

import { useCallback, useEffect, useRef } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Potongan daftar admin yang dipakai halaman landmark dan FAQ (pola fasilitas kamar & apartemen).

type ChipItem<T extends string> = { value: T; label: string };

type ChipsProps<T extends string> = {
  items: readonly ChipItem<T>[];
  value: T;
  counts: Record<T, number>;
  onChange: (value: T) => void;
  label: string;
  className?: string;
};

/** Chip saring dengan jumlah (geser horizontal di HP, 44px). */
export function FilterChips<T extends string>({ items, value, counts, onChange, label, className }: ChipsProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0", className)}
    >
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-brand-500/20",
              active ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-2 hover:bg-surface-2",
            )}
          >
            {item.label}
            <span
              className={cn(
                "min-w-6 rounded-full px-1.5 text-center text-caption tabular-nums",
                active ? "bg-white/20 text-white" : "bg-surface-2 text-ink-2",
              )}
            >
              {counts[item.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type Direction = "up" | "down";

type OrderProps = {
  id: number;
  name: string;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  /** Alasan tombol mati (mis. sedang mencari), dipakai sebagai title. */
  disabledReason?: string;
  onMove: (direction: Direction) => void;
  className?: string;
};

/** Tombol naik/turun urutan 44px dengan label spesifik ("Naikkan urutan {nama}"). */
export function OrderButtons({ id, name, isFirst, isLast, disabled, disabledReason, onMove, className }: OrderProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="quiet"
        size="icon"
        data-reorder={`${id}:up`}
        aria-label={`Naikkan urutan ${name}`}
        title={disabled && disabledReason ? disabledReason : undefined}
        disabled={isFirst || disabled}
        onClick={() => onMove("up")}
      >
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button
        variant="quiet"
        size="icon"
        data-reorder={`${id}:down`}
        aria-label={`Turunkan urutan ${name}`}
        title={disabled && disabledReason ? disabledReason : undefined}
        disabled={isLast || disabled}
        onClick={() => onMove("down")}
      >
        <ArrowDown aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * Setelah urutan berubah, kembalikan fokus keyboard ke tombol yang sama pada baris yang dipindah
 * (atau tombol sebaliknya kalau baris sudah di ujung). Panggil `remember` sebelum memindah.
 */
export function useReorderFocus(moving: boolean, trigger: unknown) {
  const pending = useRef<string | null>(null);

  useEffect(() => {
    const key = pending.current;
    if (!key || moving) return;
    pending.current = null;
    const [id, direction] = key.split(":");
    const button = document.querySelector<HTMLButtonElement>(`[data-reorder="${id}:${direction}"]`);
    const other = document.querySelector<HTMLButtonElement>(`[data-reorder="${id}:${direction === "up" ? "down" : "up"}"]`);
    (button && !button.disabled ? button : other)?.focus();
  }, [moving, trigger]);

  return useCallback((id: number, direction: Direction) => {
    pending.current = `${id}:${direction}`;
  }, []);
}
