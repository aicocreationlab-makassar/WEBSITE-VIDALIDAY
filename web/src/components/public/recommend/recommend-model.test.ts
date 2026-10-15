import { describe, expect, it } from "vitest";
import type { Recommendation, RecentEntry } from "@/lib/recommend";
import { makeUnit } from "@/lib/test-fixtures";
import type { CatalogUnit } from "@/types/domain";
import { SIMILAR_LIMIT, initialOrder, rankSimilar, toRecentEntry } from "./recommend-model";

const current = makeUnit({ id: 1, roomTypeId: 11, category: "studio", effectivePrice: 280000 });

function rec(unit: CatalogUnit, score: number): Recommendation {
  return { unit, score, reason: null };
}

function seen(id: number, l: string, c: RecentEntry["c"], p: number): RecentEntry {
  return { id, slug: `unit-${id}`, l, c, p, v: id, name: `Unit ${id}`, photo: null, place: "" };
}

const ids = (list: Recommendation[]) => list.map((r) => r.unit.id);

const DELFT = { locationId: 2, locationSlug: "delft-cpi", locationShortName: "Delft CPI" } as const;

/** 12 kandidat tahap 1 (urut skor): banyak Studio Vida View, beberapa tipe lain. */
function mixedStage1(): Recommendation[] {
  const units = [
    ...Array.from({ length: 5 }, (_, i) => makeUnit({ id: 10 + i, roomTypeId: 11, effectivePrice: 270000 + i * 5000 })),
    makeUnit({ id: 20, roomTypeId: 12, effectivePrice: 320000 }),
    makeUnit({ id: 21, roomTypeId: 12, effectivePrice: 330000 }),
    makeUnit({ id: 22, ...DELFT, roomTypeId: 21, effectivePrice: 290000 }),
    makeUnit({ id: 23, ...DELFT, roomTypeId: 21, effectivePrice: 300000 }),
    makeUnit({ id: 24, ...DELFT, roomTypeId: 24, category: "3br", maxGuests: 10, effectivePrice: 1200000 }),
    makeUnit({ id: 25, roomTypeId: null, category: "other", effectivePrice: 450000 }),
    makeUnit({ id: 26, ...DELFT, roomTypeId: 22, category: "2br", effectivePrice: 650000 }),
  ];
  return units.map((unit, i) => rec(unit, 90 - i * 3));
}

describe("initialOrder (server render)", () => {
  it("keeps stage-1 order, max 6, and at most 3 units of the exact same room type", () => {
    const order = initialOrder(current, mixedStage1(), []);
    expect(order).toHaveLength(SIMILAR_LIMIT);
    expect(ids(order)).toEqual([10, 11, 12, 20, 21, 22]);
    expect(order.filter((r) => r.unit.roomTypeId === 11)).toHaveLength(3);
  });

  it("treats units without a room type as distinct types", () => {
    const loose = Array.from({ length: 5 }, (_, i) => rec(makeUnit({ id: 40 + i, roomTypeId: null }), 50 - i));
    expect(ids(initialOrder(current, loose, []))).toEqual([40, 41, 42, 43, 44]);
  });

  it("fills up to 3 from the pool: featured in the same apartment first, then the cheapest", () => {
    const only = makeUnit({ id: 30, roomTypeId: 11 });
    const pool = [
      makeUnit({ id: 31, ...DELFT, effectivePrice: 200000 }),
      makeUnit({ id: 32, isFeatured: true, effectivePrice: 500000 }),
      makeUnit({ id: 33, ...DELFT, effectivePrice: 250000 }),
      makeUnit({ id: 34, effectivePrice: 100000, isAvailable: false }),
    ];
    const order = initialOrder(current, [rec(only, 70)], pool);
    expect(ids(order)).toEqual([30, 32, 31]);
    // Unit pelengkap tetap diberi alasan supaya chip bisa tampil.
    expect(order[2].reason).not.toBeNull();
  });

  it("returns nothing when there are no candidates at all", () => {
    expect(initialOrder(current, [], [])).toEqual([]);
  });
});

