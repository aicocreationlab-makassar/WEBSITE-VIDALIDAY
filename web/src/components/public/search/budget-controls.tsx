"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BudgetRange } from "@/lib/budget";
import { formatRupiah } from "@/lib/format";
import { PRICE_STEP } from "@/lib/search-index";
import { cn } from "@/lib/utils";
import type { SewaFilter } from "@/lib/validation/filters";
import type { SearchIndexRow } from "@/types/domain";
import { ChoiceChips } from "./choice-group";
import {
  applyBudget,
  budgetOptions,
  clampRange,
  formatRupiahInput,
  isCommittable,
  parseRupiahInput,
  rangeFromValues,
  sliderBounds,
  type PriceBounds,
} from "./filter-model";

type Props = {
  value: SewaFilter;
  onChange: (next: SewaFilter) => void;
  index: SearchIndexRow[];
  /** sheet: perubahan langsung ke draft; sidebar: slider/ketikan ditunda 300ms karena langsung memuat hasil. */
  variant: "sheet" | "sidebar";
  labelledBy: string;
};

const SIDEBAR_DEBOUNCE_MS = 300;

/**
 * Budget per malam di panel filter (PRD 6.3, UX 2.3): pilihan cepat dengan jumlah unit,
 * slider dua titik (langkah Rp50.000, batas dari apartemen terpilih), dan input Minimum/Maksimum.
 * Ketikan hanya dipakai kalau sudah di dalam batas; blur/Enter menjepit nilai ke batas.
 */
export function BudgetControls({ value, onChange, index, variant, labelledBy }: Props) {
  const minId = useId();
  const maxId = useId();
  const customId = useId();
  const debounceMs = variant === "sidebar" ? SIDEBAR_DEBOUNCE_MS : 0;

  /** Posisi slider selama ditunda (sidebar). */
  const [drag, setDrag] = useState<PriceBounds | null>(null);
  /** Nilai input selama diketik (fokus di input). */
  const [typed, setTyped] = useState<BudgetRange | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDown = useRef(false);
  // Commit tertunda selalu memakai filter dan callback terbaru, bukan yang ada saat dijadwalkan.
  const latest = useRef({ value, onChange });
  useEffect(() => {
    latest.current = { value, onChange };
  });
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const bounds = sliderBounds(index, value.lokasi);
  const options = budgetOptions(index, value);
  const applied: BudgetRange = { min: value.min, max: value.max };
  const slider = bounds ? (drag ?? clampRange(typed ?? applied, bounds)) : null;
  const shown: BudgetRange = typed ?? (drag && bounds ? rangeFromValues(drag, bounds) : applied);

  function cancelPending() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function commit(range: BudgetRange) {
    cancelPending();
    setDrag(null);
    const { value: current, onChange: change } = latest.current;
    const limits = sliderBounds(index, current.lokasi);
    const next = applyBudget(current, limits ? rangeFromValues(range, limits) : range);
    if (next.min !== current.min || next.max !== current.max) change(next);
  }

  function schedule(range: BudgetRange) {
    if (debounceMs === 0) {
      commit(range);
      return;
    }
    cancelPending();
    timer.current = setTimeout(() => commit(range), debounceMs);
  }

  function selectPreset(id: string | null) {
    const option = options.find((item) => item.value === id);
    if (!option) return;
    cancelPending();
    setDrag(null);
    setTyped(null);
    onChange(applyBudget(value, { min: option.preset.min, max: option.preset.max }));
  }

  function onSlide(values: number[]) {
    const [min, max] = values;
    if (min === undefined || max === undefined) return;
    setTyped(null);
    if (debounceMs > 0) setDrag({ min, max });
    schedule({ min, max });
  }

  function onType(field: keyof BudgetRange, text: string) {
    if (!bounds) return;
    const parsed = parseRupiahInput(text);
    const next = { ...shown, [field]: parsed };
    setTyped(next);
    if (isCommittable(parsed, bounds)) schedule(next);
  }

  function onTypeDone() {
    if (!typed) return;
    commit(typed);
    setTyped(null);
  }

  const size = variant === "sheet" ? "sheet" : "sidebar";

  return (
    <div className="flex flex-col gap-5">
      <ChoiceChips
        labelledBy={labelledBy}
        options={options}
        onSelect={selectPreset}
        size={size}
        layout={variant === "sheet" ? "grid-2" : "stack"}
      />

      {bounds && slider ? (
        <div role="group" aria-labelledby={customId} className="flex flex-col gap-3">
          <p id={customId} className="text-sm font-semibold text-ink-2">
            Atur sendiri
          </p>
          <SliderPrimitive.Root
            min={bounds.min}
            max={bounds.max}
            step={PRICE_STEP}
            minStepsBetweenThumbs={0}
            value={[slider.min, slider.max]}
            onValueChange={onSlide}
            onPointerDown={() => {
              pointerDown.current = true;
            }}
            onValueCommit={(values) => {
              // Lepas jari/mouse: terapkan sekarang tanpa menunggu jeda. Panah keyboard tetap ditunda
              // supaya beberapa langkah berturut-turut cukup satu kali muat ulang.
              const [min, max] = values;
              const released = pointerDown.current;
              pointerDown.current = false;
              if (released && debounceMs > 0 && min !== undefined && max !== undefined) commit({ min, max });
            }}
            className="relative mx-2.5 flex h-11 touch-none items-center select-none"
          >
            <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-line">
              <SliderPrimitive.Range className="absolute h-full bg-brand-600" />
            </SliderPrimitive.Track>
            {/* Nama thumb beda dari label input supaya "Minimum"/"Maksimum" tetap unik. */}
            <SliderPrimitive.Thumb
              aria-label="Batas bawah harga"
              aria-valuetext={formatRupiah(slider.min)}
              className={thumbClass}
            />
            <SliderPrimitive.Thumb
              aria-label="Batas atas harga"
              aria-valuetext={formatRupiah(slider.max)}
              className={thumbClass}
            />
          </SliderPrimitive.Root>

          {/* Sidebar 240px (md) terlalu sempit untuk dua input berdampingan berisi "Rp1.500.000". */}
          <div className={cn("grid gap-2.5", variant === "sheet" ? "grid-cols-2" : "grid-cols-1 lg:grid-cols-2")}>
            <PriceInput
              id={minId}
              label="Minimum"
              value={shown.min}
              placeholder={formatRupiah(bounds.min)}
              compact={variant === "sidebar"}
              onType={(text) => onType("min", text)}
              onDone={onTypeDone}
            />
            <PriceInput
              id={maxId}
              label="Maksimum"
              value={shown.max}
              placeholder={formatRupiah(bounds.max)}
              compact={variant === "sidebar"}
              onType={(text) => onType("max", text)}
              onDone={onTypeDone}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PriceInput({
  id,
  label,
  value,
  placeholder,
  compact,
  onType,
  onDone,
}: {
  id: string;
  label: string;
  value: number | null;
  placeholder: string;
  compact: boolean;
  onType: (text: string) => void;
  onDone: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        value={formatRupiahInput(value)}
        placeholder={placeholder}
        onChange={(event) => onType(event.target.value)}
        onBlur={onDone}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onDone();
          }
        }}
        className={cn("tabular-nums", compact && "h-11 px-2.5")}
      />
    </div>
  );
}

const thumbClass = cn(
  "relative block size-6 rounded-full border-2 border-brand-600 bg-white shadow-card transition-[box-shadow] duration-150 ease-out",
  // Area sentuh 44px.
  "after:absolute after:-inset-2.5 after:rounded-full after:content-['']",
  "hover:shadow-card-hover active:shadow-card-hover",
);
