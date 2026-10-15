import { describe, expect, it } from "vitest";
import { healthFlags } from "./data-health";
import {
  adminUnitParams,
  EMPTY_ADMIN_FILTER,
  matchesQuery,
  parseAdminUnitFilter,
  queryAdminUnits,
  type AdminUnitRow,
} from "./unit-query";

function row(overrides: Partial<AdminUnitRow>): AdminUnitRow {
  return {
    id: 1,
    name: "Studio AT 26X",
    slug: "studio-at-26x",
    tower: "Ashton",
    floorNumber: 26,
    locationId: 1,
    locationShortName: "Vida View",
    roomTypeId: 11,
    roomTypeName: "Studio",
    maxGuests: 3,
    normalPrice: 300000,
    promoPrice: 280000,
    isPromoActive: true,
    promoBadge: null,
    effectivePrice: 280000,
    isPublished: true,
    isAvailable: true,
    isFeatured: false,
    coverUrl: null,
    updatedAt: "2026-10-01T00:00:00Z",
    flags: [],
    ...overrides,
  };
}

const rows = [
  row({ id: 1 }),
  row({ id: 2, name: "2BR CORNER BV 19V", slug: "2br-corner-bv-19v", tower: "Brentsville", roomTypeId: 14, roomTypeName: "2 Bedroom Corner", effectivePrice: 750000, isAvailable: false, updatedAt: "2026-10-05T00:00:00Z", flags: ["tamu-janggal"] }),
  row({ id: 3, name: "Studio Delft 0812", slug: "studio-delft-0812", tower: null, floorNumber: null, locationId: 2, locationShortName: "Delft CPI", roomTypeId: 21, isPublished: false, isPromoActive: false, effectivePrice: 320000, flags: ["tanpa-tower-lantai"] }),
];

describe("admin unit search", () => {
  it("matches tokens ignoring case, spaces and punctuation", () => {
    expect(matchesQuery(rows[0], "at26x")).toBe(true);
    expect(matchesQuery(rows[1], "vida 2br corner")).toBe(true);
    expect(matchesQuery(rows[1], "brentsville")).toBe(true);
    expect(matchesQuery(rows[0], "delft")).toBe(false);
  });

  it("filters, sorts and counts quick chips", () => {
    const result = queryAdminUnits(rows, { ...EMPTY_ADMIN_FILTER, lokasi: 1 });
    expect(result.items.map((r) => r.id)).toEqual([2, 1]);
    expect(result.counts).toEqual({ semua: 2, cek: 1, penuh: 1, promo: 2, draft: 0, unggulan: 0 });
    expect(queryAdminUnits(rows, { ...EMPTY_ADMIN_FILTER, cek: true, urut: "nama" }).items.map((r) => r.id)).toEqual([2, 3]);
    expect(queryAdminUnits(rows, { ...EMPTY_ADMIN_FILTER, status: "draft" }).total).toBe(1);
    expect(queryAdminUnits(rows, { ...EMPTY_ADMIN_FILTER, urut: "termahal" }).items[0].id).toBe(2);
  });

  it("parses and serializes URL state", () => {
    const filter = parseAdminUnitFilter(new URLSearchParams("q=AT+26&lokasi=1&tipe=11&status=tampil&stok=penuh&promo=aktif&unggulan=1&cek=1&urut=nama&hal=2"));
    expect(filter).toEqual({ q: "AT 26", lokasi: 1, tipe: 11, status: "tampil", stok: "penuh", promo: "aktif", unggulan: true, cek: true, urut: "nama", hal: 2 });
    expect(parseAdminUnitFilter(adminUnitParams(filter))).toEqual(filter);
    expect(parseAdminUnitFilter({ tipe: "11", status: "x", hal: "-1" })).toEqual(EMPTY_ADMIN_FILTER);
  });

  it("clamps the page to the last page", () => {
    expect(queryAdminUnits(rows, { ...EMPTY_ADMIN_FILTER, hal: 9 }).page).toBe(1);
  });
});

describe("healthFlags", () => {
  const base = {
    tower: "Ashton",
    floor_number: 26,
    max_guests: 3,
    promo_badge: null,
    is_promo_active: true,
    promo_price: 280000,
    normal_price: 300000,
    main_image: "units/a.jpg",
    gallery_images: [],
    rental_period: "Malam",
    room_type_id: 11,
  };

  it("is clean for a healthy unit", () => {
    expect(healthFlags(base, 3)).toEqual([]);
  });

  it("flags data that needs a human check", () => {
    expect(
      healthFlags(
        {
          ...base,
          tower: null,
          max_guests: 1,
          promo_badge: "Hemat 27% (Best Seller)",
          main_image: "https://images.unsplash.com/photo-1",
          promo_price: 300000,
          rental_period: "Bulan",
          room_type_id: null,
        },
        7,
      ),
    ).toEqual([
      "tanpa-tipe",
      "tanpa-tower-lantai",
      "tamu-janggal",
      "label-promo-lama",
      "tanpa-foto",
      "harga-promo-janggal",
      "periode-bukan-harian",
    ]);
  });
});
