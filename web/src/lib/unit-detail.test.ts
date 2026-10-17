import { describe, expect, it } from "vitest";
import { estimateTotal } from "./pricing";
import { AMENITY, makeUnit, sampleCatalog } from "./test-fixtures";
import {
  clampGuests,
  clampIndex,
  cleanDescription,
  galleryLayout,
  isLetterboxed,
  isLongText,
  parseHouseRules,
  rateNote,
  rateRows,
  shiftCheckOut,
  similarFallbackPool,
  stayEstimate,
  toBookingUnit,
  toCatalogUnit,
  unitBreadcrumbs,
  unitFacts,
  unitMetaDescription,
  unitMetaTitle,
  unitSummarySentence,
} from "./unit-detail";
import type { UnitDetail } from "@/types/domain";

function makeDetail(overrides: Partial<UnitDetail> = {}): UnitDetail {
  return {
    ...makeUnit({ id: 1, slug: "studio-at-26x", name: "Studio AT 26X", tower: "Ashton", floorNumber: 26 }),
    description: "Unit nyaman.",
    youtubeUrl: null,
    location: {
      id: 1,
      slug: "vida-view",
      name: "Apartemen Vida View",
      shortName: "Vida View",
      area: "Panakkukang",
      address: "Jl. Boulevard",
      gmapsUrl: null,
      latitude: null,
      longitude: null,
      tagline: null,
    },
    ...overrides,
  };
}

describe("toCatalogUnit / toBookingUnit", () => {
  it("drops detail-only fields", () => {
    const catalog = toCatalogUnit(makeDetail());
    expect(catalog).not.toHaveProperty("description");
    expect(catalog).not.toHaveProperty("youtubeUrl");
    expect(catalog).not.toHaveProperty("location");
    expect(catalog.slug).toBe("studio-at-26x");
  });

  it("keeps only booking fields", () => {
    const booking = toBookingUnit(makeUnit({ id: 9 }));
    expect(Object.keys(booking).sort()).toEqual(
      [
        "category",
        "effectivePrice",
        "floorNumber",
        "id",
        "isAvailable",
        "isPromoActive",
        "locationShortName",
        "locationSlug",
        "maxGuests",
        "monthlyPrice",
        "name",
        "normalPrice",
        "photos",
        "promoBadge",
        "promoPrice",
        "slug",
        "tower",
        "weeklyPrice",
      ].sort(),
    );
  });
});

describe("similarFallbackPool", () => {
  it("puts featured units of the same apartment first, then cheapest, excluding self and full units", () => {
    const catalog = sampleCatalog();
    const current = catalog.find((u) => u.id === 2)!;
    const pool = similarFallbackPool(current, catalog);
    expect(pool[0].id).toBe(1); // unggulan Vida View
    expect(pool.some((u) => u.id === current.id)).toBe(false);
    expect(pool.every((u) => u.isAvailable)).toBe(true);
    const rest = pool.slice(1).map((u) => u.effectivePrice);
    expect(rest).toEqual([...rest].sort((a, b) => a - b));
  });

  it("respects the limit", () => {
    const catalog = Array.from({ length: 12 }, (_, i) => makeUnit({ id: 500 + i }));
    expect(similarFallbackPool(catalog[0], catalog)).toHaveLength(8);
    expect(similarFallbackPool(catalog[0], catalog, 3)).toHaveLength(3);
  });
});

