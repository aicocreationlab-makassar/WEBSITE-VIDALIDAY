import { formatRupiah } from "@/lib/format";
import { badgeFor, strikePrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { CatalogUnit } from "@/types/domain";

type PriceUnit = Pick<CatalogUnit, "normalPrice" | "promoPrice" | "isPromoActive" | "effectivePrice" | "promoBadge">;

export function priceFieldsOf(unit: PriceUnit) {
  return { normal_price: unit.normalPrice, promo_price: unit.promoPrice, is_promo_active: unit.isPromoActive };
}

export function unitBadge(unit: PriceUnit) {
  return badgeFor({ ...priceFieldsOf(unit), promo_badge: unit.promoBadge });
}

export function unitStrikePrice(unit: PriceUnit) {
  return strikePrice(priceFieldsOf(unit));
}

type PriceTagProps = {
  unit: PriceUnit;
  size?: "card" | "detail" | "bar";
  /** Tampilkan harga coret di bawah (kartu) atau di samping (detail). */
  showStrike?: boolean;
  className?: string;
};

/** Harga per malam (ink, 800, tabular) + harga coret muted (DESIGN 3.1, 4.6, 4.8). Harga tidak pernah merah. */
export function PriceTag({ unit, size = "card", showStrike = true, className }: PriceTagProps) {
  const strike = showStrike ? unitStrikePrice(unit) : null;
  const amount =
    size === "detail" ? "text-price-lg md:text-price-xl" : size === "bar" ? "text-price" : "text-price";
  return (
    <div className={cn("min-w-0", className)}>
      <p className="flex items-baseline gap-1 whitespace-nowrap">
        <span className={cn("font-extrabold tracking-tight text-ink tabular-nums", amount)}>
          {formatRupiah(unit.effectivePrice)}
        </span>
        <span className="text-sm font-medium text-muted">/malam</span>
      </p>
      {strike ? (
        <p className="text-caption font-medium text-muted tabular-nums">
          <span className="sr-only">Harga normal </span>
          <s>{formatRupiah(strike)}</s>
        </p>
      ) : null}
    </div>
  );
}
