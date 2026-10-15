"use client";

import { useId, useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type RadioOption = {
  /** null = opsi "Semua …". */
  value: string | null;
  label: string;
  /** Teks kanan, mis. "9 unit" atau "belum tersedia". */
  note?: string;
  disabled?: boolean;
};

type Props = {
  /** Nama grup untuk screen reader, mis. "Tipe kamar". */
  label: string;
  options: RadioOption[];
  value: string | null;
  onSelect: (value: string | null) => void;
  className?: string;
};

/**
 * Daftar pilihan tunggal di sheet/popover hero (DESIGN 4.2): baris 56px (48px di popover desktop),
 * opsi terpilih brand-50 + ikon centang, opsi nonaktif abu-abu dan tidak bisa dipilih.
 * Keyboard: Tab masuk ke opsi terpilih, panah/Home/End memindah fokus (melewati yang nonaktif),
 * Enter/Spasi memilih. Panah tidak langsung memilih karena memilih menutup sheet.
 */
export function OptionRadioGroup({ label, options, value, onSelect, className }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  const selectedIndex = options.findIndex((option) => option.value === value);
  const firstEnabled = options.findIndex((option) => !option.disabled);
  const tabStop = selectedIndex >= 0 ? selectedIndex : firstEnabled;

  function move(from: number, step: 1 | -1 | "first" | "last") {
    const enabled = options.flatMap((option, index) => (option.disabled ? [] : [index]));
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

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const keys: Record<string, 1 | -1 | "first" | "last"> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
      Home: "first",
      End: "last",
    };
    const step = keys[event.key];
    if (step === undefined) return;
    event.preventDefault();
    move(index, step);
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-col gap-1", className)}>
      {options.map((option, index) => {
        const selected = index === selectedIndex;
        const labelId = `${baseId}-label-${index}`;
        const noteId = `${baseId}-note-${index}`;
        return (
          <button
            key={option.value ?? "__all"}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={option.disabled || undefined}
            // Nama = label opsi saja; jumlah unit dibacakan sebagai deskripsi.
            aria-labelledby={labelId}
            aria-describedby={option.note ? noteId : undefined}
            tabIndex={index === tabStop ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, index)}
            onClick={() => {
              if (!option.disabled) onSelect(option.value);
            }}
            className={cn(
              "flex h-14 w-full shrink-0 items-center gap-3 rounded-control px-3 text-left transition-colors duration-150 ease-out focus-visible:outline-offset-[-2px] md:h-12",
              selected
                ? "bg-brand-50 text-brand-700"
                : option.disabled
                  ? "cursor-not-allowed text-muted"
                  : "text-ink hover:bg-surface-2",
            )}
          >
            <span id={labelId} className="min-w-0 flex-1 truncate text-base leading-6 font-semibold">
              {option.label}
            </span>
            {option.note ? (
              <span
                id={noteId}
                className={cn(
                  "shrink-0 text-sm leading-5 font-medium tabular-nums",
                  selected ? "text-brand-700" : option.disabled ? "text-muted" : "text-ink-2",
                )}
              >
                {option.note}
              </span>
            ) : null}
            <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
              {selected ? <Check className="size-5 text-brand-600" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
