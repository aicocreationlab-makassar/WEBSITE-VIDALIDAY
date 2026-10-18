import { describe, expect, it } from "vitest";
import type { AdminAmenityOption, AdminLocationOption } from "@/lib/data/admin/units";
import { unitSchema } from "@/lib/validation/admin";
import {
  amenityChoices,
  amenityNamesFor,
  autoSlug,
  buildUnitRow,
  descriptionNote,
  findLocation,
  findRoomType,
  formFieldErrors,
  formHealthFlags,
  formatNumberText,
  guestsForRoomType,
  guestsNote,
  healthChecklist,
  initialLocation,
  isAllowedPhotoValue,
  locationLabel,
  newUnitDefaults,
  parseNumberText,
  promoBadgeNote,
  promoPriceNote,
  rateNote,
  roomTypeOptions,
  sanitizeNumberText,
  settleSlug,
  slugAddress,
  soleActiveRoomType,
  statusNotes,
  toggleId,
  typingSlug,
  uniquePhotos,
  unitPricePreview,
  youtubeNote,
  youtubePreview,
} from "./unit-form-model";

const vidaView: AdminLocationOption = {
  id: 1,
  slug: "vida-view",
  name: "Vida View",
  shortName: "Vida View",
  isActive: true,
  hasTowers: true,
  sortOrder: 1,
  roomTypes: [
    { id: 11, name: "Studio", slug: "studio", category: "studio", defaultMaxGuests: 2, isActive: true, sortOrder: 1 },
    { id: 12, name: "2BR", slug: "2br", category: "2br", defaultMaxGuests: 5, isActive: true, sortOrder: 2 },
    { id: 13, name: "Penthouse", slug: "penthouse", category: "other", defaultMaxGuests: 8, isActive: false, sortOrder: 3 },
  ],
};

const delft: AdminLocationOption = {
  id: 2,
  slug: "delft-cpi",
  name: "Delft CPI",
  shortName: "Delft",
  isActive: false,
  hasTowers: false,
  sortOrder: 2,
  roomTypes: [
    { id: 21, name: "Studio", slug: "studio", category: "studio", defaultMaxGuests: 3, isActive: true, sortOrder: 1 },
    { id: 22, name: "Lama", slug: "lama", category: "other", defaultMaxGuests: null, isActive: false, sortOrder: 2 },
  ],
};

const locations = [vidaView, delft];

const amenities: AdminAmenityOption[] = [
  { id: 1, name: "AC", icon: "air-vent", isActive: true, sortOrder: 1 },
  { id: 2, name: "Smart TV", icon: "tv", isActive: true, sortOrder: 2 },
  { id: 3, name: "Bathtub", icon: "bath", isActive: false, sortOrder: 3 },
  { id: 4, name: "Wi-Fi", icon: "wifi", isActive: true, sortOrder: 4 },
];

describe("apartemen & tipe kamar", () => {
  it("finds locations and room types by id", () => {
    expect(findLocation(locations, 2)?.name).toBe("Delft CPI");
    expect(findLocation(locations, 0)).toBeNull();
    expect(findRoomType(vidaView, 12)?.name).toBe("2BR");
    expect(findRoomType(vidaView, 21)).toBeNull();
    expect(findRoomType(null, 11)).toBeNull();
  });

  it("labels inactive locations", () => {
    expect(locationLabel(vidaView)).toBe("Vida View");
    expect(locationLabel(delft)).toBe("Delft CPI (nonaktif)");
  });

  it("offers active room types plus the selected inactive one", () => {
    expect(roomTypeOptions(vidaView, 11)).toEqual([
      { id: 11, label: "Studio" },
      { id: 12, label: "2BR" },
    ]);
    expect(roomTypeOptions(vidaView, 13).map((o) => o.label)).toContain("Penthouse (nonaktif)");
    expect(roomTypeOptions(null, 11)).toEqual([]);
  });

  it("picks the sole active room type only", () => {
    expect(soleActiveRoomType(delft)?.id).toBe(21);
    expect(soleActiveRoomType(vidaView)).toBeNull();
  });

  it("fills capacity from the room type until the admin edits it", () => {
    const twoBr = findRoomType(vidaView, 12);
    expect(guestsForRoomType(twoBr, 2, false)).toBe(5);
    expect(guestsForRoomType(twoBr, 5, false)).toBeNull();
    expect(guestsForRoomType(twoBr, 2, true)).toBeNull();
    expect(guestsForRoomType(findRoomType(delft, 22), 2, false)).toBeNull();
    expect(guestsForRoomType(null, 2, false)).toBeNull();
  });

  it("explains capacity against the room type default", () => {
    const twoBr = findRoomType(vidaView, 12);
    expect(guestsNote(5, twoBr)).toEqual({ tone: "muted", text: "Sesuai kapasitas bawaan 2BR." });
    expect(guestsNote(4, twoBr)?.text).toBe("Kapasitas bawaan 2BR: 5 tamu.");
    expect(guestsNote(1, twoBr)?.tone).toBe("warning");
    expect(guestsNote(2, null)?.text).toBe("1 sampai 30 tamu.");
  });
});

