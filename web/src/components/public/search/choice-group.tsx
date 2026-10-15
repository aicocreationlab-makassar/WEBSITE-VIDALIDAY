"use client";

import { useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Choice = {
  /** null = opsi "Semua …". */
  value: string | null;
  label: string;
  /** Jumlah unit; ditampilkan "(n)" kalau ada. */
  count?: number;
  selected: boolean;
  disabled?: boolean;
};

type KeyStep = 1 | -1 | "first" | "last";

const KEYS: Record<string, KeyStep> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
  Home: "first",
  End: "last",
};

/**
 * Roving tabindex untuk radiogroup: Tab masuk ke opsi terpilih (atau opsi aktif pertama),
 * panah/Home/End memindah fokus melewati opsi nonaktif, Enter/Spasi/klik memilih.
 * Panah sengaja tidak langsung memilih: di sidebar desktop setiap pilihan langsung memuat ulang hasil,
 * dan di sheet urutan memilih berarti menutup sheet.
 */
function useRovingRadio(options: Choice[]) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.findIndex((option) => option.selected);
  const tabStop = selected >= 0 ? selected : options.findIndex((option) => !option.disabled);

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, from: number) {
    const step = KEYS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const enabled = options.flatMap((option, position) => (option.disabled ? [] : [position]));
    if (!enabled.length) return;
    let target: number;
    if (step === "first") target = enabled[0];
    else if (step === "last") target = enabled[enabled.length - 1];
    else {
      const position = enabled.indexOf(from);
      const start = position === -1 ? (step === 1 ? -1 : 0) : position;
      target = enabled[(start + step + enabled.length) % enabled.length];
    }
    refs.current[target]?.focus();
  }

  return (position: number) => ({
    ref: (node: HTMLButtonElement | null) => {
      refs.current[position] = node;
    },
    tabIndex: position === tabStop ? 0 : -1,
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => onKeyDown(event, position),
  });
}

function accessibleName(choice: Choice): string | undefined {
  return choice.count === undefined ? undefined : `${choice.label}, ${choice.count} unit`;
}

type ChipsProps = {
  /** id judul grup (aria-labelledby). */
  labelledBy: string;
  options: Choice[];
  onSelect: (value: string | null) => void;
  /** sheet: 44px (sentuh); sidebar: 40px. */
  size?: "sheet" | "sidebar";
  /** Grid dua kolom (budget di sheet) atau satu kolom (budget di sidebar); bawaan: membungkus. */
  layout?: "wrap" | "grid-2" | "stack";
  className?: string;
};

/** Chip pilihan tunggal (DESIGN 4.7): pill, terpilih = border brand-600 + bg brand-50 + teks brand-700. */
export function ChoiceChips({ labelledBy, options, onSelect, size = "sheet", layout = "wrap", className }: ChipsProps) {
  const itemProps = useRovingRadio(options);

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn(
        layout === "grid-2" ? "grid grid-cols-2 gap-2" : layout === "stack" ? "flex flex-col gap-2" : "flex flex-wrap gap-2",
        className,
      )}
    >
      {options.map((option, position) => (
        <button
          key={option.value ?? "__all"}
          type="button"
          role="radio"
          aria-checked={option.selected}
          aria-disabled={option.disabled || undefined}
          aria-label={accessibleName(option)}
          {...itemProps(position)}
          onClick={() => {
            if (!option.disabled && !option.selected) onSelect(option.value);
          }}
          className={cn(
            chipClass(option.selected, option.disabled, size),
            layout === "wrap" ? "max-w-full" : "w-full",
            layout === "stack" && "justify-between",
          )}
        >
          <span className="truncate">{option.label}</span>
          {option.count !== undefined ? (
            <span
              className={cn(
                "shrink-0 text-sm font-medium tabular-nums",
                option.selected ? "text-brand-700" : option.disabled ? "text-muted" : "text-ink-2",
              )}
            >
              ({option.count})
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/** Kelas chip bersama (pilihan tunggal dan fasilitas multi-pilih). */
export function chipClass(selected: boolean, disabled: boolean | undefined, size: "sheet" | "sidebar") {
  return cn(
    "inline-flex min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-full border-[1.5px] px-3.5 font-semibold transition-colors duration-150 ease-out",
    size === "sheet" ? "h-11 text-[15px]" : "h-10 text-sm",
    selected
      ? "border-brand-600 bg-brand-50 text-brand-700"
      : disabled
        ? "cursor-not-allowed border-line bg-surface text-muted"
        : "border-line bg-white text-ink hover:border-subtle hover:bg-surface",
  );
}

type ListProps = {
  label: string;
  options: Choice[];
  onSelect: (value: string | null) => void;
};

/** Daftar pilihan 56px (sheet urutkan): terpilih brand-50 + ikon centang. */
export function ChoiceList({ label, options, onSelect }: ListProps) {
  const itemProps = useRovingRadio(options);

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-1">
      {options.map((option, position) => (
        <button
          key={option.value ?? "__all"}
          type="button"
          role="radio"
          aria-checked={option.selected}
          {...itemProps(position)}
          onClick={() => onSelect(option.value)}
          className={cn(
            "flex h-14 w-full shrink-0 items-center gap-3 rounded-control px-3 text-left transition-colors duration-150 ease-out focus-visible:outline-offset-[-2px]",
            option.selected ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-surface-2",
          )}
        >
          <span className="min-w-0 flex-1 truncate text-base leading-6 font-semibold">{option.label}</span>
          <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
            {option.selected ? <Check className="size-5 text-brand-600" /> : null}
          </span>
        </button>
      ))}
    </div>
  );
}
