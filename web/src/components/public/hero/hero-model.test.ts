import { describe, expect, it } from "vitest";
import { budgetLabel, BUDGET_PRESETS } from "@/lib/budget";
import { toSearchIndex } from "@/lib/search-index";
import { sampleCatalog } from "@/lib/test-fixtures";
import { parseSewaFilter, sewaHref } from "@/lib/validation/filters";
import type { LocationWithTypes, RoomTypeSummary } from "@/types/domain";
import {
  ANY_BUDGET,
  budgetEventId,
  budgetOptions,
  countInRange,
  draftFromRange,
  formatRupiahInput,
  heroHref,
  heroPriceBounds,
  heroSummary,
  heroSummaryText,
  hiddenValues,
  initialHeroState,
  isCustomBudget,
  lokasiLabel,
  lokasiOptions,
  normalizeDraft,
  parseRupiahInput,
  rangeFromDraft,
  selectedPresetId,
  toHeroIndex,
  toHeroLocations,
  typeLabel,
  typeOptions,
  usesDropdown,
  withLokasi,
  type HeroLocation,
  type HeroState,
} from "./hero-model";

function roomType(id: number, slug: string, name: string, sortOrder: number): RoomTypeSummary {
  return {
    id,
    slug,
    name,
    category: "studio",
    defaultMaxGuests: null,
    sortOrder,
    unitCount: 0,
    availableCount: 0,
    minPrice: null,
  };
}

function location(overrides: Partial<LocationWithTypes>): LocationWithTypes {
  return {
    id: 1,
    slug: "vida-view",
    name: "Apartemen Vida View",
    shortName: "Vida View",
    area: null,
    tagline: null,
    description: null,
    address: null,
    gmapsUrl: null,
    latitude: null,
    longitude: null,
    imageUrl: null,
    sortOrder: 1,
    unitCount: 4,
    availableCount: 3,
    minPrice: 250000,
    maxPrice: 750000,
    roomTypes: [],
    ...overrides,
  };
}

const LISTED: LocationWithTypes[] = [
  // Sengaja tidak urut: toHeroLocations mengurutkan menurut sort_order.
  location({
    id: 2,
    slug: "delft-cpi",
    name: "Apartemen Delft CPI",
    shortName: "Delft CPI",
    sortOrder: 2,
    roomTypes: [
      roomType(22, "studio-corner", "Studio Corner", 2),
      roomType(21, "studio", "Studio", 1),
      roomType(23, "2-bedroom", "2 Bedroom / Corner", 3),
      roomType(24, "3-bedroom", "3 Bedroom", 4),
    ],
  }),
  location({
    id: 1,
    roomTypes: [
      roomType(11, "studio", "Studio", 1),
      roomType(12, "studio-plus", "Studio Plus", 2),
      roomType(13, "2-bedroom", "2 Bedroom", 3),
      roomType(14, "2-bedroom-corner", "2 Bedroom Corner", 4),
      roomType(15, "3-bedroom", "3 Bedroom", 5),
    ],
  }),
];

const LOCATIONS = toHeroLocations(LISTED);
const INDEX = toHeroIndex(toSearchIndex(sampleCatalog()), LOCATIONS);
const VIDA = LOCATIONS[0];
const DELFT = LOCATIONS[1];

function state(overrides: Partial<HeroState> = {}): HeroState {
  return { ...initialHeroState(LOCATIONS), ...overrides };
}

describe("data awal", () => {
  it("mengurutkan apartemen dan tipe menurut sort_order dan hanya membawa field yang perlu", () => {
    expect(LOCATIONS.map((l) => l.slug)).toEqual(["vida-view", "delft-cpi"]);
    expect(DELFT.types.map((t) => t.slug)).toEqual(["studio", "studio-corner", "2-bedroom", "3-bedroom"]);
    expect(Object.keys(VIDA).sort()).toEqual(["name", "shortName", "slug", "types"]);
  });

  it("indeks hero hanya berisi unit tersedia di apartemen yang tampil", () => {
    expect(INDEX.every((row) => row.av)).toBe(true);
    expect(INDEX.map((row) => row.id)).toEqual([1, 2, 3, 5, 6, 7]);
    expect(toHeroIndex(toSearchIndex(sampleCatalog()), [DELFT]).map((row) => row.id)).toEqual([5, 6, 7]);
  });

  it("default: apartemen pertama, semua tipe, semua harga", () => {
    expect(initialHeroState(LOCATIONS)).toEqual({ lokasi: "vida-view", tipe: null, budget: ANY_BUDGET });
    expect(initialHeroState([])).toEqual({ lokasi: null, tipe: null, budget: ANY_BUDGET });
  });

  it("lebih dari 3 apartemen memakai dropdown", () => {
    const many: HeroLocation[] = ["a", "b", "c", "d"].map((slug) => ({ slug, name: slug, shortName: slug, types: [] }));
    expect(usesDropdown(LOCATIONS)).toBe(false);
    expect(usesDropdown(many.slice(0, 3))).toBe(false);
    expect(usesDropdown(many)).toBe(true);
  });
});

