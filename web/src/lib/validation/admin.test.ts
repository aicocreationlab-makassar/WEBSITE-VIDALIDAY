import { describe, expect, it } from "vitest";
import { aboutSchema, locationSchema, quickPriceSchema, settingsSchema, unitSchema } from "./admin";

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
