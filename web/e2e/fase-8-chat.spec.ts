import { expect, test, type Page } from "@playwright/test";
import { clickUntilVisible, expectNoHorizontalOverflow, gotoOk, isMobile, snap } from "./helpers";

// Bot chat "Asisten VIDALIDAY" (PRD 6.11): dibuka dari gelembung, menjawab dari data situs, typo
// ditoleransi, tautan ke halaman unit, tombol WhatsApp bila tidak paham, riwayat di sessionStorage.
// Gerak dikurangi supaya jeda "berpikir" hanya 120 ms.

const LAUNCHER = "chat-launcher";
const DIALOG_NAME = /Asisten VIDALIDAY/;

async function openChat(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const launcher = page.getByTestId(LAUNCHER);
  const dialog = page.getByRole("dialog", { name: DIALOG_NAME });
  await clickUntilVisible(launcher, dialog);
  // Data unit dimuat dulu; kotak tulis aktif setelah itu.
  const input = dialog.getByLabel("Tulis pertanyaan");
  await expect(input).toBeEnabled({ timeout: 20_000 });
  return { launcher, dialog, input };
}

async function send(page: Page, text: string) {
  const dialog = page.getByRole("dialog", { name: DIALOG_NAME });
  const input = dialog.getByLabel("Tulis pertanyaan");
  await input.fill(text);
  await input.press("Enter");
  // Gelembung tamu tampil, lalu jawaban bot (indikator mengetik hilang).
  await expect(dialog.getByText(text, { exact: true })).toBeVisible();
  await expect(dialog.getByTestId("chat-typing")).toHaveCount(0, { timeout: 15_000 });
  return dialog;
}

test.describe("Chat bantuan", () => {
  test("membuka chat, menjawab harga dengan typo, menautkan unit, lalu Esc menutup", async ({ page }, testInfo) => {
    await gotoOk(page, "/");
    const { launcher, dialog } = await openChat(page);
    await expect(dialog.getByText("Asisten VIDALIDAY").first()).toBeVisible();

    await send(page, "brp hrg studio?");
    const log = dialog.getByRole("log");
    await expect(log).toContainText(/Rp\d/);
    const unitLinks = log.locator('a[href^="/unit/"]');
    expect(await unitLinks.count()).toBeGreaterThan(0);
    expect(await unitLinks.count()).toBeLessThanOrEqual(4);
    await expectNoHorizontalOverflow(page);
    await snap(page, testInfo, "chat-harga");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(launcher).toBeFocused();
  });

  test("pertanyaan yang tidak dipahami menawarkan WhatsApp admin berisi pertanyaannya", async ({ page }) => {
    await gotoOk(page, "/");
    const { dialog } = await openChat(page);
    await send(page, "xyzzy qwerty");
    const wa = dialog.getByRole("link", { name: "Tanya admin via WhatsApp" }).last();
    await expect(wa).toBeVisible();
    const href = await wa.getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(decodeURIComponent(href ?? "")).toContain("xyzzy qwerty");
  });

  test("riwayat bertahan setelah muat ulang dan Mulai ulang mengosongkannya", async ({ page }) => {
    await gotoOk(page, "/");
    await openChat(page);
    await send(page, "check in jam berapa?");
    await page.reload();
    const { dialog } = await openChat(page);
    await expect(dialog.getByText("check in jam berapa?", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Mulai ulang percakapan" }).click();
    await expect(dialog.getByText("check in jam berapa?", { exact: true })).toHaveCount(0);
  });

  test("mobile: gelembung berada di atas bar CTA halaman unit", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), "Bar CTA hanya di HP");
    await gotoOk(page, "/sewa");
    const href = await page.getByTestId("unit-card").first().getByRole("link").first().getAttribute("href");
    expect(href).toMatch(/^\/unit\//);
    await gotoOk(page, href!);
    const launcher = await page.getByTestId(LAUNCHER).boundingBox();
    const cta = await page.getByTestId("sticky-cta").boundingBox();
    expect(launcher && cta).toBeTruthy();
    expect(launcher!.y + launcher!.height).toBeLessThanOrEqual(cta!.y + 1);
  });

  test("/chat-data dilayani sebagai JSON yang tidak diindeks", async ({ request }) => {
    const response = await request.get("/chat-data");
    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toBe("noindex");
    const body = (await response.json()) as { v: number; units: unknown[]; settings: { whatsappNumber: string } };
    expect(body.v).toBe(1);
    expect(Array.isArray(body.units)).toBe(true);
    expect(body.settings.whatsappNumber).toMatch(/^62\d+/);
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /chat-data");
  });
});