describe("ganti apartemen", () => {
  it("mengembalikan tipe ke Semua tipe tapi mempertahankan budget", () => {
    const before = state({ tipe: "studio", budget: { min: 300000, max: 500000 } });
    expect(withLokasi(before, "delft-cpi")).toEqual({
      lokasi: "delft-cpi",
      tipe: null,
      budget: { min: 300000, max: 500000 },
    });
  });

  it("memilih apartemen yang sama tidak mengubah apa pun", () => {
    const before = state({ tipe: "studio" });
    expect(withLokasi(before, "vida-view")).toBe(before);
  });
});

describe("ringkasan apartemen", () => {
  it("menghitung unit tersedia dan harga terendah per apartemen", () => {
    expect(heroSummary(INDEX, "vida-view")).toEqual({ available: 3, minPrice: 250000 });
    expect(heroSummaryText(heroSummary(INDEX, "vida-view"))).toBe("3 unit tersedia · mulai Rp250rb/malam");
    expect(heroSummaryText(heroSummary(INDEX, "delft-cpi"))).toBe("3 unit tersedia · mulai Rp290rb/malam");
  });

  it("semua apartemen (mode dropdown) menjumlahkan semuanya", () => {
    expect(heroSummaryText(heroSummary(INDEX, null))).toBe("6 unit tersedia · mulai Rp250rb/malam");
  });

  it("tanpa unit tersedia: kalimat tanpa harga", () => {
    expect(heroSummaryText(heroSummary(INDEX, "apartemen-baru"))).toBe("Belum ada unit tersedia");
  });
});

describe("tipe kamar", () => {
  it("Delft CPI hanya berisi tipe Delft, dengan jumlah dan status nonaktif", () => {
    expect(typeOptions(DELFT, INDEX)).toEqual([
      { value: null, label: "Semua tipe", note: "3 unit", count: 3, disabled: false },
      { value: "studio", label: "Studio", note: "1 unit", count: 1, disabled: false },
      { value: "studio-corner", label: "Studio Corner", note: "1 unit", count: 1, disabled: false },
      { value: "2-bedroom", label: "2 Bedroom / Corner", note: "belum tersedia", count: 0, disabled: true },
      { value: "3-bedroom", label: "3 Bedroom", note: "1 unit", count: 1, disabled: false },
    ]);
  });

  it("tipe yang semua unitnya penuh tampil sebagai belum tersedia", () => {
    const studioPlus = typeOptions(VIDA, INDEX).find((option) => option.value === "studio-plus");
    expect(studioPlus).toMatchObject({ count: 0, disabled: true, note: "belum tersedia" });
    expect(typeOptions(VIDA, INDEX)[0]).toMatchObject({ label: "Semua tipe", count: 3 });
  });

  it("label field", () => {
    expect(typeLabel(VIDA, null)).toBe("Semua tipe");
    expect(typeLabel(VIDA, "2-bedroom-corner")).toBe("2 Bedroom Corner");
    expect(typeLabel(VIDA, "tidak-ada")).toBe("Semua tipe");
    expect(typeLabel(null, "studio")).toBe("Semua tipe");
    expect(typeOptions(null, INDEX)).toEqual([]);
  });
});

