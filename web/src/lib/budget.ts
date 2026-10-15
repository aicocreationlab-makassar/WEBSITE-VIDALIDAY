// Pilihan cepat budget per malam (PRD 6.2) dan labelnya. Batas inklusif.

import { formatRupiahShort } from "@/lib/format";

export type BudgetRange = { min: number | null; max: number | null };

export type BudgetPreset = BudgetRange & { id: string; label: string };

export const BUDGET_PRESETS: BudgetPreset[] = [
  { id: "semua", label: "Semua harga", min: null, max: null },
  { id: "lt300", label: "Di bawah Rp300rb", min: null, max: 300_000 },
  { id: "300-500", label: "Rp300rb – Rp500rb", min: 300_000, max: 500_000 },
  { id: "500-1jt", label: "Rp500rb – Rp1jt", min: 500_000, max: 1_000_000 },
  { id: "gt1jt", label: "Di atas Rp1jt", min: 1_000_000, max: null },
];

export function presetFor(range: BudgetRange): BudgetPreset | null {
  return BUDGET_PRESETS.find((p) => p.min === range.min && p.max === range.max) ?? null;
}

/** Label nilai aktif di field budget, mis. "Rp300rb – Rp500rb", "Mulai Rp1jt", "Semua harga". */
export function budgetLabel(range: BudgetRange): string {
  const preset = presetFor(range);
  if (preset) return preset.label;
  if (range.min !== null && range.max !== null) {
    return `${formatRupiahShort(range.min)} – ${formatRupiahShort(range.max)}`;
  }
  if (range.min !== null) return `Mulai ${formatRupiahShort(range.min)}`;
  if (range.max !== null) return `Sampai ${formatRupiahShort(range.max)}`;
  return "Semua harga";
}
