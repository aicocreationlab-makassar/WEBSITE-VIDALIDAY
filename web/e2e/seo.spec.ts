import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, gotoOk, snap } from "./helpers";

// SEO dan AI-crawlability (PRD 6.9): landing tipe kamar, sitemap bergambar, robots untuk perayap AI,
// llms.txt, canonical/noindex /sewa, breadcrumb dan ringkasan di unit.

async function firstApartmentSlug(page: Page): Promise<string | null> {
  await gotoOk(page, "/");
  const radio = page.locator('input[type="radio"][name="lokasi"]').first();
  if ((await radio.count()) === 0) return null;
  return radio.getAttribute("value");
}

async function firstLandingHref(page: Page, slug: string): Promise<string | null> {
  await gotoOk(page, `/apartemen/${slug}`);
  const link = page.locator(`a[href^="/apartemen/${slug}/"]`).first();
  if ((await link.count()) === 0) return null;
  return link.getAttribute("href");
}

function jsonLdTypes(blocks: string[]): string[] {
  return blocks.flatMap((block) => {
    const parsed = JSON.parse(block) as { "@type": string } | { "@type": string }[];
    return Array.isArray(parsed) ? parsed.map((node) => node["@type"]) : [parsed["@type"]];
  });
}

test.describe("SEO", () => {
  test("landing tipe kamar: H1, ringkasan, kartu unit, canonical, JSON-LD, 404 untuk tipe asing", async ({ page, request }, testInfo) => {
    const slug = await firstApartmentSlug(page);
    test.skip(!slug, "Belum ada apartemen");
    const href = await firstLandingHref(page, slug!);
    test.skip(!href, "Belum ada tipe kamar dengan unit");

    await gotoOk(page, href!);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Sewa .+ di .+ Makassar/);
    await expect(page.getByTestId("summary-box")).toBeVisible();
    expect(await page.getByTestId("unit-card").count()).toBeGreaterThan(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${href}$`));
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    const types = jsonLdTypes(await page.locator('script[type="application/ld+json"]').allTextContents());
    expect(types).toContain("ItemList");
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("FAQPage");
    await expectNoHorizontalOverflow(page);
    await snap(page, testInfo, "landing-tipe");

    expect((await request.get(`/apartemen/${slug}/tipe-tidak-ada-xyz`)).status()).toBe(404);
    expect((await request.get("/apartemen/tidak-ada-xyz/studio")).status()).toBe(404);
  });

  test("sitemap bergambar, robots mengizinkan perayap AI, llms.txt tersedia", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toMatch(/\/apartemen\/[a-z0-9-]+\/[a-z0-9-]+</);
    expect(xml).toContain("<image:loc>");
    expect(xml).toMatch(/<url>\s*<loc>[^<]*\/about<\/loc>\s*<lastmod>/);

    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/User-Agent:\s*GPTBot/i);
    expect(robots).toMatch(/User-Agent:\s*ClaudeBot/i);
    expect(robots).toMatch(/Disallow:\s*\/admin/);
    expect(robots).toMatch(/Disallow:\s*\/chat-data/);

    for (const path of ["/llms.txt", "/llms-full.txt"]) {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("text/plain");
      const text = await response.text();
      expect(text.startsWith("# VIDALIDAY")).toBe(true);
      expect(text).toContain("Rp");
      expect(text).toContain("/apartemen/");
    }
  });

  test("/sewa: berfilter noindex, apartemen + tipe canonical ke landing", async ({ page }) => {
    await gotoOk(page, "/sewa?urut=termurah");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    const slug = await firstApartmentSlug(page);
    test.skip(!slug, "Belum ada apartemen");
    await gotoOk(page, `/sewa?lokasi=${slug}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/sewa\\?lokasi=${slug}$`));
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);

    const landing = await firstLandingHref(page, slug!);
    test.skip(!landing, "Belum ada tipe kamar dengan unit");
    const tipe = landing!.split("/").pop();
    await gotoOk(page, `/sewa?lokasi=${slug}&tipe=${tipe}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${landing}$`));
  });

  test("/sewa: Googlebot menerima canonical dan robots di <head>, bukan di-stream ke <body>", async ({ request }) => {
    const googlebot = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
    const response = await request.get("/sewa?urut=termurah", { headers: { "user-agent": googlebot } });
    expect(response.status()).toBe(200);
    const html = await response.text();
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toMatch(/<meta name="robots" content="[^"]*noindex/);
    expect(head).toMatch(/<link rel="canonical" href="[^"]+\/sewa"/);
  });

  test("unit: breadcrumb memuat tipe, kalimat ringkasan, tanpa FAQPage berulang", async ({ page }) => {
    await gotoOk(page, "/sewa");
    const href = await page.getByTestId("unit-card").first().getByRole("link").first().getAttribute("href");
    test.skip(!href, "Belum ada unit");
    await gotoOk(page, href!);
    await expect(page.getByTestId("unit-summary")).toContainText(/Rp\d/);
    const types = jsonLdTypes(await page.locator('script[type="application/ld+json"]').allTextContents());
    // FAQ umum sudah ditandai di beranda dan profil apartemen, tidak diulang di setiap unit.
    expect(types).not.toContain("FAQPage");
    expect(types).toContain("BreadcrumbList");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${href}$`));
  });
});