describe("nilai awal unit baru", () => {
  it("uses ?lokasi= and auto-selects a sole active room type with its capacity", () => {
    const values = newUnitDefaults(locations, 2);
    expect(values.locationId).toBe(2);
    expect(values.roomTypeId).toBe(21);
    expect(values.maxGuests).toBe(3);
    expect(values.isPublished).toBe(true);
    expect(values.isAvailable).toBe(true);
    expect(values.isPromoActive).toBe(false);
    expect(values.isFeatured).toBe(false);
    expect(values.normalPrice).toBeUndefined();
    expect(values.photos).toEqual([]);
  });

  it("leaves apartment and type empty without a preset", () => {
    const values = newUnitDefaults(locations);
    expect(values.locationId).toBe(0);
    expect(values.roomTypeId).toBe(0);
    expect(values.maxGuests).toBe(2);
  });

  it("ignores unknown presets but picks the only apartment", () => {
    expect(initialLocation(locations, 99)).toBeNull();
    expect(initialLocation([vidaView], null)?.id).toBe(1);
    expect(newUnitDefaults([vidaView]).roomTypeId).toBe(0);
  });
});

describe("slug", () => {
  it("builds the automatic slug from name and apartment", () => {
    expect(autoSlug("Studio AT 26X", "vida-view")).toBe("studio-at-26x-vida-view");
    expect(autoSlug("Studio Vida View 12", "vida-view")).toBe("studio-vida-view-12");
    expect(autoSlug("  ", "vida-view")).toBe("");
    expect(autoSlug("Studio", null)).toBe("studio");
  });

  it("cleans the slug while typing without eating the trailing hyphen", () => {
    expect(typingSlug("Studio AT")).toBe("studio-at");
    expect(typingSlug("studio-")).toBe("studio-");
    expect(typingSlug("a--b_c!")).toBe("a-bc");
  });

  it("settles the slug on blur and resumes syncing when it matches the automatic one", () => {
    expect(settleSlug("Studio AT-", "auto")).toEqual({ slug: "studio-at", synced: false });
    expect(settleSlug("", "studio-at-26x-vida-view")).toEqual({ slug: "studio-at-26x-vida-view", synced: true });
    expect(settleSlug("studio-at-26x-vida-view", "studio-at-26x-vida-view").synced).toBe(true);
  });

  it("shows the page address", () => {
    expect(slugAddress("studio-at-26x")).toBe("Alamat halaman: vidaliday.com/unit/studio-at-26x");
    expect(slugAddress("")).toBe("Alamat halaman: vidaliday.com/unit/…");
  });
});

describe("harga", () => {
  it("previews what guests see, like the public card", () => {
    expect(unitPricePreview({ normalPrice: 300000, promoPrice: 280000, isPromoActive: true })).toBe(
      "Tamu melihat: Rp280.000/malam, coret Rp300.000, Hemat 7%",
    );
    expect(unitPricePreview({ normalPrice: 300000, promoPrice: 280000, isPromoActive: false })).toBe(
      "Tamu melihat: Rp300.000/malam",
    );
    expect(
      unitPricePreview({ normalPrice: 300000, promoPrice: 250000, isPromoActive: true, promoBadge: " Promo akhir pekan " }),
    ).toBe("Tamu melihat: Rp250.000/malam, coret Rp300.000, Promo akhir pekan");
    expect(unitPricePreview({ normalPrice: undefined, promoPrice: null, isPromoActive: false })).toBe(
      "Tamu melihat: harga belum lengkap.",
    );
  });

  it("guides the promo price", () => {
    expect(promoPriceNote({ normalPrice: 300000, promoPrice: 280000, isPromoActive: false })?.text).toBe(
      "Dipakai saat promo aktif.",
    );
    expect(promoPriceNote({ normalPrice: 300000, promoPrice: null, isPromoActive: true })?.tone).toBe("warning");
    expect(promoPriceNote({ normalPrice: 300000, promoPrice: 300000, isPromoActive: true })?.text).toBe(
      "Harus lebih murah dari harga normal.",
    );
    expect(promoPriceNote({ normalPrice: 300000, promoPrice: 270000, isPromoActive: true })).toEqual({
      tone: "success",
      text: "Diskon 10% dari harga normal.",
    });
  });

  it("warns about labels the site will not show", () => {
    expect(promoBadgeNote("")).toBeNull();
    expect(promoBadgeNote("Promo akhir pekan")).toBeNull();
    expect(promoBadgeNote("Hemat 30%")).toMatch(/persen/);
    expect(promoBadgeNote("Promo Spesial")).toMatch(/tidak ditampilkan/);
  });

  it("converts weekly and monthly rates to a nightly equivalent", () => {
    expect(rateNote(null, 7, 300000)).toEqual({ tone: "muted", text: "Opsional. Dipakai untuk menginap 7 malam atau lebih." });
    expect(rateNote(1750000, 7, 300000)).toEqual({ tone: "muted", text: "Setara Rp250.000 per malam." });
    expect(rateNote(9000000, 30, 300000)).toEqual({
      tone: "warning",
      text: "Setara Rp300.000 per malam. Tidak lebih murah dari harga per malam.",
    });
  });
});

