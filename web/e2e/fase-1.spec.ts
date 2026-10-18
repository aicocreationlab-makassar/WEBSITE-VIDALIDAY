/**
 * E2E fase 1: bingkai situs publik, halaman placeholder, login admin, 404, header keamanan.
 * Dijalankan di dua project: m390 (390x844) dan d1280 (1280x800).
 *
 * Cara menjalankan (dari folder web/):
 *   npm run build && npx next start -p 3100            (di terminal lain)
 *   npm run e2e -- e2e/fase-1.spec.ts
 *
 * Shell admin diuji di fase 5 dengan sesi admin asli.
 *
 * Screenshot tersimpan di test-results/screens/<project>-<nama>.png.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  clickUntilVisible,
  expectNoHorizontalOverflow,
  gotoOk,
  isMobile,
  scrollPastHeroSearch,
  snap,
} from "./helpers";

const WA_HREF = /^https:\/\/wa\.me\/\d+/;
const ACCESS_DENIED = "Akun ini tidak punya akses admin.";
const FOOTER = "footer[data-testid='site-footer']";
const APARTMENT_LINKS = "a[href^='/apartemen/']";

/** Tautan profil apartemen di footer (`/apartemen/{slug}`), tanpa tautan tipe kamar di bawahnya. */
async function countFooterApartmentLinks(page: Page): Promise<number> {
  await expect(page.locator(FOOTER)).toBeAttached();
  const hrefs = await page
    .locator(FOOTER)
    .locator(APARTMENT_LINKS)
    .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
  return hrefs.filter((href) => /^\/apartemen\/[^/]+$/.test(href)).length;
}

// ---------------------------------------------------------------------------
// a. Tingkat HTTP (tanpa browser)
// ---------------------------------------------------------------------------

test.describe("HTTP: pengalihan dan header keamanan", () => {
  for (const url of ["/admin", "/admin/units"]) {
    test(`${url} tanpa sesi dialihkan (307) ke /admin/login`, async ({ request }) => {
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status(), `Status ${url}`).toBe(307);
      expect(response.headers()["location"], `Header location ${url}`).toMatch(/\/admin\/login$/);
    });
  }

  test("/login dialihkan permanen (308) ke /admin/login", async ({ request }) => {
    const response = await request.get("/login", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toMatch(/\/admin\/login$/);
  });

  test("beranda mengirim X-Content-Type-Options: nosniff", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"], "Header X-Powered-By harus mati").toBeUndefined();
  });

  test("login admin mengirim X-Frame-Options: DENY", async ({ request }) => {
    const response = await request.get("/admin/login");
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-robots-tag"] ?? "").toContain("noindex");
  });
});

// ---------------------------------------------------------------------------
// b. Beranda
// ---------------------------------------------------------------------------

