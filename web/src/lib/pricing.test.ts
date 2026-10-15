import { describe, expect, it } from "vitest";
import { badgeFor, discountPercent, effectivePrice, estimateTotal, strikePrice } from "./pricing";

const promo = { normal_price: 300000, promo_price: 280000, is_promo_active: true };

describe("price fields", () => {
  it("uses promo price only when promo is active and positive", () => {
    expect(effectivePrice(promo)).toBe(280000);
    expect(effectivePrice({ ...promo, is_promo_active: false })).toBe(300000);
    expect(effectivePrice({ ...promo, promo_price: 0 })).toBe(300000);
  });

  it("shows a strike price only when the promo is lower", () => {
    expect(strikePrice(promo)).toBe(300000);
    expect(strikePrice({ ...promo, promo_price: 300000 })).toBeNull();
    expect(strikePrice({ ...promo, is_promo_active: false })).toBeNull();
  });

  it("computes the discount percentage", () => {
    expect(discountPercent(promo)).toBe(7);
    expect(discountPercent({ ...promo, is_promo_active: false })).toBe(0);
  });
});

describe("estimateTotal (same formula as submit_lead)", () => {
  const unit = { effective_price: 280000, weekly_price: 1800000, monthly_price: 6500000 };

  it("uses the nightly price below 7 nights", () => {
    expect(estimateTotal(unit, 2)).toEqual({ total: 560000, nights: 2, rate: "harian" });
  });

  it("uses the weekly rate from 7 nights", () => {
    expect(estimateTotal(unit, 10)).toEqual({ total: Math.round((1800000 * 10) / 7), nights: 10, rate: "mingguan" });
  });

  it("uses the monthly rate from 30 nights", () => {
    expect(estimateTotal(unit, 45)).toEqual({ total: 9750000, nights: 45, rate: "bulanan" });
  });

  it("falls back when weekly/monthly prices are missing", () => {
    expect(estimateTotal({ ...unit, monthly_price: null }, 30).rate).toBe("mingguan");
    expect(estimateTotal({ ...unit, weekly_price: null, monthly_price: null }, 30)).toEqual({
      total: 8400000,
      nights: 30,
      rate: "harian",
    });
  });
});

describe("badgeFor", () => {
  it("prefers a short custom label without a percentage", () => {
    expect(badgeFor({ ...promo, promo_badge: "Best Seller" })).toEqual({ kind: "custom", label: "Best Seller" });
  });

  it("ignores stale labels with percentages, long labels and the old default", () => {
    expect(badgeFor({ ...promo, promo_badge: "Hemat 27% (Best Seller)" })).toEqual({
      kind: "discount",
      label: "Hemat 7%",
    });
    expect(badgeFor({ ...promo, promo_badge: "Spesial Keluarga Besar Akhir Tahun" })?.kind).toBe("discount");
    expect(badgeFor({ ...promo, promo_badge: "Promo Spesial" })?.kind).toBe("discount");
  });

  it("hides the badge below 5% or when the promo is off", () => {
    expect(badgeFor({ normal_price: 300000, promo_price: 290000, is_promo_active: true, promo_badge: null })).toBeNull();
    expect(badgeFor({ ...promo, is_promo_active: false, promo_badge: "Best Seller" })).toBeNull();
  });
});
