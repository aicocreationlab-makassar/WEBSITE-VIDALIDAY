"use client";

import Image from "next/image";
import { useWatch } from "react-hook-form";
import { ImageOff } from "lucide-react";
import { UnitStatusBadges } from "@/components/admin/kit/status-badge";
import { unitSubline } from "@/components/admin/units/list/unit-list-model";
import type { AdminLocationOption } from "@/lib/data/admin/units";
import { formatRupiah } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { badgeFor, effectivePrice, strikePrice } from "@/lib/pricing";
import { useUnitFormContext } from "./form-bits";
import { findLocation, findRoomType } from "./unit-form-model";

/** Pratinjau langsung kartu unit (desktop): sampul, nama, apartemen · tipe · lantai, harga, dan status. */
export function PreviewCard({ locations }: { locations: AdminLocationOption[] }) {
  const { control } = useUnitFormContext();
  const values = useWatch({ control });
  const location = findLocation(locations, values.locationId);
  const type = findRoomType(location, values.roomTypeId);
  const cover = mediaUrl(values.photos?.[0]);
  const prices = {
    normal_price: values.normalPrice ?? 0,
    promo_price: values.promoPrice ?? 0,
    is_promo_active: Boolean(values.isPromoActive),
    promo_badge: values.promoBadge?.trim() || null,
  };
  const price = effectivePrice(prices);
  const strike = strikePrice(prices);
  const badge = badgeFor(prices);
  const subline = unitSubline({
    locationShortName: location?.shortName ?? "",
    roomTypeName: type?.name ?? null,
    floorNumber: values.floorNumber ?? null,
    tower: values.tower ?? null,
  });

  return (
    <section aria-labelledby="pratinjau-judul" className="glass-card overflow-hidden rounded-card">
      <h2 id="pratinjau-judul" className="sr-only">
        Pratinjau kartu unit
      </h2>
      <div className="relative aspect-[4/3] bg-surface-2">
        {cover ? (
          <Image src={cover} alt="" fill sizes="320px" className="object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-center">
            <ImageOff className="size-7 text-subtle" aria-hidden="true" />
            <span className="text-caption text-muted">Belum ada foto</span>
          </div>
        )}
        {badge ? (
          <span className="absolute top-3 left-3 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-caption font-semibold text-brand-700">
            {badge.label}
          </span>
        ) : null}
      </div>
      <div className="grid gap-2 p-4">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-ink">{values.name?.trim() || "Nama unit"}</p>
          <p className="truncate text-caption text-muted">{subline || "Apartemen · tipe kamar"}</p>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-card font-extrabold text-ink tabular-nums">{price > 0 ? formatRupiah(price) : "Rp–"}</span>
          <span className="text-caption text-muted">/malam</span>
          {strike !== null ? (
            <span className="text-caption text-muted tabular-nums line-through">{formatRupiah(strike)}</span>
          ) : null}
        </p>
        <UnitStatusBadges
          isPublished={Boolean(values.isPublished)}
          isAvailable={Boolean(values.isAvailable)}
          isPromoActive={Boolean(values.isPromoActive)}
          isFeatured={Boolean(values.isFeatured)}
        />
      </div>
    </section>
  );
}
