"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  /** Dipanggil setelah pengguna berhenti mengetik (debounce 300ms, PRD 7.4). */
  onSearch: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
  debounceMs?: number;
};

/** Kolom pencarian 48px dengan ikon, tombol hapus, dan debounce. */
export function SearchInput({ value, onSearch, placeholder, label, className, debounceMs = 300 }: Props) {
  const [text, setText] = useState(value);
  const last = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sinkronkan kalau URL berubah dari luar (mis. tombol Reset).
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const schedule = (next: string, delay = debounceMs) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const trimmed = next.trim();
      if (trimmed !== last.current) {
        last.current = trimmed;
        onSearch(trimmed);
      }
    }, delay);
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        type="search"
        enterKeyHint="search"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          schedule(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            schedule(text, 0);
          }
        }}
        className="glass-input h-12 w-full rounded-control pr-11 pl-11 text-base text-ink [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          onClick={() => {
            setText("");
            schedule("", 0);
          }}
          aria-label="Hapus pencarian"
          className="absolute top-1/2 right-1 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-control text-muted hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
