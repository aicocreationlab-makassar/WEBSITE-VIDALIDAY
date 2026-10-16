import { describe, expect, it } from "vitest";
import {
  aboutSchema,
  amenitySchema,
  facilitySchema,
  faqSchema,
  landmarkSchema,
  locationSchema,
  quickPriceSchema,
  roomTypeSchema,
  settingsSchema,
  unitSchema,
} from "./admin";

const unit = {
  locationId: 1,
  roomTypeId: 11,
  name: "Studio AT 26X",
  slug: "studio-at-26x",
  tower: "Ashton",
  floorNumber: 26,
  viewType: "",
  sizeSqm: null,
  maxGuests: 3,
  normalPrice: 300000,
  promoPrice: 280000,
  isPromoActive: true,
  promoBadge: "",
  weeklyPrice: null,
  monthlyPrice: 6500000,
  amenityIds: [1, 2],
  photos: ["units/a.webp"],
  youtubeUrl: "",
  description: "Unit nyaman",
  isPublished: true,
  isAvailable: true,
  isFeatured: false,
};

describe("unitSchema", () => {
  it("accepts a valid unit and normalizes empty strings to null", () => {
    const data = unitSchema.parse(unit);
    expect(data.viewType).toBeNull();
    expect(data.promoBadge).toBeNull();
    expect(data.youtubeUrl).toBeNull();
    expect(data.weeklyPrice).toBeNull();
  });

  it("requires a promo price lower than the normal price when promo is on", () => {
    const result = unitSchema.safeParse({ ...unit, promoPrice: 300000 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["promoPrice"], message: "Harga promo harus lebih murah dari harga normal." });
    expect(unitSchema.safeParse({ ...unit, isPromoActive: false, promoPrice: null }).success).toBe(true);
  });

  it("validates slug, capacity, label length and YouTube links", () => {
    const result = unitSchema.safeParse({ ...unit, slug: "Studio AT", maxGuests: 0, promoBadge: "Hemat 27% (Best Seller) akhir tahun", youtubeUrl: "https://vimeo.com/1" });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["slug", "maxGuests", "promoBadge", "youtubeUrl"]));
  });

  it("checks quick price edits", () => {
    expect(quickPriceSchema.safeParse({ id: 1, normalPrice: 300000, promoPrice: 280000, isPromoActive: true }).success).toBe(true);
    expect(quickPriceSchema.safeParse({ id: 1, normalPrice: 300000, promoPrice: null, isPromoActive: true }).success).toBe(false);
  });
});

describe("other admin schemas", () => {
  it("limits the hero tab label to 16 characters", () => {
    const base = { name: "Apartemen Vida View", shortName: "Vida View", slug: "vida-view", sortOrder: 1, isActive: true };
    expect(locationSchema.safeParse(base).success).toBe(true);
    expect(locationSchema.safeParse({ ...base, shortName: "Vida View Panakkukang" }).success).toBe(false);
    expect(locationSchema.safeParse({ ...base, gmapsUrl: "maps.google.com" }).success).toBe(false);
  });

  it("normalizes the WhatsApp number in settings", () => {
    const parsed = settingsSchema.parse({
      whatsappNumber: "0857-1169-6970",
      heroTitle: "Sewa apartemen harian di Makassar",
      bookingWhatsappTemplate: "Halo Admin VIDALIDAY, saya mau sewa {unit}",
      companyLegalName: "PT Perdana Mega Trans",
      seoTitle: "VIDALIDAY | Sewa apartemen",
      seoDescription: "Sewa apartemen resmi di Makassar: Vida View dan Delft CPI.",
    });
    expect(parsed.whatsappNumber).toBe("6285711696970");
    expect(parsed.contactEmail).toBe("");
  });

  it("validates about reasons", () => {
    expect(
      aboutSchema.safeParse({
        tagline: "Your Comfort",
        heroTitle: "VIDALIDAY partner menginap",
        introP1: "VIDALIDAY adalah brand sewa apartemen.",
        commitTitle: "Komitmen",
        commitText: "Kami berkomitmen melayani dengan baik.",
        reasons: [{ title: "Bersih", desc: "", icon: "sparkles" }],
      }).success,
    ).toBe(true);
  });
});

// Form admin mengirim hasil parse (kosong → null) ke Server Action yang mem-parse ulang dengan skema yang sama.
// Hasil parse karena itu harus lolos lagi (idempoten), termasuk nilai null dari kolom DB yang kosong.
describe("admin schemas are idempotent", () => {
  const location = {
    name: "Apartemen UJI QA",
    shortName: "UJI QA",
    slug: "apartemen-uji-qa",
    area: "",
    address: null,
    gmapsUrl: "",
    latitude: null,
    longitude: null,
    tagline: null,
    description: "",
    heroImage: null,
    sortOrder: 3,
    isActive: false,
  };
  const cases: [string, { parse: (v: unknown) => unknown; safeParse: (v: unknown) => { success: boolean } }, unknown][] = [
    ["unit", unitSchema, { ...unit, tower: null, viewType: null, promoBadge: null, youtubeUrl: null, description: null }],
    ["location", locationSchema, location],
    ["roomType", roomTypeSchema, { locationId: 3, name: "UJI QA Tipe", slug: "uji-qa-tipe", category: "studio", defaultMaxGuests: null, sortOrder: 1, isActive: true }],
    ["amenity", amenitySchema, { name: "Kulkas", icon: "refrigerator", sortOrder: 1, isActive: true }],
    ["facility", facilitySchema, { locationId: 1, name: "Kolam renang", description: null, icon: "waves", image: null, sortOrder: 1, isActive: true }],
    ["landmark", landmarkSchema, { locationId: 1, name: "Mall Panakkukang", distanceTime: "5 menit", notes: null, icon: "shopping-bag", sortOrder: 1, isActive: true }],
    ["faq", faqSchema, { question: "Jam check-in?", answer: "Mulai 14.00 WITA.", sortOrder: 1, isActive: true }],
  ];

  it.each(cases)("%s: parse(parse(x)) tetap lolos", (_name, schema, input) => {
    const once = schema.parse(input);
    expect(schema.safeParse(once).success).toBe(true);
  });

  it("location menerima null untuk field opsional dari DB", () => {
    const parsed = locationSchema.parse(location);
    expect(parsed).toMatchObject({ area: null, address: null, gmapsUrl: null, tagline: null, description: null });
  });
});
