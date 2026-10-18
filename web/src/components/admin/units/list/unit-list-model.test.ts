import { describe, expect, it } from "vitest";
import { EMPTY_ADMIN_FILTER, type AdminUnitFilter, type AdminUnitRow } from "@/lib/admin/unit-query";
import { quickPriceSchema } from "@/lib/validation/admin";
import {
  activeChip,
  bulkMessage,
  chipChanges,
  duplicateName,
  duplicateSlug,
  EMPTY_PANEL,
  freshSelection,
  hasActiveFilters,
  isPromoEligible,
  issuesToFieldErrors,
  pageSelectionState,
  panelChanges,
  panelFilterCount,
  panelFromFilter,
  pricePreviewText,
  QUICK_CHIPS,
  roomTypeTarget,
  setPageSelected,
  toggleSelected,
  unitSubline,
} from "./unit-list-model";

function row(overrides: Partial<AdminUnitRow> = {}): AdminUnitRow {
  return {
    id: 1,
    name: "Studio AT 26X",
    slug: "studio-at-26x",
    tower: "Ashton",
    floorNumber: 26,
    locationId: 1,
    locationShortName: "Vida View",
    hasTowers: true,
    roomTypeId: 11,
    roomTypeName: "Studio",
    maxGuests: 3,
    normalPrice: 300000,
    promoPrice: 280000,
    isPromoActive: true,
    promoBadge: null,
    effectivePrice: 280000,
    isPublished: true,
    isAvailable: true,
    isFeatured: false,
    coverUrl: null,
    updatedAt: "2026-10-01T00:00:00Z",
    flags: [],
    ...overrides,
  };
}

const filter = (overrides: Partial<AdminUnitFilter> = {}): AdminUnitFilter => ({ ...EMPTY_ADMIN_FILTER, ...overrides });

describe("quick chips", () => {
  it("has the six chips in contract order", () => {
    expect(QUICK_CHIPS.map((c) => c.label)).toEqual(["Semua", "Perlu dicek", "Penuh", "Promo aktif", "Draft", "Unggulan"]);
  });

  it("sets its own param and clears the other chip params", () => {
    expect(chipChanges("penuh")).toEqual({ status: null, stok: "penuh", promo: null, unggulan: null, cek: null });
    expect(chipChanges("cek")).toEqual({ status: null, stok: null, promo: null, unggulan: null, cek: "1" });
    expect(chipChanges("semua")).toEqual({ status: null, stok: null, promo: null, unggulan: null, cek: null });
  });

  it("detects the active chip, ignoring search and apartment", () => {
    expect(activeChip(filter())).toBe("semua");
    expect(activeChip(filter({ q: "26x", lokasi: 2 }))).toBe("semua");
    expect(activeChip(filter({ stok: "penuh" }))).toBe("penuh");
    expect(activeChip(filter({ status: "draft" }))).toBe("draft");
    expect(activeChip(filter({ promo: "aktif" }))).toBe("promo");
    expect(activeChip(filter({ unggulan: true }))).toBe("unggulan");
    expect(activeChip(filter({ cek: true }))).toBe("cek");
  });

  it("has no active chip for combinations or values without a chip", () => {
    expect(activeChip(filter({ status: "draft", stok: "penuh" }))).toBeNull();
    expect(activeChip(filter({ status: "tampil" }))).toBeNull();
    expect(activeChip(filter({ promo: "tidak" }))).toBeNull();
  });
});