test.describe("Beranda", () => {
  test("judul, logo, tombol WhatsApp, dan footer tampil tanpa geser samping", async ({ page }, testInfo) => {
    await gotoOk(page, "/");

    // Judul hero diatur pemilik di Pengaturan; cukup satu H1 yang berisi teks.
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(/\S{3,}/);
    await expect(page.getByRole("link", { name: "VIDALIDAY, ke beranda" })).toBeVisible();
    await expect(page.locator("main#konten")).toBeVisible();

    // Satu tombol WhatsApp di header: ikon saja di HP, ikon + "Tanya admin" di desktop.
    const headerWa = page.getByTestId("header-whatsapp");
    await expect(headerWa).toBeVisible();
    await expect(headerWa).toHaveAccessibleName("Tanya admin");
    await expect(headerWa).toHaveAttribute("href", WA_HREF);
    await expect(page.locator("header").getByRole("link", { name: /tanya admin|whatsapp/i })).toHaveCount(1);

    const footer = page.locator(FOOTER);
    await expect(footer).toBeVisible();
    await expect(footer.getByRole("link", { name: "Kebijakan privasi", exact: true })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Tentang kami", exact: true })).toBeVisible();

    // Gelembung chat menggantikan tombol WA mengambang (PRD 6.11).
    const launcher = page.getByTestId("chat-launcher");
    if (isMobile(testInfo)) {
      // Di HP gelembung menyingkir selama kotak pencarian hero terlihat (tidak menutupi tombol Cari unit).
      await expect(launcher).toBeHidden();
      await scrollPastHeroSearch(page);
    }
    await expect(launcher).toBeVisible();
    await expect(launcher).toBeInViewport();
    await expect(launcher).toHaveAttribute("aria-label", "Tanya kami, buka chat bantuan");
    await expect(page.getByTestId("fab-whatsapp")).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
    await snap(page, testInfo, "home");
  });

  test("mobile: menu sheet terbuka, berisi tautan, dan Esc mengembalikan fokus", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), "Menu sheet hanya tampil di bawah md");
    await gotoOk(page, "/");
    const apartmentCount = await countFooterApartmentLinks(page);

    // Di HP tombol WhatsApp header hanya ikon (teksnya untuk pembaca layar), lebar 44px.
    const headerWa = page.getByTestId("header-whatsapp");
    await expect(headerWa).toBeVisible();
    const waBox = await headerWa.boundingBox();
    expect(waBox?.width ?? 0).toBeLessThanOrEqual(48);

    const trigger = page.getByRole("button", { name: "Buka menu", exact: true });
    await expect(trigger).toBeVisible();

    const menu = page.getByRole("dialog", { name: "Menu", exact: true });
    await clickUntilVisible(trigger, menu);
    await expect(menu.getByRole("heading", { name: "Menu", exact: true })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Cari unit", exact: true })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Tentang kami", exact: true })).toBeVisible();
    await expect(menu.getByRole("link", { name: "FAQ", exact: true })).toBeVisible();
    // Satu tautan per apartemen; sumbernya sama dengan kolom Apartemen di footer.
    await expect(menu.locator(APARTMENT_LINKS)).toHaveCount(apartmentCount);
    await snap(page, testInfo, "home-menu");

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("mobile: tautan Cari unit di menu membuka /sewa dan menutup menu", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), "Menu sheet hanya tampil di bawah md");
    await gotoOk(page, "/");

    const menu = page.getByRole("dialog", { name: "Menu", exact: true });
    await clickUntilVisible(page.getByRole("button", { name: "Buka menu", exact: true }), menu);
    await menu.getByRole("link", { name: "Cari unit", exact: true }).click();

    await expect(page).toHaveURL(/\/sewa$/);
    // Fase 3 mengganti placeholder: judul /sewa berbentuk "N unit di ...".
    await expect(page.getByTestId("sewa-heading")).toHaveText(/\d+ unit di \S/);
    await expect(menu).toBeHidden();
  });

  test("desktop: navigasi header lengkap, tombol menu tersembunyi", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), "Navigasi header hanya tampil di md ke atas");
    await gotoOk(page, "/");
    const apartmentCount = await countFooterApartmentLinks(page);

    const header = page.locator("header").filter({ has: page.getByTestId("header-whatsapp") });
    await expect(header.getByRole("link", { name: "Cari unit", exact: true })).toBeVisible();
    await expect(header.getByRole("link", { name: "Tentang kami", exact: true })).toBeVisible();

    // Satu tombol WhatsApp: ikon + teks "Tanya admin" (lebih lebar dari tombol ikon 44px).
    const askAdmin = header.getByRole("link", { name: "Tanya admin", exact: true });
    await expect(askAdmin).toBeVisible();
    await expect(askAdmin).toHaveAttribute("href", WA_HREF);
    await expect(askAdmin).toHaveAttribute("data-testid", "header-whatsapp");
    const askBox = await askAdmin.boundingBox();
    expect(askBox?.width ?? 0).toBeGreaterThan(48);
    await expect(page.getByRole("button", { name: "Buka menu" })).toBeHidden();

    // Dropdown Apartemen hanya dirender bila ada apartemen aktif (tanpa env Supabase: kosong).
    const apartmentsTrigger = header.getByRole("button", { name: "Apartemen", exact: true });
    if (apartmentCount > 0) {
      const dropdown = page.getByRole("menu");

      // Sorot mouse langsung membuka menu; mouse pergi menutupnya tanpa klik.
      await apartmentsTrigger.hover();
      await expect(dropdown).toBeVisible();
      await expect(dropdown.getByRole("menuitem")).toHaveCount(apartmentCount);
      await page.mouse.move(640, 640);
      await expect(dropdown).toBeHidden();

      // Dibuka dengan hover, Esc menutupnya walau fokus tidak di menu (WCAG 1.4.13).
      await apartmentsTrigger.hover();
      await expect(dropdown).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dropdown).toBeHidden();
      await page.mouse.move(640, 640);

      // Klik dan Esc tetap bekerja (keyboard dan sentuh).
      await clickUntilVisible(apartmentsTrigger, dropdown);
      await expect(dropdown.getByRole("menuitem")).toHaveCount(apartmentCount);
      await page.keyboard.press("Escape");
      await expect(dropdown).toBeHidden();
      await expect(apartmentsTrigger).toBeFocused();
    } else {
      await expect(apartmentsTrigger).toHaveCount(0);
    }
  });

  // d. Tautan lompat
  test("Tab pertama memfokuskan tautan Langsung ke konten", async ({ page }) => {
    await gotoOk(page, "/");
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: "Langsung ke konten", exact: true });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveAttribute("href", "#konten");

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#konten$/);
  });
});

