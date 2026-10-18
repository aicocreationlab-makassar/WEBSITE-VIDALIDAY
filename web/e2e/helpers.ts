import path from "node:path";
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

/** Folder screenshot, relatif terhadap folder kerja (jalankan Playwright dari `web/`). */
export const SCREENS_DIR = path.join("test-results", "screens");

/** Project "m390" = ponsel 390x844; "d1280" = desktop 1280x800 (lihat playwright.config.ts). */
export function isMobile(testInfo: TestInfo): boolean {
  return testInfo.project.name === "m390";
}

/** Buka `url` dan pastikan server menjawab 200. */
export async function gotoOk(page: Page, url: string): Promise<void> {
  const response = await page.goto(url);
  expect(response, `Tidak ada respons untuk ${url}`).not.toBeNull();
  expect(response?.status(), `Status HTTP ${url}`).toBe(200);
}

/**
 * Halaman tidak boleh bisa digeser ke samping. Toleransi 1px untuk pembulatan subpiksel.
 * Bila gagal, pesan menyebut beberapa elemen yang melewati tepi kanan sebagai petunjuk.
 */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    // clientWidth = lebar layout viewport; innerWidth bisa ikut melebar di emulasi mobile.
    const limit = Math.min(window.innerWidth, root.clientWidth);
    const scrollWidth = root.scrollWidth;
    const offenders: string[] = [];
    // body/html memakai overflow-x: clip, jadi scrollWidth tidak melebar walau isi terpotong di kanan.
    // Elemen di dalam wadah yang memang bisa digeser (carousel: overflow-x auto/scroll/hidden) tidak dihitung.
    const insideScroller = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const overflowX = getComputedStyle(p).overflowX;
        if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") return true;
      }
      return false;
    };
    {
      for (const el of Array.from(document.body.querySelectorAll("*"))) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || rect.right <= limit + 1) continue;
        const style = getComputedStyle(el);
        if (style.position === "fixed" || style.visibility === "hidden") continue;
        if (el.closest(".sr-only,[aria-hidden='true']") || insideScroller(el)) continue;
        const id = el.id ? `#${el.id}` : "";
        const classes =
          typeof el.className === "string" && el.className.trim()
            ? `.${el.className.trim().split(/\s+/).slice(0, 4).join(".")}`
            : "";
        offenders.push(`${el.tagName.toLowerCase()}${id}${classes} (kanan ${Math.round(rect.right)}px)`);
        if (offenders.length >= 5) break;
      }
    }
    return { scrollWidth, limit, offenders };
  });

  const detail = result.offenders.length ? ` Elemen yang melewati tepi kanan: ${result.offenders.join("; ")}` : "";
  expect(
    result.scrollWidth <= result.limit + 1 && result.offenders.length === 0,
    `Halaman melebar ke samping di ${page.url()}: scrollWidth ${result.scrollWidth}px, lebar viewport ${result.limit}px.${detail}`,
  ).toBe(true);
}

/** Screenshot satu halaman penuh ke test-results/screens/<project>-<name>.png. */
export async function snap(page: Page, testInfo: TestInfo, name: string): Promise<string> {
  const file = path.join(SCREENS_DIR, `${testInfo.project.name}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
  return file;
}

async function clickUntil(trigger: Locator, target: Locator, want: "visible" | "hidden"): Promise<void> {
  await expect(async () => {
    const visible = await target.isVisible();
    // Tombol yang tidak terjangkau (aria-hidden karena dialog sedang dibuka) atau sudah aria-expanded saat
    // isinya masih dimuat (modul lazy di mesin lambat) tidak diklik lagi: klik kedua justru menutupnya.
    if (visible !== (want === "visible") && (await trigger.count()) > 0) {
      const expanded = await trigger.getAttribute("aria-expanded", { timeout: 1_000 }).catch(() => "true");
      if (!(want === "visible" && expanded === "true")) await trigger.click({ timeout: 2_000 });
    }
    if (want === "visible") await expect(target).toBeVisible({ timeout: 2_000 });
    else await expect(target).toBeHidden({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
}

/**
 * Klik `trigger` sampai `target` tampil. Klik yang terjadi sebelum hidrasi React bisa hilang,
 * jadi diulang; status dicek dulu sebelum klik supaya tidak bolak-balik.
 */
export function clickUntilVisible(trigger: Locator, target: Locator): Promise<void> {
  return clickUntil(trigger, target, "visible");
}

/** Klik `trigger` sampai `target` tersembunyi (lihat clickUntilVisible). */
export function clickUntilHidden(trigger: Locator, target: Locator): Promise<void> {
  return clickUntil(trigger, target, "hidden");
}