describe("fasilitas, foto, video, deskripsi", () => {
  it("shows active amenities plus inactive ones already chosen", () => {
    expect(amenityChoices(amenities, [], []).map((a) => a.id)).toEqual([1, 2, 4]);
    expect(amenityChoices(amenities, [3], []).map((a) => a.id)).toEqual([1, 2, 3, 4]);
    expect(amenityChoices(amenities, [], [3]).map((a) => a.id)).toEqual([1, 2, 3, 4]);
  });

  it("toggles ids and maps names in table order", () => {
    expect(toggleId([1, 2], 2)).toEqual([1]);
    expect(toggleId([1], 4)).toEqual([1, 4]);
    expect(amenityNamesFor([4, 1], amenities)).toEqual(["AC", "Wi-Fi"]);
  });

  it("accepts bucket paths and http(s) URLs but not traversal", () => {
    expect(isAllowedPhotoValue("units/abc.webp")).toBe(true);
    expect(isAllowedPhotoValue("/storage/units/abc.jpg")).toBe(true);
    expect(isAllowedPhotoValue("https://images.unsplash.com/photo-1?w=800")).toBe(true);
    expect(isAllowedPhotoValue("units/../settings/logo.png")).toBe(false);
    expect(isAllowedPhotoValue("javascript:alert(1)")).toBe(false);
    expect(isAllowedPhotoValue("  ")).toBe(false);
    expect(isAllowedPhotoValue("units\\abc.webp")).toBe(false);
  });

  it("dedupes photos and keeps the cover first", () => {
    expect(uniquePhotos(["units/a.webp", "/storage/units/a.webp", " units/b.webp ", "units/a.webp"])).toEqual([
      "units/a.webp",
      "units/b.webp",
    ]);
  });

  it("previews YouTube links", () => {
    expect(youtubePreview("https://youtu.be/abc123XYZ00")).toEqual({
      id: "abc123XYZ00",
      thumbnail: "https://i.ytimg.com/vi/abc123XYZ00/hqdefault.jpg",
      watchUrl: "https://www.youtube.com/watch?v=abc123XYZ00",
    });
    expect(youtubePreview("https://vimeo.com/123")).toBeNull();
    expect(youtubeNote("").tone).toBe("muted");
    expect(youtubeNote("https://www.youtube.com/watch?v=abc123XYZ00").tone).toBe("success");
    expect(youtubeNote("https://youtube.com/xyz").tone).toBe("warning");
  });

  it("guides the description length", () => {
    expect(descriptionNote(0).text).toBe("Saran 150–400 karakter.");
    expect(descriptionNote(100).text).toBe("Saran 150–400 karakter. Kurang 50 karakter lagi.");
    expect(descriptionNote(200).tone).toBe("success");
    expect(descriptionNote(600).tone).toBe("muted");
  });
});

describe("status", () => {
  it("explains why a unit may not show up", () => {
    expect(
      statusNotes({ isPublished: true, isAvailable: true, isFeatured: false, photoCount: 2, location: vidaView }),
    ).toEqual([]);
    expect(
      statusNotes({ isPublished: true, isAvailable: false, isFeatured: true, photoCount: 0, location: delft }),
    ).toEqual([
      "Apartemen Delft CPI nonaktif, jadi unit ini belum tampil di situs.",
      "Unit unggulan baru tampil di beranda kalau punya foto.",
      "Unit penuh tidak ditampilkan sebagai unggulan di beranda.",
    ]);
  });
});