describe("unitFacts", () => {
  it("lists filled facts in order and hides empty ones", () => {
    const facts = unitFacts(
      makeUnit({ tower: "Tower Ashton", floorNumber: 26, viewType: "Kolam renang", sizeSqm: 32.5, maxGuests: 3 }),
    );
    expect(facts.map((f) => [f.label, f.value])).toEqual([
      ["Tipe kamar", "Studio"],
      ["Kapasitas", "Maks. 3 tamu"],
      ["Lantai", "26"],
      ["Tower", "Ashton"],
      ["View", "Kolam renang"],
      ["Luas", "32,5 m²"],
    ]);
    expect(facts.map((f) => f.icon)).toEqual(["bed-double", "users", "layers", "building-2", "eye", "ruler"]);
  });

  it("never shows empty values", () => {
    const facts = unitFacts(makeUnit({ tower: "  ", viewType: "", sizeSqm: 0, floorNumber: null }));
    expect(facts.map((f) => f.key)).toEqual(["type", "guests"]);
  });

  it("falls back to the category label and skips 'other'", () => {
    expect(unitFacts(makeUnit({ roomTypeName: null, category: "2br" }))[0].value).toBe("2 Bedroom");
    expect(unitFacts(makeUnit({ roomTypeName: null, category: "other" })).map((f) => f.key)).toEqual(["guests"]);
  });
});

describe("rateRows", () => {
  it("shows weekly and monthly only when set", () => {
    expect(rateRows({ weeklyPrice: null, monthlyPrice: null })).toEqual([]);
    expect(rateRows({ weeklyPrice: 1_800_000, monthlyPrice: 0 }).map((r) => r.suffix)).toEqual(["/minggu"]);
    expect(rateRows({ weeklyPrice: 1_800_000, monthlyPrice: 6_500_000 }).map((r) => r.suffix)).toEqual([
      "/minggu",
      "/bulan",
    ]);
  });
});

describe("cleanDescription / isLongText", () => {
  it("strips markdown and extra blank lines", () => {
    expect(cleanDescription("**Unit baru**\r\n\r\n\r\n\r\nDekat *mall*.  ")).toBe("Unit baru\n\nDekat mall.");
    expect(cleanDescription("   ")).toBeNull();
    expect(cleanDescription(null)).toBeNull();
  });

  it("guesses when text needs the toggle", () => {
    expect(isLongText("Pendek.")).toBe(false);
    expect(isLongText("a\nb\nc\nd\ne")).toBe(true);
    expect(isLongText("x".repeat(42 * 5))).toBe(true);
  });
});

describe("parseHouseRules", () => {
  it("splits lines, removes bullets, and picks icons", () => {
    const rules = parseHouseRules("- Dilarang merokok di dalam unit.\n\n• Jaga kebersihan.\n2) Buang sampah di tempatnya.\n");
    expect(rules).toEqual([
      { text: "Dilarang merokok di dalam unit.", icon: "cigarette-off" },
      { text: "Jaga kebersihan.", icon: "ban" },
      { text: "Buang sampah di tempatnya.", icon: "ban" },
    ]);
    expect(parseHouseRules("")).toEqual([]);
  });
});

describe("breadcrumbs and meta", () => {
  const unit = makeUnit({ slug: "studio-at-26x", name: "Studio AT 26X", amenities: [AMENITY.ac, AMENITY.wifi, AMENITY.tv, AMENITY.kitchen] });

  it("builds Beranda / apartemen / unit", () => {
    expect(unitBreadcrumbs(unit)).toEqual([
      { name: "Beranda", href: "/" },
      { name: "Vida View", href: "/apartemen/vida-view" },
      { name: "Studio", href: "/apartemen/vida-view/studio" },
      { name: "Studio AT 26X", href: "/unit/studio-at-26x" },
    ]);
    expect(unitBreadcrumbs({ ...unit, roomTypeSlug: null, roomTypeName: null })).toHaveLength(3);
  });

  it("writes a plain summary sentence", () => {
    expect(unitSummarySentence({ ...unit, tower: "Ashton", floorNumber: 26 })).toBe(
      "Studio AT 26X adalah unit Studio di Apartemen Vida View, Tower Ashton lt. 26, untuk maksimal 3 tamu, Rp280.000/malam. Fasilitas: AC, WiFi, Smart TV.",
    );
    expect(unitSummarySentence({ ...unit, tower: null, floorNumber: null, weeklyPrice: 1500000, monthlyPrice: 5000000, amenities: [] })).toBe(
      "Studio AT 26X adalah unit Studio di Apartemen Vida View, untuk maksimal 3 tamu, Rp280.000/malam, mingguan Rp1.500.000, bulanan Rp5.000.000.",
    );
  });

  it("formats title and description", () => {
    expect(unitMetaTitle(unit)).toBe("Studio AT 26X — Studio di Vida View Makassar");
    expect(unitMetaTitle({ ...unit, roomTypeName: null })).toBe("Studio AT 26X — Unit di Vida View Makassar");
    const description = unitMetaDescription(unit);
    expect(description).toContain("Rp280.000/malam");
    expect(description).toContain("maks. 3 tamu");
    expect(description).toContain("AC, WiFi, Smart TV");
    expect(description).not.toContain("Kitchen Set");
    expect(unitMetaDescription({ ...unit, amenities: [] })).not.toContain("fasilitas");
    expect(unitMetaDescription({ ...unit, isAvailable: false })).toContain("Tanya ketersediaan");
  });
});

