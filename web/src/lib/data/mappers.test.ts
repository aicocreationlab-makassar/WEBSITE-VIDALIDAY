import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { mapCatalogUnit, mapFacility, mapLocations, mapPopularity, mapSettings, type UnitRow } from "./mappers";

const ORIGINAL = process.env.NEXT_PUBLIC_SUPABASE_URL;
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
});
afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL;
});

describe("mapSettings", () => {
  it("fills missing, NULL, or empty required keys with defaults", () => {
    const settings = mapSettings([
      { key: "whatsapp_number", value: "6285711696970" },
      { key: "office_hours", value: null },
      { key: "hero_title", value: "  " },
      { key: "hero_image", value: "settings/hero.jpg" },
      { key: "site_logo", value: null },
    ]);
    expect(settings.whatsappNumber).toBe("6285711696970");
    expect(settings.officeHours).toBe(DEFAULT_SETTINGS.officeHours);
    expect(settings.heroImage).toBe("settings/hero.jpg");
    expect(settings.siteLogo).toBeNull();
    expect(settings.heroTitle).toBe(DEFAULT_SETTINGS.heroTitle);
  });

  it("keeps optional keys that an admin cleared on purpose", () => {
    const settings = mapSettings([
      { key: "hero_subtitle", value: "" },
      { key: "contact_email", value: "" },
      { key: "about_intro_p3", value: "" },
      { key: "about_reasons", value: "[]" },
    ]);
    expect(settings.heroSubtitle).toBe("");
    expect(settings.contactEmail).toBe("");
    expect(settings.about.introP3).toBe("");
    expect(settings.about.reasons).toEqual([]);
  });

  it("keeps an empty announcement empty (hidden)", () => {
    expect(mapSettings([{ key: "promo_banner_text", value: "  " }]).promoBannerText).toBe("");
    expect(mapSettings([{ key: "promo_banner_text", value: "Diskon akhir tahun" }]).promoBannerText).toBe("Diskon akhir tahun");
  });

  it("parses about_reasons and maps legacy icon names", () => {
    const settings = mapSettings([
      {
        key: "about_reasons",
        value: JSON.stringify([
          { title: "Pemesanan Mudah", desc: "Lewat WhatsApp", icon: "chat" },
          { title: "", desc: "tanpa judul", icon: "home" },
          { title: "Unit Bersih", desc: "Selalu", icon: "tidak-dikenal" },
        ]),
      },
    ]);
    expect(settings.about.reasons).toEqual([
      { title: "Pemesanan Mudah", desc: "Lewat WhatsApp", icon: "message-circle" },
      { title: "Unit Bersih", desc: "Selalu", icon: "shield-check" },
    ]);
    expect(mapSettings([{ key: "about_reasons", value: "rusak" }]).about.reasons).toEqual(DEFAULT_SETTINGS.about.reasons);
  });
});

const row: UnitRow = {
  id: 1,
  slug: "studio-at-26x",
  name: " Studio AT 26X ",
  location_id: 1,
  room_type_id: 11,
  tower: "Ashton",
  floor_number: 26,
  view_type: " ",
  size_sqm: null,
  max_guests: 3,
  normal_price: 300000,
  promo_price: 280000,
  is_promo_active: true,
  promo_badge: null,
  effective_price: 280000,
  weekly_price: null,
  monthly_price: 6500000,
  is_featured: true,
  is_available: true,
  sort_order: 0,
  main_image: "units/a.jpg",
  gallery_images: ["units/b.jpg", "https://images.unsplash.com/photo-1"],
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-02T00:00:00Z",
  location: { id: 1, slug: "vida-view", name: "Apartemen Vida View", short_name: "Vida View", area: "Panakkukang" },
  room_type: { id: 11, slug: "studio", name: "Studio", category: "studio" },
  unit_amenities: [
    { amenity: { id: 2, name: "WiFi High Speed", icon: "check", sort_order: 50, is_active: true } },
    { amenity: { id: 1, name: "AC", icon: "air-vent", sort_order: 1, is_active: true } },
    { amenity: null },
  ],
};

describe("mapCatalogUnit", () => {
  it("maps a row to a catalog unit", () => {
    const unit = mapCatalogUnit(row)!;
    expect(unit).toMatchObject({
      name: "Studio AT 26X",
      locationShortName: "Vida View",
      roomTypeSlug: "studio",
      category: "studio",
      viewType: null,
      effectivePrice: 280000,
      monthlyPrice: 6500000,
    });
    expect(unit.photos).toEqual([
      "https://abc.supabase.co/storage/v1/object/public/media/units/a.jpg",
      "https://abc.supabase.co/storage/v1/object/public/media/units/b.jpg",
    ]);
    expect(unit.amenities.map((a) => [a.name, a.icon])).toEqual([
      ["AC", "air-vent"],
      ["WiFi High Speed", "wifi"],
    ]);
  });

  it("drops units without a visible location and inactive room types", () => {
    expect(mapCatalogUnit({ ...row, location: null })).toBeNull();
    const unit = mapCatalogUnit({ ...row, room_type: { ...row.room_type!, is_active: false } })!;
    expect([unit.roomTypeId, unit.category]).toEqual([null, "other"]);
  });

  it("computes the effective price when the generated column is missing", () => {
    expect(mapCatalogUnit({ ...row, effective_price: null, is_promo_active: false })!.effectivePrice).toBe(300000);
  });
});

describe("mapLocations", () => {
  it("counts units per apartment and room type", () => {
    const units = [
      mapCatalogUnit(row)!,
      mapCatalogUnit({ ...row, id: 2, slug: "b", effective_price: 250000, is_available: false })!,
    ];
    const [vida] = mapLocations(
      [
        {
          id: 1,
          slug: "vida-view",
          name: "Apartemen Vida View",
          short_name: "Vida View",
          area: "Panakkukang",
          tagline: null,
          description: null,
          address: null,
          gmaps_url: null,
          latitude: null,
          longitude: null,
          hero_image: "https://images.unsplash.com/photo-1545",
          sort_order: 1,
          is_active: true,
          room_types: [
            { id: 12, slug: "studio-plus", name: "Studio Plus", category: "studio", default_max_guests: 5, sort_order: 2, is_active: true },
            { id: 11, slug: "studio", name: "Studio", category: "studio", default_max_guests: 3, sort_order: 1, is_active: true },
            { id: 13, slug: "lama", name: "Lama", category: "other", default_max_guests: null, sort_order: 3, is_active: false },
          ],
        },
      ],
      units,
    );
    expect(vida).toMatchObject({ unitCount: 2, availableCount: 1, minPrice: 280000, imageUrl: "/images/locations/vida-view.jpg" });
    expect(vida.roomTypes.map((t) => [t.slug, t.unitCount, t.availableCount])).toEqual([
      ["studio", 2, 1],
      ["studio-plus", 0, 0],
    ]);
  });
});

describe("other mappers", () => {
  it("maps facilities with guessed icons and storage URLs", () => {
    expect(
      mapFacility({ id: 1, location_id: 2, name: "Infinity Pool", description: null, icon: "swimming-pool", image: "facilities/x.jpg" }),
    ).toMatchObject({ icon: "waves", imageUrl: "https://abc.supabase.co/storage/v1/object/public/media/facilities/x.jpg", sortOrder: 0 });
  });

  it("maps popularity rows", () => {
    expect(mapPopularity([{ unit_id: 3, lead_count: "4" }])).toEqual({ 3: 4 });
    expect(mapPopularity(null)).toEqual({});
  });
});
