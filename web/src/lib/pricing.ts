// Harga unit. Rumus estimasi WAJIB sama dengan fungsi DB public.submit_lead (PRD 6.5).

export type PriceFields = {
  normal_price: number;
  promo_price: number;
  is_promo_active: boolean;
};

export type RateFields = {
  effective_price: number;
  weekly_price: number | null;
  monthly_price: number | null;
};

/** Sama dengan kolom generated `units.effective_price`. */
export function effectivePrice(unit: PriceFields): number {
  return unit.is_promo_active && unit.promo_price > 0 ? unit.promo_price : unit.normal_price;
}

/** Harga coret: hanya kalau promo aktif dan harga normal lebih tinggi. */
export function strikePrice(unit: PriceFields): number | null {
  if (unit.is_promo_active && unit.promo_price > 0 && unit.normal_price > unit.promo_price) {
    return unit.normal_price;
  }
  return null;
}

/** Diskon dalam persen bulat (sama dengan accessor `discount_percent` situs lama, ditambah syarat promo aktif). */
export function discountPercent(unit: PriceFields): number {
  const strike = strikePrice(unit);
  if (strike === null) return 0;
  return Math.round(((strike - unit.promo_price) / strike) * 100);
}

export type RateKind = "harian" | "mingguan" | "bulanan";

export type Estimate = { total: number; nights: number; rate: RateKind };

/**
 * Estimasi total menginap (sama persis dengan submit_lead):
 * - malam >= 30 dan ada harga bulanan → round(bulanan × malam / 30)
 * - malam >= 7 dan ada harga mingguan → round(mingguan × malam / 7)
 * - selain itu → harga efektif per malam × malam
 */
export function estimateTotal(unit: RateFields, nights: number): Estimate {
  if (nights >= 30 && unit.monthly_price != null) {
    return { total: Math.round((unit.monthly_price * nights) / 30), nights, rate: "bulanan" };
  }
  if (nights >= 7 && unit.weekly_price != null) {
    return { total: Math.round((unit.weekly_price * nights) / 7), nights, rate: "mingguan" };
  }
  return { total: unit.effective_price * nights, nights, rate: "harian" };
}

export type PriceBadge = { kind: "custom" | "discount"; label: string };

const MIN_DISCOUNT_FOR_BADGE = 5;
const MAX_CUSTOM_BADGE_LENGTH = 24;

/** Label promo kustom dianggap layak kalau tanpa angka persen, pendek, dan bukan teks bawaan lama. */
export function isUsableCustomBadge(badge: string | null | undefined): badge is string {
  if (!badge) return false;
  const text = badge.trim();
  if (!text || text.length > MAX_CUSTOM_BADGE_LENGTH) return false;
  if (/\d+\s*%/.test(text)) return false;
  if (/^promo\s+spesial$/i.test(text)) return false;
  return true;
}

/**
 * Badge di kartu/detail:
 * - label kustom (promo aktif, tanpa persen, <= 24 karakter, bukan "Promo Spesial")
 * - kalau tidak, "Hemat X%" bila diskon >= 5%
 */
export function badgeFor(unit: PriceFields & { promo_badge: string | null }): PriceBadge | null {
  if (!unit.is_promo_active) return null;
  if (isUsableCustomBadge(unit.promo_badge)) return { kind: "custom", label: unit.promo_badge.trim() };
  const discount = discountPercent(unit);
  if (discount >= MIN_DISCOUNT_FOR_BADGE) return { kind: "discount", label: `Hemat ${discount}%` };
  return null;
}