describe("filter counts", () => {
  it("counts panel filters only", () => {
    expect(panelFilterCount(filter())).toBe(0);
    expect(panelFilterCount(filter({ lokasi: 1, tipe: 2, promo: "aktif", unggulan: true, q: "x" }))).toBe(3);
  });

  it("knows when any filter is active (sort does not count)", () => {
    expect(hasActiveFilters(filter())).toBe(false);
    expect(hasActiveFilters(filter({ urut: "nama", hal: 3 }))).toBe(false);
    expect(hasActiveFilters(filter({ q: "ashton" }))).toBe(true);
    expect(hasActiveFilters(filter({ cek: true }))).toBe(true);
    expect(hasActiveFilters(filter({ stok: "penuh" }))).toBe(true);
  });

  it("turns panel values into URL changes", () => {
    const panel = panelFromFilter(filter({ lokasi: 2, tipe: 5, status: "tampil", urut: "termurah", q: "abc" }));
    expect(panelChanges(panel)).toEqual({ lokasi: 2, tipe: 5, status: "tampil", stok: null, promo: null, urut: "termurah" });
    expect(panelChanges({ ...EMPTY_PANEL, tipe: 5 })).toEqual({
      lokasi: null,
      tipe: null,
      status: null,
      stok: null,
      promo: null,
      urut: null,
    });
  });
});

describe("pricePreviewText", () => {
  it("shows the promo price, strike price and discount badge", () => {
    expect(pricePreviewText({ normalPrice: 300000, promoPrice: 280000, isPromoActive: true })).toBe(
      "Tamu melihat: Rp280.000/malam, coret Rp300.000, Hemat 7%",
    );
  });

  it("shows the normal price when promo is off", () => {
    expect(pricePreviewText({ normalPrice: 300000, promoPrice: 280000, isPromoActive: false })).toBe(
      "Tamu melihat: Rp300.000/malam",
    );
  });

  it("uses a usable custom badge instead of the percentage", () => {
    expect(pricePreviewText({ normalPrice: 300000, promoPrice: 250000, isPromoActive: true }, "Promo akhir pekan")).toBe(
      "Tamu melihat: Rp250.000/malam, coret Rp300.000, Promo akhir pekan",
    );
    expect(pricePreviewText({ normalPrice: 300000, promoPrice: 250000, isPromoActive: true }, "Diskon 20%")).toBe(
      "Tamu melihat: Rp250.000/malam, coret Rp300.000, Hemat 17%",
    );
  });

  it("drops the badge under 5% but keeps the strike price", () => {
    expect(pricePreviewText({ normalPrice: 300000, promoPrice: 290000, isPromoActive: true })).toBe(
      "Tamu melihat: Rp290.000/malam, coret Rp300.000",
    );
  });

  it("handles incomplete input", () => {
    expect(pricePreviewText({ normalPrice: null, promoPrice: 200000, isPromoActive: true })).toBe(
      "Tamu melihat: harga belum lengkap.",
    );
    expect(pricePreviewText({ normalPrice: 300000, promoPrice: null, isPromoActive: true })).toBe(
      "Tamu melihat: Rp300.000/malam",
    );
  });

  it("always starts with the contract prefix", () => {
    for (const draft of [
      { normalPrice: 1, promoPrice: null, isPromoActive: false },
      { normalPrice: null, promoPrice: null, isPromoActive: false },
    ]) {
      expect(pricePreviewText(draft).startsWith("Tamu melihat:")).toBe(true);
    }
  });
});

describe("quick price validation (shared schema)", () => {
  it("maps zod issues to field errors", () => {
    const parsed = quickPriceSchema.safeParse({ id: 1, normalPrice: 300000, promoPrice: 300000, isPromoActive: true });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(issuesToFieldErrors(parsed.error.issues)).toEqual({
        promoPrice: "Harga promo harus lebih murah dari harga normal.",
      });
    }
  });

  it("accepts a valid edit and an empty promo when promo is off", () => {
    expect(quickPriceSchema.safeParse({ id: 1, normalPrice: 300000, promoPrice: 280000, isPromoActive: true }).success).toBe(true);
    expect(quickPriceSchema.safeParse({ id: 1, normalPrice: 300000, promoPrice: null, isPromoActive: false }).success).toBe(true);
  });
});

