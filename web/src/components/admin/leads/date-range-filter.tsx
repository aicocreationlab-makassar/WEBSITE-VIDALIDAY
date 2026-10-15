"use client";

import { useId, useState } from "react";
import { CalendarRange, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { todayInMakassar } from "@/lib/format";
import { cn } from "@/lib/utils";
import { datePresets, matchingPreset, orderRange, rangeLabel, type DatePreset, type DateRangeKind } from "./lead-list-model";

export type DateRange = { from: string | null; to: string | null };

type FieldsProps = {
  kind: DateRangeKind;
  /** "Tanggal masuk" / "Check-in". */
  label: string;
  value: DateRange;
  onChange: (value: DateRange) => void;
  /** Kalau diisi, preset langsung diterapkan (popover desktop); kalau tidak, preset mengisi draft. */
  onPreset?: (preset: DatePreset) => void;
};

/**
 * Pilihan cepat (Hari ini, 7 hari terakhir, ...) + dua input tanggal asli (picker bawaan HP).
 * Hanya dirender setelah popover/sheet dibuka (klien), jadi "hari ini" WITA aman dari beda hidrasi.
 */
export function DateRangeFields({ kind, label, value, onChange, onPreset }: FieldsProps) {
  const uid = useId();
  const presets = datePresets(kind, todayInMakassar());
  const active = matchingPreset(presets, value.from, value.to);

  return (
    <fieldset className="grid min-w-0 gap-3">
      <legend className="mb-1.5 text-sm leading-5 font-semibold text-ink-2">{label}</legend>
      <div role="group" aria-label={`Pilihan cepat ${label.toLowerCase()}`} className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const selected = active === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              aria-pressed={selected}
              onClick={() => (onPreset ? onPreset(preset) : onChange({ from: preset.from, to: preset.to }))}
              className={cn(
                "inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-brand-500/20",
                selected ? "border-brand-200 bg-brand-50 text-brand-700" : "border-line bg-white text-ink-2 hover:bg-surface-2",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor={`${uid}-dari`} className="text-caption font-semibold text-muted">
            Dari
          </label>
          <Input
            id={`${uid}-dari`}
            type="date"
            value={value.from ?? ""}
            max={value.to ?? undefined}
            onChange={(event) => onChange({ ...value, from: event.target.value || null })}
            className="px-3"
          />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor={`${uid}-sampai`} className="text-caption font-semibold text-muted">
            Sampai
          </label>
          <Input
            id={`${uid}-sampai`}
            type="date"
            value={value.to ?? ""}
            min={value.from ?? undefined}
            onChange={(event) => onChange({ ...value, to: event.target.value || null })}
            className="px-3"
          />
        </div>
      </div>
    </fieldset>
  );
}

type PopoverProps = {
  kind: DateRangeKind;
  label: string;
  from: string | null;
  to: string | null;
  onApply: (from: string | null, to: string | null) => void;
};

/** Tombol filter rentang tanggal (desktop): ringkasan rentang di tombol, isian di popover. */
export function DateRangePopover({ kind, label, from, to, onApply }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>({ from, to });
  const summary = rangeLabel(from, to);

  function apply(next: DateRange) {
    const [dari, sampai] = orderRange(next.from, next.to);
    onApply(dari, sampai);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft({ from, to });
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${summary ?? "semua tanggal"}`}
          className={cn(
            "glass-input inline-flex h-11 max-w-full min-w-0 items-center gap-2 rounded-control px-3.5 text-[15px] text-ink-2 hover:bg-surface",
            summary && "ring-2 ring-brand-200",
          )}
        >
          <CalendarRange className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="shrink-0">{label}</span>
          <span className={cn("truncate", summary ? "font-semibold text-ink" : "text-muted")}>{summary ?? "Semua"}</span>
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,23rem)] gap-4 rounded-card border border-line bg-white p-4 shadow-raised ring-0">
        <DateRangeFields
          kind={kind}
          label={label}
          value={draft}
          onChange={setDraft}
          onPreset={(preset) => apply({ from: preset.from, to: preset.to })}
        />
        <div className="flex gap-2 border-t border-line pt-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={!from && !to && !draft.from && !draft.to}
            onClick={() => apply({ from: null, to: null })}
          >
            Hapus tanggal
          </Button>
          <Button type="button" className="flex-1" onClick={() => apply(draft)}>
            Terapkan
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
