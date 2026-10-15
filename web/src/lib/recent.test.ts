import { describe, expect, it } from "vitest";
import { pickFeatured } from "./featured";
import type { RecentEntry } from "./recommend";
import { addRecent, parseRecent, RECENT_MAX } from "./recent";
import { makeUnit, sampleCatalog } from "./test-fixtures";

const entry = (id: number): RecentEntry => ({
  id,
  slug: `u-${id}`,
  l: "vida-view",
  c: "studio",
  p: 280000,
  v: id,
  name: `Unit ${id}`,
  photo: null,
  place: "Vida View",
});

describe("recent history", () => {
  it("parses safely and drops broken entries", () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent("{bukan json")).toEqual([]);
    expect(parseRecent(JSON.stringify([entry(1), { id: "x" }]))).toEqual([entry(1)]);
  });

  it("adds newest first without duplicates and caps at 12", () => {
    let list: RecentEntry[] = [];
    for (let i = 1; i <= 15; i++) list = addRecent(list, entry(i));
    list = addRecent(list, entry(10));
    expect(list).toHaveLength(RECENT_MAX);
    expect(list[0].id).toBe(10);
    expect(list.filter((e) => e.id === 10)).toHaveLength(1);
  });
});

describe("pickFeatured", () => {
  it("fills with the biggest discounts when fewer than 4 featured units exist", () => {
    const picked = pickFeatured(sampleCatalog());
    expect(picked[0].id).toBe(1);
    expect(picked).toHaveLength(4);
    expect(picked.map((u) => u.id)).not.toContain(4); // penuh
    expect(picked.map((u) => u.id)).not.toContain(7); // tanpa foto
  });

  it("caps at 8 featured units", () => {
    const many = Array.from({ length: 10 }, (_, i) => makeUnit({ id: 300 + i, isFeatured: true }));
    expect(pickFeatured(many)).toHaveLength(8);
  });
});