describe("rankSimilar (after hydration)", () => {
  const stage1 = mixedStage1();
  const initial = initialOrder(current, stage1, []);

  it("matches the server order on a first visit (history empty or only this unit)", () => {
    expect(ids(rankSimilar(current, stage1, [], []))).toEqual(ids(initial));
    const onlyThis = [{ ...toRecentEntry(current), v: 1 }];
    expect(ids(rankSimilar(current, stage1, onlyThis, []))).toEqual(ids(initial));
  });

  it("moves units that match the device profile up", () => {
    const candidates = [
      rec(makeUnit({ id: 50, roomTypeId: 11, effectivePrice: 280000 }), 60),
      rec(makeUnit({ id: 51, roomTypeId: 12, effectivePrice: 300000 }), 58),
      rec(makeUnit({ id: 52, ...DELFT, roomTypeId: 22, category: "2br", effectivePrice: 600000 }), 50),
      rec(makeUnit({ id: 53, roomTypeId: 13, effectivePrice: 320000 }), 45),
    ];
    const history = [seen(900, "delft-cpi", "2br", 580000), seen(901, "delft-cpi", "2br", 620000)];
    expect(ids(initialOrder(current, candidates, []))).toEqual([50, 51, 52, 53]);
    // 52: +6 apartemen, +6 kategori, +4 harga dekat median = 66 → naik ke posisi pertama.
    expect(ids(rankSimilar(current, candidates, history, []))[0]).toBe(52);
  });

  it("pushes already seen units down so the list varies", () => {
    const candidates = [
      rec(makeUnit({ id: 60, roomTypeId: 11 }), 50),
      rec(makeUnit({ id: 61, roomTypeId: 12 }), 48),
      rec(makeUnit({ id: 62, roomTypeId: 13 }), 40),
    ];
    const history = [seen(60, "lain", "3br", 5_000_000)];
    expect(ids(rankSimilar(current, candidates, history, []))).toEqual([61, 60, 62]);
  });

  it("never changes the number of cards, whatever the history (no layout shift)", () => {
    const histories: RecentEntry[][] = [
      [],
      [seen(22, "delft-cpi", "studio", 290000)],
      [seen(24, "delft-cpi", "3br", 1200000), seen(26, "delft-cpi", "2br", 650000)],
      [seen(800, "vida-view", "other", 450000), seen(801, "vida-view", "other", 460000)],
      stage1.map((r) => seen(r.unit.id, r.unit.locationSlug, r.unit.category, r.unit.effectivePrice)),
    ];
    for (const history of histories) {
      const ranked = rankSimilar(current, stage1, history, []);
      expect(ranked).toHaveLength(initial.length);
      expect(ranked.filter((r) => r.unit.roomTypeId === 11).length).toBeLessThanOrEqual(3);
      expect(new Set(ids(ranked)).size).toBe(ranked.length);
    }
  });
});

describe("toRecentEntry", () => {
  it("stores only what the device history needs", () => {
    const unit = makeUnit({
      id: 7,
      slug: "studio-at-26x",
      name: "Studio AT 26X",
      tower: "Ashton",
      floorNumber: 26,
      effectivePrice: 280000,
      photos: ["https://abc.supabase.co/storage/v1/object/public/media/units/1.jpg", "https://abc.supabase.co/x.jpg"],
    });
    expect(toRecentEntry(unit)).toEqual({
      id: 7,
      slug: "studio-at-26x",
      l: "vida-view",
      c: "studio",
      p: 280000,
      name: "Studio AT 26X",
      photo: "https://abc.supabase.co/storage/v1/object/public/media/units/1.jpg",
      place: "Vida View · Tower Ashton lt. 26",
    });
  });

  it("uses null when the unit has no photo", () => {
    expect(toRecentEntry(makeUnit({ id: 8, photos: [] })).photo).toBeNull();
  });
});
