import Link from "next/link";
import { MapPin } from "lucide-react";
import { PriceTag, unitBadge, unitStrikePrice } from "@/components/public/unit/price";
import { UnitBadges } from "@/components/public/unit/unit-badges";
import { formatRupiah } from "@/lib/format";
import { rateRows } from "@/lib/unit-detail";
import { formatUnitPlace, roomTypeHref } from "@/lib/unit-display";
import { cn } from "@/lib/utils";
import type { CatalogUnit } from "@/types/domain";

/** H1 nama unit (26/32 mobile, 36/44 desktop) + baris lokasi dengan tautan "Lihat peta" (PRD 6.4 no. 3). */
export function UnitTitle({ unit, className }: { unit: CatalogUnit; className?: string }) {
  return (
    <div className={className}>
      <h1 className="text-h1 font-extrabold tracking-tight text-balance text-ink md:text-h1-lg">{unit.name}</h1>
      <p className="mt-2 flex items-start gap-1.5 text-[15px] leading-6 text-ink-2">
        <MapPin className="mt-[3px] size-[18px] shrink-0 text-brand-600" strokeWidth={1.75} aria-hidden="true" />
        <span>
          {formatUnitPlace(unit)}
          <span aria-hidden="true"> · </span>
          <a
            href="#lokasi"
            className="-my-3 inline-block py-3 font-semibold whitespace-nowrap text-brand-700 underline-offset-4 hover:underline"
          >
            Lihat peta
          </a>
        </span>
      </p>
      {unit.roomTypeSlug && unit.roomTypeName ? (
        <p className="mt-1 text-sm text-ink-2">
          Tipe{" "}
          <Link
            href={roomTypeHref(unit.locationSlug, unit.roomTypeSlug)}
            className="-my-3 inline-block py-3 font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            {unit.roomTypeName} di {unit.locationShortName}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Blok harga (PRD 6.4 no. 4, DESIGN 4.8): harga per malam besar (28/34, desktop 32/40),
 * harga coret + badge, baris mingguan/bulanan kalau ada, catatan konfirmasi admin.
 */
export function UnitPriceBlock({ unit, className }: { unit: CatalogUnit; className?: string }) {
  const strike = unitStrikePrice(unit);
  const rates = rateRows(unit);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <PriceTag unit={unit} size="detail" showStrike={false} />
      {strike || !unit.isAvailable || unit.isFeatured || unitBadge(unit) ? (
        <div className="flex flex-wrap items-center gap-2">
          {strike ? (
            <p className="text-base font-medium text-muted tabular-nums">
              <span className="sr-only">Harga normal </span>
              <s>{formatRupiah(strike)}</s>
            </p>
          ) : null}
          <UnitBadges unit={unit} max={3} />
        </div>
      ) : null}
      {rates.length ? (
        <ul className="mt-1 flex flex-col gap-1" aria-label="Harga mingguan dan bulanan">
          {rates.map((rate) => (
            <li key={rate.key} className="flex items-baseline gap-1 text-[15px]">
              <span className="font-bold text-ink tabular-nums">{formatRupiah(rate.amount)}</span>
              <span className="text-sm font-medium text-muted">{rate.suffix}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-caption font-medium text-muted">Harga final dikonfirmasi admin.</p>
    </div>
  );
}
