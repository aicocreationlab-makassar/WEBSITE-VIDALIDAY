import { describe, expect, it } from "vitest";
import { formatBadgeCount, getAdminPageTitle, isNavItemActive } from "./admin-nav";

describe("isNavItemActive", () => {
  it("Dashboard hanya aktif di /admin persis", () => {
    expect(isNavItemActive("/admin", "/admin")).toBe(true);
    expect(isNavItemActive("/admin/", "/admin")).toBe(true);
    expect(isNavItemActive("/admin/units", "/admin")).toBe(false);
  });

  it("menu lain aktif untuk halaman turunannya", () => {
    expect(isNavItemActive("/admin/units", "/admin/units")).toBe(true);
    expect(isNavItemActive("/admin/units/new", "/admin/units")).toBe(true);
    expect(isNavItemActive("/admin/units/abc-123", "/admin/units")).toBe(true);
    expect(isNavItemActive("/admin/unitsx", "/admin/units")).toBe(false);
    expect(isNavItemActive("/admin/leads", "/admin/units")).toBe(false);
  });
});

describe("getAdminPageTitle", () => {
  it("memakai label menu yang cocok", () => {
    expect(getAdminPageTitle("/admin")).toBe("Dashboard");
    expect(getAdminPageTitle("/admin/leads")).toBe("Permintaan sewa");
    expect(getAdminPageTitle("/admin/locations")).toBe("Apartemen & tipe kamar");
    expect(getAdminPageTitle("/admin/settings/")).toBe("Pengaturan");
  });

  it("punya judul khusus untuk form tambah dan ubah", () => {
    expect(getAdminPageTitle("/admin/units/new")).toBe("Tambah unit");
    expect(getAdminPageTitle("/admin/units/0b7c3f2e")).toBe("Ubah unit");
    expect(getAdminPageTitle("/admin/locations/delft-cpi")).toBe("Ubah apartemen");
  });

  it("jatuh ke judul umum di luar menu", () => {
    expect(getAdminPageTitle("/dev-preview/admin-shell")).toBe("Panel admin");
  });
});

describe("formatBadgeCount", () => {
  it("membatasi tampilan di 99+", () => {
    expect(formatBadgeCount(3)).toBe("3");
    expect(formatBadgeCount(99)).toBe("99");
    expect(formatBadgeCount(120)).toBe("99+");
  });
});
