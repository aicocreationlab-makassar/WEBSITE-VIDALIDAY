"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import { formatRupiah } from "@/lib/format";
import { PRICE_STEP } from "@/lib/search-index";
import { cn } from "@/lib/utils";

type Props = {
  bounds: { min: number; max: number };
  value: { min: number; max: number };
  onChange: (min: number | null, max: number | null) => void;
};

/**
 * Slider harga dua titik (langkah Rp50.000) di "Atur sendiri" budget hero. Modul terpisah supaya
 * Radix Slider baru diunduh saat panel budget dibuka (BudgetField).
 */
export function BudgetSlider({ bounds, value, onChange }: Props) {
  return (
    <SliderPrimitive.Root
      min={bounds.min}
      max={bounds.max}
      step={PRICE_STEP}
      value={[value.min, value.max]}
      onValueChange={(values) => onChange(values[0] ?? null, values[1] ?? null)}
      className="relative flex h-11 w-full touch-none items-center select-none"
    >
      <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-line">
        <SliderPrimitive.Range className="absolute h-full bg-brand-600" />
      </SliderPrimitive.Track>
      {/* Nama thumb sengaja beda dari label input supaya "Minimum"/"Maksimum" unik. */}
      <SliderPrimitive.Thumb aria-label="Batas bawah harga" aria-valuetext={formatRupiah(value.min)} className={thumbClass} />
      <SliderPrimitive.Thumb aria-label="Batas atas harga" aria-valuetext={formatRupiah(value.max)} className={thumbClass} />
    </SliderPrimitive.Root>
  );
}

const thumbClass = cn(
  "relative block size-6 rounded-full border-2 border-brand-600 bg-white shadow-card transition-[box-shadow] duration-150 ease-out",
  // Area sentuh 44px.
  "after:absolute after:-inset-2.5 after:rounded-full after:content-['']",
  "hover:shadow-card-hover active:shadow-card-hover",
);
