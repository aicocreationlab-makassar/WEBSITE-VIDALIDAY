"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Field, NativeSelect } from "@/components/admin/kit/field";
import { LEAD_STATUSES } from "@/components/admin/kit/status-badge";
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
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DateRangeFields, DateRangePopover } from "./date-range-filter";
import {
  checkinChanges,
  EMPTY_LEAD_PANEL,
  masukChanges,
  toStatus,
  type LeadPanel,
  type UrlChanges,
} from "./lead-list-model";

type InlineProps = {
  value: LeadPanel;
  apartments: string[];
  onChange: (changes: UrlChanges) => void;
};

/**
 * Filter sebaris (desktop): status, apartemen, rentang tanggal masuk, rentang check-in.
 * Tiap perubahan langsung ke URL. Opsi pertama select berfungsi sebagai label (plus aria-label).
 */
export function InlineLeadFilters({ value, apartments, onChange }: InlineProps) {
  const active = "font-semibold ring-2 ring-brand-200";
  const select = "h-11 w-auto max-w-60 text-[15px]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Status"
        className={cn(select, value.status && active)}
        value={value.status ?? ""}
        onChange={(event) => onChange({ status: toStatus(event.target.value) })}
      >
        <option value="">Semua status</option>
        {LEAD_STATUSES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Apartemen"
        className={cn(select, value.apartemen && active)}
        value={value.apartemen ?? ""}
        onChange={(event) => onChange({ apartemen: event.target.value || null })}
      >
        <option value="">Semua apartemen</option>
        {apartments.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </NativeSelect>
      <DateRangePopover
        kind="masuk"
        label="Tanggal masuk"
        from={value.masukDari}
        to={value.masukSampai}
        onApply={(from, to) => onChange(masukChanges(from, to))}
      />
      <DateRangePopover
        kind="checkin"
        label="Check-in"
        from={value.checkinDari}
        to={value.checkinSampai}
        onApply={(from, to) => onChange(checkinChanges(from, to))}
      />
    </div>
  );
}

type SheetProps = {
  value: LeadPanel;
  apartments: string[];
  count: number;
  onApply: (panel: LeadPanel) => void;
  side: "bottom" | "right";
};

/** Tombol "Filter" (badge jumlah filter aktif) yang membuka sheet berisi semua filter (HP/tablet). */
export function LeadFilterSheet({ value, apartments, count, onApply, side }: SheetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LeadPanel>(value);

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
      <SheetContent side={side} onOpenAutoFocus={(event) => event.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Filter</SheetTitle>
          <SheetDescription>Saring permintaan sewa menurut status, apartemen, dan tanggal.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="grid gap-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <NativeSelect
                  value={draft.status ?? ""}
                  onChange={(event) => setDraft((d) => ({ ...d, status: toStatus(event.target.value) }))}
                >
                  <option value="">Semua</option>
                  {LEAD_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Apartemen">
                <NativeSelect
                  value={draft.apartemen ?? ""}
                  onChange={(event) => setDraft((d) => ({ ...d, apartemen: event.target.value || null }))}
                >
                  <option value="">Semua</option>
                  {apartments.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <DateRangeFields
              kind="masuk"
              label="Tanggal masuk"
              value={{ from: draft.masukDari, to: draft.masukSampai }}
              onChange={(range) => setDraft((d) => ({ ...d, masukDari: range.from, masukSampai: range.to }))}
            />
            <DateRangeFields
              kind="checkin"
              label="Check-in"
              value={{ from: draft.checkinDari, to: draft.checkinSampai }}
              onChange={(range) => setDraft((d) => ({ ...d, checkinDari: range.from, checkinSampai: range.to }))}
            />
          </div>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="secondary" className="flex-1" onClick={() => setDraft(EMPTY_LEAD_PANEL)}>
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
