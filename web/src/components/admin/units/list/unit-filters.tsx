"use client";

import { useState } from "react";
import { ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { Field, NativeSelect } from "@/components/admin/kit/field";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  focusSheetContainer,
} from "@/components/ui/sheet";
import type { AdminLocationOption } from "@/lib/data/admin/units";
import { cn } from "@/lib/utils";
import {
  EMPTY_PANEL,
  PROMO_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  STOCK_OPTIONS,
  type PanelFilter,
} from "./unit-list-model";

type Change = Partial<Record<keyof PanelFilter, string | number | null>>;

function toId(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function locationLabel(location: AdminLocationOption): string {
  return location.isActive ? location.name : `${location.name} (nonaktif)`;
}

function roomTypesOf(locations: AdminLocationOption[], lokasi: number | null) {
  return locations.find((location) => location.id === lokasi)?.roomTypes ?? [];
}

type SelectsProps = {
  value: PanelFilter;
  locations: AdminLocationOption[];
  onChange: (changes: Change) => void;
};

/**
 * Select filter dalam satu baris (desktop). Tiap perubahan langsung ke URL.
 * Tanpa label terlihat: opsi pertama ("Semua apartemen", dst.) berfungsi sebagai label, plus aria-label.
 */
export function InlineFilters({ value, locations, onChange }: SelectsProps) {
  const types = roomTypesOf(locations, value.lokasi);
  const active = "font-semibold ring-2 ring-brand-200";
  const select = "h-11 w-auto max-w-60 text-[15px]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Apartemen"
        className={cn(select, value.lokasi && active)}
        value={value.lokasi ?? ""}
        onChange={(event) => onChange({ lokasi: toId(event.target.value), tipe: null })}
      >
        <option value="">Semua apartemen</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {locationLabel(location)}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Tipe kamar"
        className={cn(select, value.tipe && active)}
        value={value.tipe ?? ""}
        disabled={!value.lokasi}
        title={value.lokasi ? undefined : "Pilih apartemen dulu"}
        onChange={(event) => onChange({ tipe: toId(event.target.value) })}
      >
        <option value="">{value.lokasi ? "Semua tipe kamar" : "Tipe kamar"}</option>
        {types.map((type) => (
          <option key={type.id} value={type.id}>
            {type.isActive ? type.name : `${type.name} (nonaktif)`}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Status"
        className={cn(select, value.status && active)}
        value={value.status ?? ""}
        onChange={(event) => onChange({ status: event.target.value || null })}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Ketersediaan"
        className={cn(select, value.stok && active)}
        value={value.stok ?? ""}
        onChange={(event) => onChange({ stok: event.target.value || null })}
      >
        {STOCK_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Promo"
        className={cn(select, value.promo && active)}
        value={value.promo ?? ""}
        onChange={(event) => onChange({ promo: event.target.value || null })}
      >
        {PROMO_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
      <div className="relative">
        <ArrowUpDown className="pointer-events-none absolute top-1/2 left-3 z-[1] size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <NativeSelect
          aria-label="Urutkan"
          className={cn(select, "pl-9")}
          value={value.urut}
          onChange={(event) => onChange({ urut: event.target.value === "diubah" ? null : event.target.value })}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}

type SheetProps = {
  value: PanelFilter;
  locations: AdminLocationOption[];
  count: number;
  onApply: (panel: PanelFilter) => void;
  /** true di tablet: sheet dari kanan; selain itu bottom sheet. */
  side: "bottom" | "right";
};

/** Tombol "Filter" (badge jumlah filter) yang membuka sheet berisi filter + urutan (HP/tablet). */
export function FilterSheet({ value, locations, count, onApply, side }: SheetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PanelFilter>(value);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value);
        setOpen(next);
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          aria-label={count ? `Filter, ${count} aktif` : "Filter"}
          className={cn("relative h-12 w-12 px-0", count && "border-brand-200 bg-brand-50 text-brand-700")}
        >
          <SlidersHorizontal aria-hidden="true" />
          {count ? (
            <span
              aria-hidden="true"
              className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] leading-5 font-bold text-white"
            >
              {count}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side={side} onOpenAutoFocus={focusSheetContainer}>
        <SheetHeader>
          <SheetTitle>Filter</SheetTitle>
          <SheetDescription>Saring dan urutkan daftar unit.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <FilterFields value={draft} locations={locations} onChange={(changes) => setDraft((d) => applyChange(d, changes))} />
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="secondary" className="flex-1" onClick={() => setDraft(EMPTY_PANEL)}>
            Kosongkan
          </Button>
          <Button
            type="button"
            className="flex-[2]"
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
          >
            Terapkan filter
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Gabungkan perubahan isian ke draft sheet (nilai berasal dari opsi select yang tetap). */
function applyChange(panel: PanelFilter, changes: Change): PanelFilter {
  const merged = { ...panel, ...changes } as PanelFilter;
  return { ...merged, urut: merged.urut || "diubah" };
}

/** Isian filter berlabel (di dalam sheet). */
function FilterFields({ value, locations, onChange }: SelectsProps) {
  const types = roomTypesOf(locations, value.lokasi);
  return (
    <div className="grid gap-4">
      <Field label="Apartemen">
        <NativeSelect
          value={value.lokasi ?? ""}
          onChange={(event) => onChange({ lokasi: toId(event.target.value), tipe: null })}
        >
          <option value="">Semua apartemen</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {locationLabel(location)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Tipe kamar" hint={value.lokasi ? undefined : "Pilih apartemen dulu."}>
        <NativeSelect
          value={value.tipe ?? ""}
          disabled={!value.lokasi}
          onChange={(event) => onChange({ tipe: toId(event.target.value) })}
        >
          <option value="">Semua tipe kamar</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.isActive ? type.name : `${type.name} (nonaktif)`}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <NativeSelect value={value.status ?? ""} onChange={(event) => onChange({ status: event.target.value || null })}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value ? option.label : "Semua"}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Ketersediaan">
          <NativeSelect value={value.stok ?? ""} onChange={(event) => onChange({ stok: event.target.value || null })}>
            {STOCK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value ? option.label : "Semua"}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Promo">
        <NativeSelect value={value.promo ?? ""} onChange={(event) => onChange({ promo: event.target.value || null })}>
          {PROMO_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Urutkan">
        <NativeSelect value={value.urut} onChange={(event) => onChange({ urut: event.target.value })}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </div>
  );
}
