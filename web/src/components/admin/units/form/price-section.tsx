"use client";

import { useController, useWatch } from "react-hook-form";
import { Eye } from "lucide-react";
import { Field } from "@/components/admin/kit/field";
import { FormCard } from "@/components/admin/kit/form-card";
import { RupiahInput } from "@/components/admin/kit/rupiah-input";
import { Input } from "@/components/ui/input";
import { effectivePrice } from "@/lib/pricing";
import { PROMO_BADGE_MAX } from "@/lib/validation/admin";
import { NoteText, SwitchRow, WarningBox, useUnitFormContext } from "./form-bits";
import { promoBadgeNote, promoPriceNote, rateNote, unitPricePreview } from "./unit-form-model";

type Props = {
  /** Label promo lama > 24 karakter yang tidak ditampilkan (form ubah). */
  legacyBadge: string | null;
  /** Periode sewa lama yang bukan per malam (mis. "Bulan"), kalau ada. */
  legacyPeriod: string | null;
};

/**
 * Kartu "Harga" (PRD 7.4): harga normal, harga promo, switch promo aktif, label promo (maks. 24),
 * harga mingguan/bulanan, dan pratinjau "Tamu melihat: …" yang sama dengan kartu publik.
 */
export function PriceSection({ legacyBadge, legacyPeriod }: Props) {
  const {
    control,
    register,
    formState: { errors },
  } = useUnitFormContext();

  const normal = useController({ control, name: "normalPrice" });
  const promo = useController({ control, name: "promoPrice" });
  const promoActive = useController({ control, name: "isPromoActive" });
  const weekly = useController({ control, name: "weeklyPrice" });
  const monthly = useController({ control, name: "monthlyPrice" });
  const promoBadge = useWatch({ control, name: "promoBadge" }) ?? "";

  const prices = {
    normalPrice: normal.field.value ?? null,
    promoPrice: promo.field.value ?? null,
    isPromoActive: Boolean(promoActive.field.value),
    promoBadge,
  };
  const nightly = effectivePrice({
    normal_price: prices.normalPrice ?? 0,
    promo_price: prices.promoPrice ?? 0,
    is_promo_active: prices.isPromoActive,
  });
  const badgeNote = promoBadgeNote(promoBadge);
  // Harga normal kosong → pesan yang jelas (zod hanya tahu "Isi dengan angka.").
  const normalError = errors.normalPrice
    ? normal.field.value == null
      ? "Isi harga normal per malam."
      : errors.normalPrice.message
    : undefined;

  return (
    <FormCard
      id="harga"
      title="Harga"
      description="Harga per malam, promo, dan tarif mingguan atau bulanan."
      columns={2}
      className="scroll-mt-20"
    >
      {legacyPeriod ? (
        <WarningBox className="md:col-span-2">
          Data lama mencatat harga unit ini per {legacyPeriod.toLowerCase()}. Pastikan harga di bawah adalah harga
          per malam; setelah disimpan, unit dihitung per malam.
        </WarningBox>
      ) : null}

      <Field label="Harga normal per malam" required error={normalError}>
        <RupiahInput
          name={normal.field.name}
          value={normal.field.value}
          onChange={(value) => normal.field.onChange(value ?? undefined)}
          onBlur={normal.field.onBlur}
          placeholder="300.000"
        />
      </Field>

      <Field
        label="Harga promo per malam"
        error={errors.promoPrice?.message}
        hint={<NoteText note={promoPriceNote(prices)} />}
      >
        <RupiahInput
          name={promo.field.name}
          value={promo.field.value}
          onChange={promo.field.onChange}
          onBlur={promo.field.onBlur}
          placeholder="280.000"
        />
      </Field>

      <SwitchRow
        label="Promo aktif"
        description="Tamu membayar harga promo dan harga normal tampil dicoret."
        checked={prices.isPromoActive}
        onCheckedChange={(checked) => promoActive.field.onChange(checked)}
        onBlur={promoActive.field.onBlur}
        className="rounded-control border border-line px-3.5 md:self-start"
      />

      <Field
        label="Label promo"
        error={errors.promoBadge?.message}
        aside={`${promoBadge.length}/${PROMO_BADGE_MAX}`}
        hint={
          badgeNote ? (
            <NoteText note={{ tone: "warning", text: badgeNote }} />
          ) : (
            "Kosongkan untuk label otomatis Hemat X%."
          )
        }
      >
        <Input
          {...register("promoBadge")}
          maxLength={PROMO_BADGE_MAX}
          autoComplete="off"
          placeholder="mis. Promo akhir pekan"
        />
      </Field>

      {legacyBadge ? (
        <WarningBox className="md:col-span-2">
          Label lama: &ldquo;{legacyBadge}&rdquo; (lebih dari 24 karakter, tidak ditampilkan). Tulis label pendek atau
          biarkan kosong.
        </WarningBox>
      ) : null}

      <p
        aria-live="polite"
        className="flex items-start gap-2.5 rounded-control bg-surface px-3.5 py-3 text-sm font-medium text-ink-2 md:col-span-2"
      >
        <Eye className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
        <span>{unitPricePreview(prices)}</span>
      </p>

      <Field
        label="Harga per minggu"
        error={errors.weeklyPrice?.message}
        hint={<NoteText note={rateNote(weekly.field.value, 7, nightly)} />}
      >
        <RupiahInput
          name={weekly.field.name}
          value={weekly.field.value}
          onChange={weekly.field.onChange}
          onBlur={weekly.field.onBlur}
          placeholder="Opsional"
        />
      </Field>

      <Field
        label="Harga per bulan"
        error={errors.monthlyPrice?.message}
        hint={<NoteText note={rateNote(monthly.field.value, 30, nightly)} />}
      >
        <RupiahInput
          name={monthly.field.name}
          value={monthly.field.value}
          onChange={monthly.field.onChange}
          onBlur={monthly.field.onBlur}
          placeholder="Opsional"
        />
      </Field>
    </FormCard>
  );
}