describe("apartemen (mode dropdown)", () => {
  it("opsi pertama Semua apartemen dengan total", () => {
    expect(lokasiOptions(LOCATIONS, INDEX).map((o) => [o.label, o.note])).toEqual([
      ["Semua apartemen", "6 unit"],
      ["Vida View", "3 unit"],
      ["Delft CPI", "3 unit"],
    ]);
    expect(lokasiLabel(LOCATIONS, null)).toBe("Semua apartemen");
    expect(lokasiLabel(LOCATIONS, "delft-cpi")).toBe("Delft CPI");
  });
});

describe("budget", () => {
  it("pilihan cepat menghitung unit apartemen terpilih; 0 → nonaktif, kecuali Semua harga", () => {
    const options = budgetOptions(INDEX, { lokasi: "vida-view", tipe: null });
    expect(options.map((o) => [o.value, o.count, o.disabled, o.note])).toEqual([
      ["semua", 3, false, "3 unit"],
      ["lt300", 2, false, "2 unit"],
      ["300-500", 0, true, "tidak ada unit"],
      ["500-1jt", 1, false, "1 unit"],
      ["gt1jt", 0, true, "tidak ada unit"],
    ]);
    expect(options.map((o) => o.label)).toEqual(BUDGET_PRESETS.map((p) => p.label));
  });

  it("jumlah ikut tipe kamar terpilih", () => {
    const options = budgetOptions(INDEX, { lokasi: "vida-view", tipe: "studio" });
    expect(options.map((o) => o.count)).toEqual([2, 2, 0, 0, 0]);
  });

  it("Semua harga tidak pernah nonaktif walau apartemen tanpa unit", () => {
    expect(budgetOptions(INDEX, { lokasi: "kosong", tipe: null })[0]).toMatchObject({ count: 0, disabled: false });
  });

  it("batas preset inklusif", () => {
    // Unit Delft 380000 masuk Rp300rb – Rp500rb; 290000 masuk "di bawah Rp300rb".
    const delft = budgetOptions(INDEX, { lokasi: "delft-cpi", tipe: null });
    expect(delft.map((o) => o.count)).toEqual([3, 1, 1, 0, 1]);
    const edge = [{ ...INDEX[0], p: 300000 }];
    expect(budgetOptions(edge, { lokasi: "vida-view", tipe: null }).map((o) => o.count)).toEqual([1, 1, 1, 0, 0]);
  });

  it("preset terpilih dan rentang kustom", () => {
    expect(selectedPresetId(ANY_BUDGET)).toBe("semua");
    expect(selectedPresetId({ min: 300000, max: 500000 })).toBe("300-500");
    expect(selectedPresetId({ min: 350000, max: 600000 })).toBeNull();
    expect(isCustomBudget({ min: 350000, max: 600000 })).toBe(true);
    expect(isCustomBudget({ min: null, max: 300000 })).toBe(false);
    expect(budgetLabel({ min: 350000, max: 600000 })).toBe("Rp350rb – Rp600rb");
  });

  it("batas slider dari harga apartemen terpilih (kelipatan Rp50.000)", () => {
    expect(heroPriceBounds(INDEX, "vida-view")).toEqual({ min: 250000, max: 750000 });
    expect(heroPriceBounds(INDEX, "delft-cpi")).toEqual({ min: 250000, max: 1200000 });
    expect(heroPriceBounds(INDEX, "kosong")).toBeNull();
  });
});

