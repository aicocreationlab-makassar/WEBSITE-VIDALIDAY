import { describe, expect, it } from "vitest";
import {
  dashboardRanges,
  formatLeadTime,
  makassarDayStart,
  rankPopularUnits,
  summarizeUnits,
} from "./dashboard";

describe("makassarDayStart / dashboardRanges", () => {
  it("builds the WITA day start with a +08:00 offset", () => {
    expect(makassarDayStart("2026-10-16")).toBe("2026-10-16T00:00:00+08:00");
    // 00.00 WITA = 16.00 UTC hari sebelumnya.
    expect(new Date(makassarDayStart("2026-10-16")).toISOString()).toBe("2026-10-15T16:00:00.000Z");
  });

  it("covers the last 7 calendar days including today", () => {
    expect(dashboardRanges("2026-10-16")).toEqual({
      today: "2026-10-16",
      todayStart: "2026-10-16T00:00:00+08:00",
      weekStart: "2026-10-10T00:00:00+08:00",
    });
  });

  it("crosses month and year boundaries", () => {
    expect(dashboardRanges("2027-01-03").weekStart).toBe("2026-12-28T00:00:00+08:00");
  });
});

describe("summarizeUnits", () => {
  const row = (over: Partial<Parameters<typeof summarizeUnits>[0][number]> = {}) => ({
    isPublished: true,
    isAvailable: true,
    isPromoActive: false,
    flags: [] as Parameters<typeof summarizeUnits>[0][number]["flags"],
    ...over,
  });

  it("counts published, full and promo among published units only", () => {
    const stats = summarizeUnits([
      row(),
      row({ isAvailable: false }),
      row({ isPromoActive: true }),
      row({ isPublished: false, isAvailable: false, isPromoActive: true }),
      row({ isPublished: false, flags: ["tanpa-foto"] }),
      row({ flags: ["tanpa-tipe", "tanpa-tower-lantai"] }),
    ]);
    expect(stats).toEqual({ total: 6, published: 4, full: 1, promo: 1, needsCheck: 2 });
  });

  it("returns zeros for an empty list", () => {
    expect(summarizeUnits([])).toEqual({ total: 0, published: 0, full: 0, promo: 0, needsCheck: 0 });
  });
});

describe("rankPopularUnits", () => {
  const units = [
    { id: 1, name: "Studio AT 26X", locationShortName: "Vida View", isPublished: true },
    { id: 2, name: "2BR Corner BV 19V", locationShortName: "Vida View", isPublished: true },
    { id: 3, name: "Studio 1633", locationShortName: "Delft CPI", isPublished: false },
    { id: 4, name: "Studio AT 10A", locationShortName: "Vida View", isPublished: true },
  ];

  it("sorts by lead count desc, then by name, and limits the result", () => {
    const ranked = rankPopularUnits(
      [
        { unit_id: 1, lead_count: 3 },
        { unit_id: 2, lead_count: "7" },
        { unit_id: 3, lead_count: 3 },
        { unit_id: 4, lead_count: 1 },
      ],
      units,
      3,
    );
    expect(ranked.map((u) => [u.id, u.leadCount])).toEqual([
      [2, 7],
      [3, 3],
      [1, 3],
    ]);
    expect(ranked[1]).toMatchObject({ name: "Studio 1633", locationShortName: "Delft CPI", isPublished: false });
  });

  it("skips deleted units and zero or invalid counts", () => {
    const ranked = rankPopularUnits(
      [
        { unit_id: 99, lead_count: 10 },
        { unit_id: 1, lead_count: 0 },
        { unit_id: 2, lead_count: "x" },
        { unit_id: "4", lead_count: 2 },
      ],
      units,
    );
    expect(ranked.map((u) => u.id)).toEqual([4]);
  });

  it("handles null rows", () => {
    expect(rankPopularUnits(null, units)).toEqual([]);
  });
});

describe("formatLeadTime", () => {
  it("labels today and yesterday in WITA", () => {
    // 06.00 UTC = 14.00 WITA, 16 Okt.
    expect(formatLeadTime("2026-10-16T06:00:00Z", "2026-10-16")).toBe("Hari ini, 14.00 WITA");
    // 17.30 UTC 15 Okt = 01.30 WITA 16 Okt (sudah hari ini di WITA).
    expect(formatLeadTime("2026-10-15T17:30:00Z", "2026-10-16")).toBe("Hari ini, 01.30 WITA");
    expect(formatLeadTime("2026-10-15T01:30:00Z", "2026-10-16")).toBe("Kemarin, 09.30 WITA");
  });

  it("shows the date for older requests", () => {
    expect(formatLeadTime("2026-10-12T06:00:00Z", "2026-10-16")).toBe("12 Okt 2026, 14.00 WITA");
  });
});