describe("perlu dicek", () => {
  const base = {
    tower: "A",
    floorNumber: 26,
    maxGuests: 2,
    isPromoActive: true,
    promoPrice: 280000,
    normalPrice: 300000,
    photos: ["units/a.webp"],
    roomTypeId: 11,
  };

  it("matches the unit list flags", () => {
    expect(formHealthFlags(base, { typeDefaultGuests: 2, promoBadge: null, rentalPeriod: "Malam" })).toEqual([]);
    expect(
      formHealthFlags(
        { ...base, tower: "", maxGuests: 1, photos: ["https://images.unsplash.com/x"], roomTypeId: 0 },
        { typeDefaultGuests: 5, promoBadge: "Hemat 30%", rentalPeriod: "Bulan" },
      ),
    ).toEqual(["tanpa-tipe", "tanpa-tower-lantai", "tamu-janggal", "label-promo-lama", "tanpa-foto", "periode-bukan-harian"]);
  });

  it("ticks items that are fixed in the form", () => {
    const items = healthChecklist(["tanpa-foto", "periode-bukan-harian"], ["tanpa-foto"]);
    expect(items).toEqual([
      { flag: "tanpa-foto", label: "Belum ada foto asli", section: "foto", resolved: false },
      { flag: "periode-bukan-harian", label: "Periode sewa lama bukan per malam", section: "harga", resolved: true },
    ]);
  });
});

describe("error server", () => {
  it("maps server field errors to known form fields", () => {
    expect(
      formFieldErrors({ "photos.3": "Foto rusak", photos: "lain", slug: "Slug sudah dipakai unit lain.", foo: "x" }),
    ).toEqual([
      ["photos", "Foto rusak"],
      ["slug", "Slug sudah dipakai unit lain."],
    ]);
    expect(formFieldErrors(undefined)).toEqual([]);
  });
});

describe("baris DB", () => {
  it("maps validated form data to the units row, with legacy columns", () => {
    const data = unitSchema.parse({
      locationId: 1,
      roomTypeId: 11,
      name: " Studio AT 26X ",
      slug: "studio-at-26x-vida-view",
      tower: "",
      floorNumber: 26,
      viewType: "Kota",
      sizeSqm: null,
      maxGuests: 2,
      normalPrice: 300000,
      promoPrice: null,
      isPromoActive: false,
      promoBadge: "",
      weeklyPrice: 1750000,
      monthlyPrice: null,
      amenityIds: [1, 4],
      photos: ["units/a.webp", "units/b.webp", "units/c.webp"],
      youtubeUrl: "",
      description: "",
      isPublished: true,
      isAvailable: false,
      isFeatured: true,
    });
    const row = buildUnitRow(
      data,
      { roomTypeName: "Studio", amenityNames: ["AC", "Wi-Fi"], photos: ["units/a.webp", "units/b.webp", "units/c.webp"] },
      "2026-10-16T05:00:00.000Z",
    );
    expect(row).toEqual({
      location_id: 1,
      room_type_id: 11,
      room_type: "Studio",
      name: "Studio AT 26X",
      slug: "studio-at-26x-vida-view",
      tower: null,
      floor_number: 26,
      view_type: "Kota",
      size_sqm: null,
      max_guests: 2,
      normal_price: 300000,
      promo_price: 0,
      is_promo_active: false,
      promo_badge: null,
      weekly_price: 1750000,
      monthly_price: null,
      youtube_video_url: null,
      description: null,
      is_published: true,
      is_available: false,
      is_featured: true,
      main_image: "units/a.webp",
      gallery_images: ["units/b.webp", "units/c.webp"],
      facilities_list: ["AC", "Wi-Fi"],
      rental_period: "Malam",
      updated_at: "2026-10-16T05:00:00.000Z",
    });
  });

  it("stores no cover when there are no photos", () => {
    const data = unitSchema.parse({
      locationId: 1,
      roomTypeId: 11,
      name: "Studio",
      slug: "studio",
      maxGuests: 2,
      normalPrice: 300000,
      promoPrice: 250000,
      isPromoActive: true,
      isPublished: false,
      isAvailable: true,
      isFeatured: false,
    });
    const row = buildUnitRow(data, { roomTypeName: "Studio", amenityNames: [], photos: [] }, "now");
    expect(row.main_image).toBeNull();
    expect(row.gallery_images).toEqual([]);
    expect(row.promo_price).toBe(250000);
  });
});

describe("input angka", () => {
  it("keeps digits (and one decimal comma when allowed)", () => {
    expect(sanitizeNumberText("lt. 26")).toBe("26");
    expect(sanitizeNumberText("24.5", true)).toBe("24,5");
    expect(sanitizeNumberText("24,5,1", true)).toBe("24,51");
    expect(sanitizeNumberText("24,567", true)).toBe("24,56");
  });

  it("parses and formats", () => {
    expect(parseNumberText("24,5")).toBe(24.5);
    expect(parseNumberText("")).toBeNull();
    expect(parseNumberText(",")).toBeNull();
    expect(parseNumberText("26")).toBe(26);
    expect(formatNumberText(24.5)).toBe("24,5");
    expect(formatNumberText(null)).toBe("");
  });
});