describe("bulk rules", () => {
  it("allows promo only when the promo price is set and cheaper", () => {
    expect(isPromoEligible({ normalPrice: 300000, promoPrice: 280000 })).toBe(true);
    expect(isPromoEligible({ normalPrice: 300000, promoPrice: 0 })).toBe(false);
    expect(isPromoEligible({ normalPrice: 300000, promoPrice: 300000 })).toBe(false);
    expect(isPromoEligible({ normalPrice: 300000, promoPrice: 350000 })).toBe(false);
  });

  it("allows changing room type only within one apartment", () => {
    expect(roomTypeTarget([])).toEqual({ ok: false, reason: "empty" });
    expect(roomTypeTarget([{ locationId: 2 }, { locationId: 2 }])).toEqual({ ok: true, locationId: 2 });
    expect(roomTypeTarget([{ locationId: 2 }, { locationId: 3 }])).toEqual({ ok: false, reason: "mixed" });
  });

  it("builds result messages with skipped counts", () => {
    expect(bulkMessage("tersedia", 3)).toBe("3 unit ditandai tersedia.");
    expect(bulkMessage("sembunyi", 1)).toBe("1 unit disembunyikan dari situs.");
    expect(bulkMessage("promo-on", 4, 2)).toBe(
      "Promo aktif di 4 unit. 2 unit dilewati karena harga promo belum diisi atau tidak lebih murah.",
    );
    expect(bulkMessage("ubah-tipe", 2, 0, "2BR Corner")).toBe("Tipe kamar 2 unit diubah ke 2BR Corner.");
  });
});

describe("selection", () => {
  const a = row({ id: 1 });
  const b = row({ id: 2, name: "2BR BV 19V" });
  const c = row({ id: 3 });

  it("toggles one row", () => {
    const once = toggleSelected(new Map(), a);
    expect([...once.keys()]).toEqual([1]);
    expect(toggleSelected(once, a).size).toBe(0);
  });

  it("selects and clears the whole page without touching other pages", () => {
    const other = new Map([[9, row({ id: 9 })]]);
    const all = setPageSelected(other, [a, b], true);
    expect([...all.keys()].sort()).toEqual([1, 2, 9]);
    expect([...setPageSelected(all, [a, b], false).keys()]).toEqual([9]);
  });

  it("reports the page checkbox state", () => {
    expect(pageSelectionState(new Map(), [a, b])).toBe(false);
    expect(pageSelectionState(new Map([[1, a]]), [a, b])).toBe("indeterminate");
    expect(pageSelectionState(new Map([[1, a], [2, b]]), [a, b])).toBe(true);
    expect(pageSelectionState(new Map([[1, a]]), [])).toBe(false);
  });

  it("prefers fresh rows from the current page", () => {
    const stale = new Map([
      [1, a],
      [3, c],
    ]);
    const fresh = freshSelection(stale, [row({ id: 1, isAvailable: false })]);
    expect(fresh.find((r) => r.id === 1)?.isAvailable).toBe(false);
    expect(fresh.map((r) => r.id)).toEqual([1, 3]);
  });
});

describe("row text and duplicate", () => {
  it("builds the mobile subline without empty pieces", () => {
    expect(unitSubline(row())).toBe("Vida View · Studio · lt. 26");
    expect(unitSubline(row({ floorNumber: null }))).toBe("Vida View · Studio · Tower Ashton");
    expect(unitSubline(row({ floorNumber: null, tower: "Tower B" }))).toBe("Vida View · Studio · Tower B");
    expect(unitSubline(row({ floorNumber: null, tower: " ", roomTypeName: null }))).toBe("Vida View");
  });

  it("names the copy and keeps it within 120 characters", () => {
    expect(duplicateName("Studio AT 26X")).toBe("Studio AT 26X (salinan)");
    const long = duplicateName("x".repeat(130));
    expect(long.length).toBe(120);
    expect(long.endsWith(" (salinan)")).toBe(true);
  });

  it("makes a unique slug of at most 80 characters", () => {
    expect(duplicateSlug("studio-at-26x", [])).toBe("studio-at-26x-salinan");
    expect(duplicateSlug("studio-at-26x", ["studio-at-26x-salinan"])).toBe("studio-at-26x-salinan-2");
    const long = duplicateSlug("a".repeat(80), ["a".repeat(68) + "-salinan"]);
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long).toMatch(/^a+-salinan-2$/);
  });
});