describe("rentang kustom", () => {
  const bounds = { min: 250000, max: 750000 };

  it("draft awal mengisi batas apartemen", () => {
    expect(draftFromRange(ANY_BUDGET, bounds)).toEqual({ min: 250000, max: 750000 });
    expect(draftFromRange({ min: 300000, max: null }, bounds)).toEqual({ min: 300000, max: 750000 });
    expect(draftFromRange({ min: null, max: 2_000_000 }, bounds)).toEqual({ min: 250000, max: 750000 });
  });

  it("menjepit ke batas dan menukar minimum > maksimum", () => {
    expect(normalizeDraft({ min: 100000, max: 900000 }, bounds)).toEqual({ min: 250000, max: 750000 });
    expect(normalizeDraft({ min: 600000, max: 400000 }, bounds)).toEqual({ min: 400000, max: 600000 });
    expect(normalizeDraft({ min: null, max: null }, bounds)).toEqual({ min: 250000, max: 750000 });
  });

  it("nilai di batas berarti tanpa batas", () => {
    expect(rangeFromDraft({ min: 250000, max: 750000 }, bounds)).toEqual(ANY_BUDGET);
    expect(rangeFromDraft({ min: 300000, max: 750000 }, bounds)).toEqual({ min: 300000, max: null });
    expect(rangeFromDraft({ min: 250000, max: 500000 }, bounds)).toEqual({ min: null, max: 500000 });
    expect(rangeFromDraft({ min: 700000, max: 350000 }, bounds)).toEqual({ min: 350000, max: 700000 });
  });

  it("menghitung unit dalam rentang", () => {
    const scope = { lokasi: "vida-view", tipe: null };
    expect(countInRange(INDEX, scope, { min: 260000, max: 800000 })).toBe(2);
    expect(countInRange(INDEX, scope, { min: 300000, max: 700000 })).toBe(0);
    expect(countInRange(INDEX, scope, ANY_BUDGET)).toBe(3);
  });

  it("input Rupiah", () => {
    expect(parseRupiahInput("Rp350.000")).toBe(350000);
    expect(parseRupiahInput("350000")).toBe(350000);
    expect(parseRupiahInput("Rp")).toBeNull();
    expect(parseRupiahInput("")).toBeNull();
    expect(parseRupiahInput("9999999999999")).toBe(100_000_000);
    expect(formatRupiahInput(350000)).toBe("Rp350.000");
    expect(formatRupiahInput(null)).toBe("");
  });
});

describe("kirim", () => {
  it("tanpa memilih apa pun → /sewa?lokasi=<apartemen default>", () => {
    const initial = initialHeroState(LOCATIONS);
    expect(heroHref(initial)).toBe("/sewa?lokasi=vida-view");
    expect(hiddenValues(initial)).toEqual({ tipe: null, min: null, max: null });
  });

  it("urutan param lokasi, tipe, min, max dan sama dengan sewaHref", () => {
    const s = state({ lokasi: "delft-cpi", tipe: "studio", budget: { min: 300000, max: 500000 } });
    expect(heroHref(s)).toBe("/sewa?lokasi=delft-cpi&tipe=studio&min=300000&max=500000");
    expect(heroHref(s)).toBe(sewaHref({ lokasi: "delft-cpi", tipe: "studio", min: 300000, max: 500000 }));
    expect(hiddenValues(s)).toEqual({ tipe: "studio", min: "300000", max: "500000" });
  });

  it("input tersembunyi menghasilkan query yang sama dengan heroHref (GET bawaan)", () => {
    const cases: HeroState[] = [
      state(),
      state({ tipe: "studio" }),
      state({ budget: { min: null, max: 300000 } }),
      state({ budget: { min: 1_000_000, max: null } }),
      state({ lokasi: null, tipe: "studio", budget: { min: 350000, max: 600000 } }),
    ];
    for (const s of cases) {
      const hidden = hiddenValues(s);
      const params = new URLSearchParams();
      if (s.lokasi) params.append("lokasi", s.lokasi);
      for (const key of ["tipe", "min", "max"] as const) {
        const value = hidden[key];
        if (value !== null) params.append(key, value);
      }
      const query = params.toString();
      expect(query ? `/sewa?${query}` : "/sewa").toBe(heroHref(s));
    }
  });

  it("URL hasil bisa dibaca kembali oleh parseSewaFilter", () => {
    const s = state({ tipe: "2-bedroom-corner", budget: { min: 500000, max: 1_000_000 } });
    const parsed = parseSewaFilter(new URLSearchParams(heroHref(s).split("?")[1]));
    expect(parsed).toMatchObject({ lokasi: "vida-view", tipe: "2-bedroom-corner", min: 500000, max: 1_000_000 });
  });

  it("tipe tanpa apartemen tidak ikut ke URL", () => {
    expect(heroHref(state({ lokasi: null, tipe: "studio" }))).toBe("/sewa");
    expect(hiddenValues(state({ lokasi: null, tipe: "studio" })).tipe).toBeNull();
  });

  it("event budget: id preset, kustom, atau null", () => {
    expect(budgetEventId(ANY_BUDGET)).toBeNull();
    expect(budgetEventId({ min: null, max: 300000 })).toBe("lt300");
    expect(budgetEventId({ min: 350000, max: 600000 })).toBe("kustom");
  });
});