// ---------------------------------------------------------------------------
// c. Halaman placeholder
// ---------------------------------------------------------------------------

// Rute publik (isi tiap halaman diuji di spec fase 3/4). h1 null = cukup ada satu judul H1.
const PLACEHOLDER_ROUTES = [
  { path: "/sewa", h1: null, name: "sewa" },
  { path: "/about", h1: null, name: "about" },
  { path: "/kebijakan-privasi", h1: "Kebijakan privasi", name: "kebijakan-privasi" },
] as const;

test.describe("Halaman placeholder", () => {
  for (const route of PLACEHOLDER_ROUTES) {
    test(`${route.path}: judul ${route.h1 ?? "H1"}, gelembung chat ada`, async ({ page }, testInfo) => {
      await gotoOk(page, route.path);

      await expect(
        route.h1
          ? page.getByRole("heading", { level: 1, name: route.h1, exact: true })
          : page.getByRole("heading", { level: 1 }).first(),
      ).toBeVisible();
      await expect(page.getByTestId("header-whatsapp")).toBeVisible();
      await expect(page.locator(FOOTER)).toBeVisible();

      // Gelembung chat ada di semua halaman publik, termasuk kebijakan privasi.
      await expect(page.getByTestId("chat-launcher")).toBeVisible();
      await expect(page.getByTestId("fab-whatsapp")).toHaveCount(0);

      await expectNoHorizontalOverflow(page);
      await snap(page, testInfo, route.name);
    });
  }
});

// ---------------------------------------------------------------------------
// e. Login admin
// ---------------------------------------------------------------------------

test.describe("Login admin", () => {
  test("form login tampil dengan label yang benar", async ({ page }, testInfo) => {
    await gotoOk(page, "/admin/login");

    await expect(page.getByRole("heading", { level: 1, name: "Masuk ke panel admin" })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    const password = page.getByLabel("Kata sandi", { exact: true });
    await expect(password).toBeVisible();
    await expect(password).toHaveAttribute("type", "password");
    await expect(page.getByRole("button", { name: "Masuk", exact: true })).toBeVisible();
    await expect(page.getByText(ACCESS_DENIED)).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
    await snap(page, testInfo, "admin-login");
  });

  test("?akses=ditolak menampilkan pesan akses ditolak", async ({ page }, testInfo) => {
    await gotoOk(page, "/admin/login?akses=ditolak");

    await expect(page.getByRole("alert").filter({ hasText: ACCESS_DENIED })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Masuk ke panel admin" })).toBeVisible();
    await snap(page, testInfo, "admin-login-ditolak");
  });
});

// ---------------------------------------------------------------------------
// f. 404
// ---------------------------------------------------------------------------

test.describe("Halaman tidak ditemukan", () => {
  test("rute tak dikenal menjawab 404 dengan tautan pulang", async ({ page }, testInfo) => {
    const response = await page.goto("/halaman-yang-tidak-ada");
    expect(response?.status(), "Status HTTP rute tak dikenal").toBe(404);

    await expect(page.getByRole("heading", { level: 1, name: "Halaman tidak ditemukan" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ke beranda", exact: true })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Cari unit", exact: true })).toHaveAttribute("href", "/sewa");

    await expectNoHorizontalOverflow(page);
    await snap(page, testInfo, "not-found");
  });
});
