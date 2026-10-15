"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/hooks/use-media-query";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { SearchIndexRow } from "@/types/domain";
import { BudgetField } from "./budget-field";
import { HeroField } from "./hero-field";
import {
  budgetEventId,
  findLocation,
  heroHref,
  heroSummary,
  heroSummaryParts,
  hiddenValues,
  initialHeroState,
  lokasiLabel,
  lokasiOptions,
  typeLabel,
  typeOptions,
  usesDropdown,
  withLokasi,
  type HeroLocation,
  type HeroState,
} from "./hero-model";
import { OptionRadioGroup } from "./option-radio-group";

type Props = {
  /** Apartemen terdaftar, urut sort_order (minimal satu). */
  locations: HeroLocation[];
  /** Baris indeks unit tersedia di apartemen tersebut. */
  index: SearchIndexRow[];
};

/**
 * Kotak pencarian hero (PRD 6.2, DESIGN 4.2/4.3, UX 2.1). Tetap berupa
 * `<form method="get" action="/sewa">`: sebelum JavaScript termuat, radio apartemen + tombol
 * "Cari unit" sudah jalan. Input tersembunyi tipe/min/max dinonaktifkan saat kosong, jadi
 * kirim tanpa memilih apa pun → `/sewa?lokasi=<apartemen default>`.
 */
export function HeroSearch({ locations, index }: Props) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<HeroState>(() => initialHeroState(locations));
  const [openField, setOpenField] = useState<"lokasi" | "tipe" | null>(null);

  const dropdown = usesDropdown(locations);
  const location = findLocation(locations, state.lokasi);
  const summary = heroSummaryParts(heroSummary(index, state.lokasi));
  const hidden = hiddenValues(state);
  const scopeName = location?.shortName ?? "semua apartemen";
  const tipeName = location && state.tipe ? typeLabel(location, state.tipe) : null;

  function selectLokasi(lokasi: string | null) {
    setState((current) => withLokasi(current, lokasi));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    track("search_submit", {
      lokasi: state.lokasi,
      tipe: hidden.tipe,
      budget: budgetEventId(state.budget),
    });
    startTransition(() => router.push(heroHref(state)));
  }

  return (
    <form
      method="get"
      action="/sewa"
      role="search"
      aria-label="Cari unit"
      onSubmit={onSubmit}
      className="flex flex-col gap-3 md:gap-4"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-5">
        {dropdown ? (
          <>
            <input type="hidden" name="lokasi" value={state.lokasi ?? ""} disabled={!state.lokasi} />
            <HeroField
              icon={Building2}
              label="Pilih apartemen"
              value={lokasiLabel(locations, state.lokasi)}
              testId="hero-lokasi-trigger"
              title="Pilih apartemen"
              description="Jumlah unit tersedia per apartemen"
              open={openField === "lokasi"}
              onOpenChange={(open) => setOpenField(open ? "lokasi" : null)}
              isDesktop={isDesktop}
              className="md:w-80"
            >
              <OptionRadioGroup
                label="Apartemen"
                options={lokasiOptions(locations, index)}
                value={state.lokasi}
                onSelect={(value) => {
                  selectLokasi(value);
                  setOpenField(null);
                }}
              />
            </HeroField>
          </>
        ) : (
          <fieldset className="min-w-0">
            <legend className="sr-only">Pilih apartemen</legend>
            <div className="flex rounded-control bg-surface-2 p-1 md:inline-flex">
              {locations.map((item) => (
                <label
                  key={item.slug}
                  className={cn(
                    "relative flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-[9px] px-3 text-[15px] leading-5 font-semibold text-ink-2 transition-colors duration-150 ease-out select-none hover:text-ink md:min-w-[132px] md:flex-none md:px-5",
                    "has-[:checked]:bg-brand-600 has-[:checked]:font-bold has-[:checked]:text-white has-[:checked]:shadow-card",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-500",
                  )}
                >
                  <input
                    type="radio"
                    name="lokasi"
                    value={item.slug}
                    checked={state.lokasi === item.slug}
                    onChange={() => selectLokasi(item.slug)}
                    className="sr-only"
                  />
                  <span className="truncate">{item.shortName}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <p
          data-testid="hero-summary"
          aria-live="polite"
          className="flex min-w-0 items-center gap-1.5 text-caption font-medium text-ink-2"
        >
          <Building2 className="size-4 shrink-0 text-subtle" aria-hidden="true" />
          <span className="min-w-0 truncate">
            {summary.lead}
            {summary.price ? (
              <>
                {" · mulai "}
                <strong className="font-bold text-ink tabular-nums">{summary.price}</strong>
                {"/malam"}
              </>
            ) : null}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <HeroField
          icon={BedDouble}
          label="Tipe kamar"
          value={typeLabel(location, state.tipe)}
          testId="hero-type-trigger"
          title="Pilih tipe kamar"
          description={location ? `Unit tersedia di ${location.shortName}` : undefined}
          disabled={!location}
          open={openField === "tipe"}
          onOpenChange={(open) => setOpenField(open ? "tipe" : null)}
          isDesktop={isDesktop}
        >
          <OptionRadioGroup
            label="Tipe kamar"
            options={typeOptions(location, index)}
            value={state.tipe}
            onSelect={(value) => {
              setState((current) => ({ ...current, tipe: value }));
              setOpenField(null);
            }}
          />
        </HeroField>

        <BudgetField
          index={index}
          scope={state}
          scopeLabel={tipeName ? `${scopeName}, ${tipeName}` : scopeName}
          budget={state.budget}
          onChange={(budget) => setState((current) => ({ ...current, budget }))}
          isDesktop={isDesktop}
        />

        <input type="hidden" name="tipe" value={hidden.tipe ?? ""} disabled={hidden.tipe === null} />
        <input type="hidden" name="min" value={hidden.min ?? ""} disabled={hidden.min === null} />
        <input type="hidden" name="max" value={hidden.max ?? ""} disabled={hidden.max === null} />

        <Button type="submit" size="lg" loading={pending} className="w-full md:h-14 md:w-auto md:min-w-40 md:px-8">
          {pending ? null : <Search aria-hidden="true" />}
          Cari unit
        </Button>
      </div>
    </form>
  );
}
