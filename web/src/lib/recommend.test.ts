import { describe, expect, it } from "vitest";
import { buildProfile, personalize, scoreSimilar, type RecentEntry } from "./recommend";
import { makeUnit, sampleCatalog } from "./test-fixtures";

const catalog = sampleCatalog();
const current = catalog[0]; // Studio AT 26X, Vida View, Rp280.000

describe("scoreSimilar (stage 1)", () => {
  const recs = scoreSimilar(current, catalog);

  it("excludes the current unit and full units", () => {
    const ids = recs.map((r) => r.unit.id);
    expect(ids).not.toContain(current.id);
    expect(ids).not.toContain(4);
  });

  it("ranks same apartment + same type + close price first", () => {
    expect(recs[0].unit.id).toBe(2);
    // 25 (apartemen) + 25 (tipe) + 20*(1-30/280) + 10 (kapasitas) + 10 (fasilitas sama) + 5 (view sama)
    expect(recs[0].score).toBeCloseTo(25 + 25 + 20 * (1 - 30000 / 280000) + 10 + 10 + 5, 5);
  });

  it("gives the same category in another apartment +15 instead of +25", () => {
    const delftStudio = recs.find((r) => r.unit.id === 5)!;
    const delftCorner = recs.find((r) => r.unit.id === 6)!;
    expect(delftStudio.score).toBeGreaterThan(delftCorner.score);
  });

  it("adds popularity relative to the most requested candidate", () => {
    const withPop = scoreSimilar(current, catalog, { 7: 10, 3: 5 });
    const base = scoreSimilar(current, catalog);
    const diff = (id: number) => withPop.find((r) => r.unit.id === id)!.score - base.find((r) => r.unit.id === id)!.score;
    expect(diff(7)).toBeCloseTo(5);
    expect(diff(3)).toBeCloseTo(2.5);
  });

  it("explains each pick", () => {
    expect(recs.find((r) => r.unit.id === 2)!.reason).toEqual({ kind: "cheaper", label: "Lebih hemat Rp30rb" });
    expect(recs.find((r) => r.unit.id === 6)!.reason?.kind).toBe("bigger");
  });
});

describe("personalize (stage 2)", () => {
  const recent: RecentEntry[] = [
    { id: 5, slug: "unit-5", l: "delft-cpi", c: "studio", p: 290000, v: 1, name: "a", photo: null, place: "" },
    { id: 6, slug: "unit-6", l: "delft-cpi", c: "studio", p: 380000, v: 2, name: "b", photo: null, place: "" },
  ];

  it("builds a profile from device history", () => {
    const profile = buildProfile(recent);
    expect(profile.location).toBe("delft-cpi");
    expect(profile.category).toBe("studio");
    expect(profile.medianPrice).toBe(335000);
  });

  it("boosts the profile apartment and penalizes already seen units", () => {
    const stage1 = scoreSimilar(current, catalog);
    const picked = personalize(current, stage1, recent, catalog);
    expect(picked.length).toBeLessThanOrEqual(6);
    const rank = (id: number) => picked.findIndex((p) => p.unit.id === id);
    const stage1Rank = (id: number) => stage1.findIndex((p) => p.unit.id === id);
    expect(rank(5)).toBeLessThanOrEqual(stage1Rank(5));
  });

  it("keeps at most 3 units of the exact same room type", () => {
    const sameType = Array.from({ length: 6 }, (_, i) => makeUnit({ id: 500 + i, roomTypeId: 11 }));
    const pool = [current, ...sameType, ...catalog.slice(1)];
    const picked = personalize(current, scoreSimilar(current, pool), [], pool);
    expect(picked.filter((p) => p.unit.roomTypeId === 11).length).toBeLessThanOrEqual(3);
  });

  it("fills up to 3 with featured units of the same apartment, then the cheapest", () => {
    const lonely = makeUnit({ id: 900, locationId: 9, locationSlug: "baru", roomTypeId: 99, category: "other" });
    const pool = [lonely, makeUnit({ id: 901, locationId: 9, isFeatured: true, effectivePrice: 900000 })];
    const picked = personalize(lonely, [], [], [...pool, ...catalog]);
    expect(picked.length).toBe(3);
    expect(picked[0].unit.id).toBe(901);
  });
});