describe("gallery helpers", () => {
  it("chooses the desktop layout by photo count", () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(galleryLayout)).toEqual(["none", "single", "pair", "trio", "trio", "mosaic", "mosaic"]);
  });

  it("detects letterboxed video screenshots", () => {
    expect(isLetterboxed(589, 1280)).toBe(true);
    expect(isLetterboxed(736, 1600)).toBe(true);
    expect(isLetterboxed(734, 1280)).toBe(false);
    expect(isLetterboxed(1280, 960)).toBe(false);
    expect(isLetterboxed(0, 0)).toBe(false);
  });

  it("clamps indexes", () => {
    expect(clampIndex(-1, 5)).toBe(0);
    expect(clampIndex(7, 5)).toBe(4);
    expect(clampIndex(2.4, 5)).toBe(2);
    expect(clampIndex(3, 0)).toBe(0);
  });
});

describe("booking card helpers", () => {
  it("clamps guests to 1..30", () => {
    expect(clampGuests(0)).toBe(1);
    expect(clampGuests(31)).toBe(30);
    expect(clampGuests(Number.NaN)).toBe(1);
    expect(clampGuests(4)).toBe(4);
  });

  it("moves check-out when check-in passes it, keeping the nights", () => {
    expect(shiftCheckOut("2026-10-18", "2026-10-20", "2026-10-19")).toBe("2026-10-20");
    expect(shiftCheckOut("2026-10-18", "2026-10-20", "2026-10-20")).toBe("2026-10-22");
    expect(shiftCheckOut("2026-10-18", "2026-10-20", "2026-10-25")).toBe("2026-10-27");
    expect(shiftCheckOut("", "", "2026-10-25")).toBe("2026-10-26");
    expect(shiftCheckOut("2026-10-18", "2026-10-20", "")).toBe("2026-10-20");
  });

  it("estimates with the same formula as lib/pricing", () => {
    const unit = { effectivePrice: 280_000, weeklyPrice: 1_750_000, monthlyPrice: null };
    expect(stayEstimate(unit, "", "")).toEqual({ status: "empty" });
    expect(stayEstimate(unit, "2026-10-20", "2026-10-20")).toEqual({ status: "invalid" });
    expect(stayEstimate(unit, "2026-10-20", "2027-10-21")).toEqual({ status: "too-long" });
    expect(stayEstimate(unit, "2026-10-20", "2026-10-22")).toEqual({
      status: "ok",
      estimate: estimateTotal({ effective_price: 280_000, weekly_price: 1_750_000, monthly_price: null }, 2),
    });
    const weekly = stayEstimate(unit, "2026-10-20", "2026-10-28");
    expect(weekly.status === "ok" && weekly.estimate.total).toBe(2_000_000);
    expect(weekly.status === "ok" && rateNote(weekly.estimate)).toBe("tarif mingguan");
    expect(rateNote({ total: 1, nights: 1, rate: "harian" })).toBeNull();
  });
});
