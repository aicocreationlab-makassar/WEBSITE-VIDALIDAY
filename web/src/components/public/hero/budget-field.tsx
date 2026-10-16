"use client";

import { useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, SlidersHorizontal, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUDGET_PRESETS, budgetLabel, type BudgetRange } from "@/lib/budget";
import { formatRupiah } from "@/lib/format";
import type { SearchIndexRow } from "@/types/domain";
import { HeroField } from "./hero-field";
import {
  budgetOptions,
  countInRange,
  draftFromRange,
  formatRupiahInput,
  heroPriceBounds,
  isCustomBudget,
  normalizeDraft,
  parseRupiahInput,
  rangeFromDraft,
  selectedPresetId,
  type BudgetDraft,
  type HeroState,
} from "./hero-model";
import { OptionRadioGroup } from "./option-radio-group";

// Radix Slider baru diunduh saat panel budget dibuka (lihat handleOpenChange); selama termuat,
// tempatnya diisi kotak setinggi slider (44px) supaya isian di bawahnya tidak bergeser.
const BudgetSlider = dynamic(() => import("./budget-slider").then((mod) => mod.BudgetSlider), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="h-11" />,
});

function preloadSlider() {
  void import("./budget-slider");
}

type Props = {
  /** Baris indeks hero (hanya unit tersedia). */
  index: SearchIndexRow[];
  scope: Pick<HeroState, "lokasi" | "tipe">;
  /** "Vida View" / "Vida View, Studio" / "semua apartemen" untuk deskripsi sheet. */
  scopeLabel: string;
  budget: BudgetRange;
  onChange: (budget: BudgetRange) => void;
  isDesktop: boolean;
};

/**
 * Field "Budget per malam": pilihan cepat dengan jumlah unit, lalu "Atur sendiri"
 * (slider dua titik langkah Rp50.000 + input Minimum/Maksimum + "Terapkan"). PRD 6.2, UX 2.1.
 */
export function BudgetField({ index, scope, scopeLabel, budget, onChange, isDesktop }: Props) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState<BudgetDraft>({ min: null, max: null });
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const minId = useId();
  const maxId = useId();

  const bounds = heroPriceBounds(index, scope.lokasi);
  const options = budgetOptions(index, scope);
  const applied = bounds ? rangeFromDraft(draft, bounds) : null;
  const draftCount = applied ? countInRange(index, scope, applied) : 0;
  const slider = bounds ? normalizeDraft(draft, bounds) : null;

  function handleOpenChange(next: boolean) {
    if (next) {
      if (bounds) preloadSlider();
      // Rentang kustom yang aktif langsung tampil terbuka; draft selalu mulai dari nilai aktif.
      setCustomOpen(bounds !== null && isCustomBudget(budget));
      if (bounds) setDraft(draftFromRange(budget, bounds));
    }
    setOpen(next);
  }

  function selectPreset(id: string | null) {
    const preset = BUDGET_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    onChange({ min: preset.min, max: preset.max });
    setOpen(false);
  }

  function toggleCustom() {
    if (!bounds) return;
    if (!customOpen) {
      setDraft(draftFromRange(budget, bounds));
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: "nearest" }));
    }
    setCustomOpen(!customOpen);
  }

  function commitInputs() {
    if (bounds) setDraft(normalizeDraft(draft, bounds));
  }

  function apply() {
    if (!applied) return;
    onChange(applied);
    setOpen(false);
  }

  const terapkan =
    customOpen && bounds ? (
      <Button type="button" size="lg" className="w-full" onClick={apply}>
        Terapkan
      </Button>
    ) : undefined;

  return (
    <HeroField
      icon={Wallet}
      label="Budget per malam"
      value={budgetLabel(budget)}
      testId="hero-budget-trigger"
      title="Budget per malam"
      description={`Jumlah unit tersedia di ${scopeLabel}`}
      open={open}
      onOpenChange={handleOpenChange}
      isDesktop={isDesktop}
      footer={terapkan}
    >
      <OptionRadioGroup
        label="Budget per malam"
        options={options}
        value={selectedPresetId(budget)}
        onSelect={selectPreset}
      />

      {bounds && slider ? (
        <div className="mt-2 border-t border-line pt-2">
          <button
            type="button"
            aria-expanded={customOpen}
            aria-controls={panelId}
            onClick={toggleCustom}
            className="group flex h-12 w-full items-center gap-3 rounded-control px-3 text-left text-base font-semibold text-brand-700 transition-colors duration-150 ease-out hover:bg-brand-50 focus-visible:outline-offset-[-2px]"
          >
            <SlidersHorizontal className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">Atur sendiri</span>
            <ChevronDown
              className="size-5 shrink-0 transition-transform duration-150 ease-out group-aria-expanded:rotate-180"
              aria-hidden="true"
            />
          </button>

          <div ref={panelRef} id={panelId} hidden={!customOpen} className="px-3 pt-1 pb-2">
            {customOpen ? (
              <div className="flex flex-col gap-4">
                <BudgetSlider
                  bounds={bounds}
                  value={slider}
                  onChange={(min, max) => setDraft({ min, max })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <Label htmlFor={minId}>Minimum</Label>
                    <Input
                      id={minId}
                      inputMode="numeric"
                      autoComplete="off"
                      enterKeyHint="done"
                      value={formatRupiahInput(draft.min)}
                      placeholder={formatRupiah(bounds.min)}
                      onChange={(event) => setDraft({ ...draft, min: parseRupiahInput(event.target.value) })}
                      onBlur={commitInputs}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          apply();
                        }
                      }}
                      className="tabular-nums"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <Label htmlFor={maxId}>Maksimum</Label>
                    <Input
                      id={maxId}
                      inputMode="numeric"
                      autoComplete="off"
                      enterKeyHint="done"
                      value={formatRupiahInput(draft.max)}
                      placeholder={formatRupiah(bounds.max)}
                      onChange={(event) => setDraft({ ...draft, max: parseRupiahInput(event.target.value) })}
                      onBlur={commitInputs}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          apply();
                        }
                      }}
                      className="tabular-nums"
                    />
                  </div>
                </div>

                <p aria-live="polite" aria-atomic="true" className="text-sm font-medium text-ink-2">
                  {draftCount ? (
                    <>
                      <strong className="font-bold text-ink tabular-nums">{draftCount} unit</strong>
                      {" dalam rentang ini"}
                    </>
                  ) : (
                    "Tidak ada unit dalam rentang ini"
                  )}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </HeroField>
  );
}
