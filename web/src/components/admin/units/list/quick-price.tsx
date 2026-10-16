"use client";

import { useId, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/admin/kit/field";
import { RupiahInput } from "@/components/admin/kit/rupiah-input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  focusSheetContainer,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { updateUnitPrice } from "@/lib/actions/admin/units-list";
import type { AdminUnitRow } from "@/lib/admin/unit-query";
import { formatRupiah } from "@/lib/format";
import { strikePrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { quickPriceSchema } from "@/lib/validation/admin";
import { issuesToFieldErrors, pricePreviewText } from "./unit-list-model";

type Props = {
  row: AdminUnitRow;
  /** true = popover (md ke atas), selain itu bottom sheet. */
  desktop: boolean | null;
  variant: "table" | "card";
};

function rowStrike(row: AdminUnitRow): number | null {
  return strikePrice({ normal_price: row.normalPrice, promo_price: row.promoPrice, is_promo_active: row.isPromoActive });
}

/**
 * Harga per malam yang bisa diklik → "Ubah harga" (PRD 7.4, UX 2.7): harga normal, harga promo,
 * switch promo aktif, pratinjau "Tamu melihat: …", tombol "Simpan harga". Target < 30 detik per unit.
 */
export function QuickPrice({ row, desktop, variant }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const strike = rowStrike(row);

  const trigger = (
    <button
      type="button"
      aria-label={`${formatRupiah(row.effectivePrice)} per malam, ubah harga ${row.name}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={desktop ? undefined : () => setOpen(true)}
      className={cn(
        "group/price flex min-h-11 items-center gap-2 rounded-control text-left transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-brand-500/20 aria-expanded:bg-surface-2",
        variant === "table" ? "-mx-2 px-2 py-1" : "w-full px-2 py-1.5",
      )}
    >
      {variant === "table" ? (
        <span className="flex flex-col leading-tight">
          <span className="text-[15px] font-extrabold text-ink tabular-nums">{formatRupiah(row.effectivePrice)}</span>
          {strike !== null ? (
            <span className="text-caption text-muted tabular-nums line-through">{formatRupiah(strike)}</span>
          ) : (
            <span className="text-caption text-muted">per malam</span>
          )}
        </span>
      ) : (
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <span className="text-card font-extrabold text-ink tabular-nums">{formatRupiah(row.effectivePrice)}</span>
          <span className="text-caption text-muted">/malam</span>
          {strike !== null ? (
            <span className="text-caption text-muted tabular-nums line-through">{formatRupiah(strike)}</span>
          ) : null}
        </span>
      )}
      <span
        className={cn(
          "ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700",
          variant === "table" && "opacity-0 transition-opacity group-hover/price:opacity-100 group-focus-visible/price:opacity-100",
        )}
      >
        <Pencil className="size-4" aria-hidden="true" />
        {variant === "card" ? "Ubah harga" : null}
      </span>
    </button>
  );

  if (desktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="start"
          aria-labelledby={titleId}
          className="w-[340px] gap-0 rounded-card bg-white p-4 text-ink shadow-raised ring-line"
        >
          <h3 id={titleId} className="text-base font-bold text-ink">
            Ubah harga
          </h3>
          <p className="mb-4 truncate text-sm text-muted">{row.name}</p>
          {open ? <QuickPriceForm row={row} onDone={() => setOpen(false)} compact /> : null}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          // HP: jangan langsung buka keyboard; admin memilih isian sendiri.
          onOpenAutoFocus={focusSheetContainer}
        >
          <SheetHeader>
            <SheetTitle>Ubah harga</SheetTitle>
            <SheetDescription className="truncate">{row.name}</SheetDescription>
          </SheetHeader>
          <SheetBody>{open ? <QuickPriceForm row={row} onDone={() => setOpen(false)} /> : null}</SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

function QuickPriceForm({ row, onDone, compact = false }: { row: AdminUnitRow; onDone: () => void; compact?: boolean }) {
  const [normalPrice, setNormalPrice] = useState<number | null>(row.normalPrice > 0 ? row.normalPrice : null);
  const [promoPrice, setPromoPrice] = useState<number | null>(row.promoPrice > 0 ? row.promoPrice : null);
  const [isPromoActive, setPromoActive] = useState(row.isPromoActive);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const switchId = useId();

  const preview = pricePreviewText({ normalPrice, promoPrice, isPromoActive }, row.promoBadge);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = { id: row.id, normalPrice, promoPrice, isPromoActive };
    if (normalPrice === null) {
      setErrors({ normalPrice: "Isi harga normal per malam." });
      return;
    }
    const parsed = quickPriceSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await updateUnitPrice(input);
      if (result.ok) {
        toast.success("Harga disimpan");
        onDone();
      } else {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <Field label="Harga normal per malam" error={errors.normalPrice} required>
        <RupiahInput value={normalPrice} onChange={setNormalPrice} disabled={pending} />
      </Field>
      <Field
        label="Harga promo per malam"
        error={errors.promoPrice}
        hint={isPromoActive ? undefined : "Dipakai saat promo aktif."}
      >
        <RupiahInput value={promoPrice} onChange={setPromoPrice} disabled={pending} />
      </Field>
      <div className="flex min-h-11 items-center justify-between gap-3 rounded-control border border-line px-3.5">
        <label htmlFor={switchId} className="flex-1 py-2.5 text-sm font-semibold text-ink-2">
          Promo aktif
        </label>
        <Switch id={switchId} checked={isPromoActive} onCheckedChange={setPromoActive} disabled={pending} />
      </div>
      <p aria-live="polite" className="rounded-control bg-surface px-3.5 py-2.5 text-sm font-medium text-ink-2">
        {preview}
      </p>
      <Button type="submit" size={compact ? "md" : "lg"} className="w-full" loading={pending}>
        Simpan harga
      </Button>
    </form>
  );
}
