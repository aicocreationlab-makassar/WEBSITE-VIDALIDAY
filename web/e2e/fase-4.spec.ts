/**
 * E2E fase 4: detail unit, form sewa → WhatsApp, apartemen, 404, SEO.
 * Butuh data asli Supabase. Jalankan dari web/:
 *   npm run build && npx next start -p 3100            (terminal lain)
 *   npm run e2e -- e2e/fase-4.spec.ts
 *
 * Uji penyimpanan sungguhan ke tabel leads hanya kalau E2E_REAL_LEAD=1 (maks. 5 lead "UJI QA" yang disetujui
 * pemilik; tandai Batal di admin setelahnya). Tanpa itu, Server Action dibatalkan untuk mensimulasikan
 * Supabase mati, dan WhatsApp tetap harus terbuka tanpa kode permintaan.
 */
import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, gotoOk, isMobile, snap } from "./helpers";

const REAL_LEAD = process.env.E2E_REAL_LEAD === "1";

/** Slug unit pertama dari hasil /sewa (unit tersedia, urutan rekomendasi). */
async function firstUnitPath(page: Page): Promise<string> {
  await gotoOk(page, "/sewa");
  const link = page.getByTestId("unit-card").first().getByRole("link").first();
  const href = await link.getAttribute("href");
  expect(href, "Kartu unit pertama di /sewa").toMatch(/^\/unit\//);
  return href!;
}

/** Isi form sewa dengan data uji yang valid. */
async function fillBooking(page: Page, name: string) {
  const dialog = page.getByRole("dialog", { name: "Atur rencana menginap" });
  await expect(dialog).toBeVisible();
  const fullName = dialog.getByLabel("Nama lengkap");
  if (await fullName.isVisible()) {
    await fullName.fill(name);
    await dialog.getByLabel("Nomor WhatsApp").fill("0812 0000 0101");
  }
  return dialog;
}

/** Tangkap URL wa.me: mobile = tab yang sama, desktop = tab baru. */
async function captureWhatsapp(page: Page, mobile: boolean, submit: () => Promise<void>): Promise<string> {
  if (mobile) {
    let captured = "";
    await page.route("https://wa.me/**", async (route) => {
      captured = route.request().url();
      await route.fulfill({ status: 200, contentType: "text/html", body: "<title>wa</title>" });
    });
    await submit();
    await expect.poll(() => captured, { timeout: 15_000 }).toMatch(/^https:\/\/wa\.me\//);
    return captured;
  }
  // Desktop: tab baru. Cegat wa.me di tingkat context (route halaman tidak berlaku untuk tab baru) supaya
  // tidak bergantung pada internet; wa.me asli juga mengalihkan ke api.whatsapp.com.
  let captured = "";
  await page.context().route("https://wa.me/**", async (route) => {
    captured = route.request().url();
    await route.fulfill({ status: 200, contentType: "text/html", body: "<title>wa</title>" });
  });
  const [popup] = await Promise.all([page.context().waitForEvent("page"), submit()]);
  await expect.poll(() => captured, { timeout: 15_000 }).toMatch(/^https:\/\/wa\.me\//);
  await popup.close();
  return captured;
}

test.describe("Detail unit", () => {
  test("judul, harga, CTA, peta, dan tanpa geser samping", async ({ page }, testInfo) => {
    const path = await firstUnitPath(page);
    await gotoOk(page, path);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Rp[\d.]+/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Lihat peta" })).toHaveAttribute("href", "#lokasi");

    if (isMobile(testInfo)) {
      const bar = page.getByTestId("sticky-cta");
      await expect(bar).toBeInViewport();
      await expect(bar.getByRole("button", { name: /Sewa sekarang|Tanya ketersediaan/ })).toBeVisible();
    } else {
      const card = page.getByTestId("booking-card");
      await expect(card).toBeVisible();
      await expect(card.getByLabel("Check-in")).toBeVisible();
    }

    const map = page.locator("#lokasi iframe");
    await expect(map).toHaveAttribute("loading", "lazy");
    await expect(map).toHaveAttribute("title", /^Peta lokasi /);
    await expect(page.locator("#lokasi").getByRole("link", { name: /Buka di Google Maps/ })).toBeVisible();

    await expectNoHorizontalOverflow(page);
    await snap(page, testInfo, "unit");
  });

  test("galeri membuka lightbox kalau ada >= 2 foto", async ({ page }, testInfo) => {
    await gotoOk(page, await firstUnitPath(page));
    const opener = page.getByRole("button", { name: /Lihat semua foto/ }).first();
    test.skip((await opener.count()) === 0, "Unit pertama punya kurang dari 2 foto");
    await opener.click();
    const lightbox = page.getByRole("dialog", { name: "Galeri foto" });
    await expect(lightbox).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await snap(page, testInfo, "unit-lightbox");
    await page.keyboard.press("Escape");
    await expect(lightbox).toBeHidden();
  });

  test("slug yang tidak ada menjawab 404", async ({ request }) => {
    const response = await request.get("/unit/unit-yang-tidak-ada-xyz");
    expect(response.status()).toBe(404);
  });
});

test.describe("Form sewa", () => {
  test("isian kosong menampilkan error dan tidak membuka WhatsApp", async ({ page }, testInfo) => {
    await gotoOk(page, await firstUnitPath(page));
    const trigger = isMobile(testInfo)
      ? page.getByTestId("sticky-cta").getByRole("button")
      : page.getByTestId("booking-card").getByRole("button", { name: /Sewa sekarang|Tanya ketersediaan/ });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Atur rencana menginap" });
    await expect(dialog).toBeVisible();

    let opened = false;
    await page.route("https://wa.me/**", (route) => {
      opened = true;
      return route.abort();
    });
    page.context().on("page", () => {
      opened = true;
    });

    const name = dialog.getByLabel("Nama lengkap");
    if (await name.isVisible()) await name.fill("");
    await dialog.getByRole("button", { name: "Kirim via WhatsApp" }).click();
    await expect(dialog.getByText("Tulis nama lengkap minimal 2 huruf.")).toBeVisible();
    await expect(dialog.getByTestId("booking-estimate")).toBeVisible();
    expect(opened).toBe(false);
    await snap(page, testInfo, "booking-error");
  });

  test("Supabase gagal → WhatsApp tetap terbuka tanpa kode", async ({ page }, testInfo) => {
    test.skip(REAL_LEAD, "Mode lead sungguhan");
    await gotoOk(page, await firstUnitPath(page));
    // Batalkan request Server Action (header next-action) untuk mensimulasikan database mati.
    await page.route("**/*", (route) =>
      route.request().method() === "POST" && route.request().headers()["next-action"] ? route.abort() : route.fallback(),
    );
    const trigger = isMobile(testInfo)
      ? page.getByTestId("sticky-cta").getByRole("button")
      : page.getByTestId("booking-card").getByRole("button", { name: /Sewa sekarang|Tanya ketersediaan/ });
    await trigger.click();
    const dialog = await fillBooking(page, "UJI QA tanpa simpan");
    const url = await captureWhatsapp(page, isMobile(testInfo), () =>
      dialog.getByRole("button", { name: "Kirim via WhatsApp" }).click(),
    );
    const text = decodeURIComponent(new URL(url).searchParams.get("text") ?? "");
    expect(text).toContain("UJI QA tanpa simpan");
    expect(text).not.toContain("Kode permintaan");
  });

  test("lead sungguhan tersimpan dan pesan berisi kode (E2E_REAL_LEAD=1)", async ({ page }, testInfo) => {
    test.skip(!REAL_LEAD, "Set E2E_REAL_LEAD=1 untuk menulis lead uji ke produksi");
    test.skip(!isMobile(testInfo), "Cukup satu lead uji per putaran");
    await gotoOk(page, await firstUnitPath(page));
    await page.getByTestId("sticky-cta").getByRole("button").click();
    const dialog = await fillBooking(page, "UJI QA");
    const url = await captureWhatsapp(page, true, () => dialog.getByRole("button", { name: "Kirim via WhatsApp" }).click());
    const text = decodeURIComponent(new URL(url).searchParams.get("text") ?? "");
    expect(text).toMatch(/Kode permintaan: VDL-[0-9A-F]{6}/);
  });
});

test.describe("Halaman lain dan SEO", () => {
  test("apartemen: profil, tipe kamar, CTA; slug tak dikenal 404", async ({ page, request }, testInfo) => {
    await gotoOk(page, "/");
    const radio = page.locator('input[type="radio"][name="lokasi"]').first();
    test.skip((await radio.count()) === 0, "Belum ada apartemen");
    const slug = await radio.getAttribute("value");
    await gotoOk(page, `/apartemen/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Lihat semua unit di/ }).first()).toHaveAttribute("href", new RegExp(`lokasi=${slug}`));
    await expectNoHorizontalOverflow(page);
    await snap(page, testInfo, "apartemen");
    expect((await request.get("/apartemen/tidak-ada-xyz")).status()).toBe(404);
  });

  test("sitemap, robots, dan OG image", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toContain("/sewa");
    expect(xml).toMatch(/\/unit\/[a-z0-9-]+/);

    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow:\s*\/admin/);
    expect(robots).toContain("sitemap.xml");

    const og = await request.get("/opengraph-image");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toContain("image/png");
  });

  test("JSON-LD beranda dan detail bisa di-parse", async ({ page }) => {
    for (const path of ["/", await firstUnitPath(page)]) {
      await gotoOk(page, path);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(blocks.length, `JSON-LD di ${path}`).toBeGreaterThan(0);
      for (const block of blocks) expect(() => JSON.parse(block)).not.toThrow();
    }
  });
});
