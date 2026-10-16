/**
 * E2E fase 3: kotak pencarian hero di beranda dan halaman hasil /sewa (filter, chip, urutan,
 * muat lebih banyak, hasil kosong). Dijalankan di dua project: m390 (390x844) dan d1280 (1280x800).
 *
 * Butuh data Supabase asli (env terisi saat build dan start). Test ditulis tahan data: jumlah unit,
 * nama apartemen, dan tipe kamar dibaca dari halaman, bukan ditulis tetap. Langkah yang bergantung
 * pada data (mis. minimal dua apartemen) di-skip dengan alasan, bukan gagal.
 *
 * Cara menjalankan (dari folder web/):
 *   npm run build && npx next start -p 3100            (di terminal lain)
 *   npm run e2e -- e2e/fase-3.spec.ts
 *   npm run e2e -- e2e/fase-3.spec.ts --project=m390   (satu lebar saja)
 * Server lain: set E2E_BASE_URL, mis. E2E_BASE_URL=http://localhost:3000.
 *
 * Screenshot tersimpan di test-results/screens/<project>-<nama>.png (home, sewa, sewa-kosong).
 * Hal di luar kontrak dicetak sebagai "[catatan] …" tanpa menggagalkan test.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  clickUntilHidden,
  clickUntilVisible,
  expectNoHorizontalOverflow,
  gotoOk,
  isMobile,
  snap,
} from "./helpers";
import {
  BUDGET_PRESETS,
  PAGE_SIZE,
  PRICE_STEP,
  SEWA_HEADING,
  SORT_LABELS,
  activateChoice,
  apartmentChoice,
  apartmentGroup,
  apartmentRadios,
  cardPrices,
  chooseApartment,
  chooseSortDesktop,
  clickUntilUrl,
  defaultLokasi,
  desktopSortControl,
  escapeRegExp,
  expectPickerTitle,
  expectSewaUrl,
  filterSheet,
  filterSidebar,
  heroForm,
  heroSubmit,
  isNonDecreasing,
  isNonIncreasing,
  isOptionDisabled,
  loadHeroApartments,
  mobileFilterButton,
  mobileSortButton,
  normalizeText,
  note,
  openRadioPicker,
  optionNames,
  readHeroApartments,
  resultsList,
  sectionOf,
  sewaHeading,
  sewaHeadingText,
  sewaTotal,
  waitForHydration,
} from "./helpers-3";

// Beberapa test berpindah halaman 2-3 kali (beranda → /sewa → Back) terhadap data asli.
test.describe.configure({ timeout: 60_000 });

const HERO_SUMMARY = /^\d+ unit tersedia · mulai Rp[\d.,]+(?:rb|jt)?\/malam$/;
const TYPE_GROUP = "Tipe kamar";
const BUDGET_GROUP = "Budget per malam";

function headingFor(scope: string, count?: number): RegExp {
  const number = count === undefined ? "\\d+" : String(count);
  return new RegExp(`^\\s*${number} unit di ${escapeRegExp(scope)}\\s*$`);
}

/** Indeks opsi pertama yang aktif mulai dari `from` (−1 kalau tidak ada). */
async function firstEnabledOption(options: Locator, from: number): Promise<number> {
  const count = await options.count();
  for (let i = from; i < count; i++) {
    if (!(await isOptionDisabled(options.nth(i)))) return i;
  }
  return -1;
}

/** Opsi nonaktif harus memuat `disabledNote`; opsi aktif memuat "N unit". */
async function expectOptionNotes(group: Locator, disabledNote: string): Promise<void> {
  const options = group.getByRole("radio");
  const count = await options.count();
  for (let i = 0; i < count; i++) {
    const option = options.nth(i);
    if (await isOptionDisabled(option)) {
      await expect(option, `Opsi nonaktif ke-${i + 1} harus bertuliskan "${disabledNote}"`).toContainText(disabledNote);
    } else {
      await expect(option, `Opsi aktif ke-${i + 1} harus menampilkan jumlah unit`).toContainText(/\d+ unit/);
    }
  }
}

/**
 * URL tepat /sewa?lokasi=<slug>. Regex, bukan predikat: toHaveURL(fungsi) memakai waitForURL yang juga
 * menunggu event "load", padahal hasil /sewa di-stream (tanpa JS bisa lewat batas waktu walau URL benar).
 */
function sewaOnly(slug: string) {
  return new RegExp(`^https?://[^/]+/sewa\\?lokasi=${slug.replace(/[^a-z0-9-]/g, "")}$`);
}

async function expectResultCards(page: Page, expected: number): Promise<Locator> {
  const list = resultsList(page);
  await expect(list).toBeVisible();
  const cards = list.getByTestId("unit-card");
  await expect(cards, "Jumlah kartu di daftar hasil").toHaveCount(expected);
  return cards;
}

// ---------------------------------------------------------------------------
// 1. Beranda: kotak pencarian hero
// ---------------------------------------------------------------------------

test.describe("Beranda: kotak pencarian hero", () => {
  test("form tampil, apartemen pertama terpilih, tombol Cari unit muat di layar pertama", async ({
    page,
  }, testInfo) => {
    const mobile = isMobile(testInfo);
    // Layar ponsel pendek (390x664): kartu pencarian harus utuh tanpa menggulir (UX 2.1).
    if (mobile) await page.setViewportSize({ width: 390, height: 664 });
    await gotoOk(page, "/");

    const form = heroForm(page);
    await expect(form).toBeVisible();
    await expect(form).toHaveAttribute("method", /^get$/i);
    await expect(form).toHaveAttribute("action", "/sewa");

    // H1 = settings.heroTitle, berada di bagian hero yang sama dengan form.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const heroH1 = page.locator("section").filter({ has: form }).getByRole("heading", { level: 1 });
    await expect(heroH1).toBeVisible();
    await expect(heroH1).toHaveText(/\S/);

    // Segmented control apartemen (≤ 3 apartemen) atau dropdown (> 3).
    if ((await apartmentGroup(page).count()) === 0) {
      note("Hero memakai dropdown apartemen (lebih dari 3 apartemen); cek radio dilewati.");
      await expect(form.getByRole("button", { name: /Pilih apartemen/ })).toBeVisible();
    } else {
      const radios = apartmentRadios(page);
      const count = await radios.count();
      expect(count, "Jumlah radio apartemen").toBeGreaterThanOrEqual(1);
      expect(count, "Lebih dari 3 apartemen harus memakai dropdown").toBeLessThanOrEqual(3);
      await expect(radios.first()).toBeChecked();
      await expect(form.locator('input[type="radio"][name="lokasi"]:checked')).toHaveCount(1);
    }

    const summary = page.getByTestId("hero-summary");
    await expect(summary).toBeVisible();
    const summaryText = normalizeText(await summary.textContent());
    if (/^\d+ unit/.test(summaryText)) {
      expect(summaryText, "Format ringkasan hero").toMatch(HERO_SUMMARY);
    } else {
      expect(summaryText, "Ringkasan hero tidak boleh kosong").not.toBe("");
      note(`Apartemen bawaan tidak punya unit tersedia: "${summaryText}"`);
    }

    const typeTrigger = page.getByTestId("hero-type-trigger");
    await expect(typeTrigger).toBeVisible();
    await expect(typeTrigger).toHaveAttribute("type", "button");
    await expect(typeTrigger).toHaveAttribute("aria-haspopup", "dialog");
    await expect(typeTrigger).toContainText("Tipe kamar");
    await expect(typeTrigger).toContainText("Semua tipe");

    const budgetTrigger = page.getByTestId("hero-budget-trigger");
    await expect(budgetTrigger).toBeVisible();
    await expect(budgetTrigger).toHaveAttribute("type", "button");
    await expect(budgetTrigger).toHaveAttribute("aria-haspopup", "dialog");
    await expect(budgetTrigger).toContainText("Budget per malam");
    await expect(budgetTrigger).toContainText("Semua harga");

    // Input tersembunyi kosong dinonaktifkan supaya tidak ikut ke URL.
    for (const name of ["tipe", "min", "max"]) {
      const input = form.locator(`input[name="${name}"]`);
      await expect(input, `Input tersembunyi "${name}"`).toHaveCount(1);
      await expect(input, `Input "${name}" harus nonaktif selama kosong`).toBeDisabled();
    }

    const submit = heroSubmit(page);
    await expect(submit).toBeVisible();
    await expect(submit).toHaveAttribute("type", "submit");

    if (mobile) {
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      expect(await page.evaluate(() => window.scrollY), "Halaman belum digulir").toBe(0);
      const box = await submit.boundingBox();
      const bottom = box ? box.y + box.height : Number.POSITIVE_INFINITY;
      expect(bottom, `Tombol "Cari unit" harus terlihat tanpa menggulir di 390x664 (bawah tombol ${bottom}px)`).toBeLessThanOrEqual(664);
      expect(box?.height ?? 0, "Tinggi tombol Cari unit (target sentuh)").toBeGreaterThanOrEqual(44);
    }

    await expectNoHorizontalOverflow(page);
    await snap(page, testInfo, "home");
  });

  test("kirim tanpa mengubah apa pun membuka /sewa?lokasi=<apartemen bawaan>", async ({ page }) => {
    await gotoOk(page, "/");
    await expect(heroForm(page)).toBeVisible();
    const slug = await defaultLokasi(page);
    expect(slug, "Nilai lokasi bawaan").toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const summaryText = normalizeText(await page.getByTestId("hero-summary").textContent());

    await heroSubmit(page).click();
    await expect(page, `URL harus tepat /sewa?lokasi=${slug}`).toHaveURL(sewaOnly(slug), { timeout: 15_000 });

    const total = await sewaTotal(page);
    const available = /^(\d+) unit tersedia/.exec(summaryText);
    if (available && Number(available[1]) !== total) {
      note(`Ringkasan hero (${available[1]} unit) berbeda dengan judul /sewa (${total} unit) untuk ${slug}.`);
    }
    await expectNoHorizontalOverflow(page);
  });

  test.describe("tanpa JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("form tetap mengirim GET ke /sewa?lokasi=<apartemen bawaan>", async ({ page }) => {
      await gotoOk(page, "/");
      await expect(heroForm(page)).toBeVisible();
      const slug = await defaultLokasi(page);
      expect(slug, "Nilai lokasi bawaan").not.toBe("");

      const [response] = await Promise.all([
        page.waitForResponse(
          (res) => new URL(res.url()).pathname === "/sewa" && res.request().resourceType() === "document",
        ),
        heroSubmit(page).click(),
      ]);
      expect(response.status(), "Status HTTP /sewa").toBe(200);
      await expect(page, `URL harus tepat /sewa?lokasi=${slug}`).toHaveURL(sewaOnly(slug), { timeout: 15_000 });
      await expectNoHorizontalOverflow(page);
    });
  });

  test("keyboard: panah kanan memindah pilihan apartemen", async ({ page }) => {
    await gotoOk(page, "/");
    const radios = apartmentRadios(page);
    test.skip((await radios.count()) < 2, "Butuh minimal dua apartemen di segmented control");
    await waitForHydration(radios.first());

    const summary = page.getByTestId("hero-summary");
    const before = normalizeText(await summary.textContent());

    await radios.first().focus();
    await expect(radios.first()).toBeFocused();
    await page.keyboard.press("ArrowRight");

    await expect(radios.nth(1)).toBeChecked();
    await expect(radios.first()).not.toBeChecked();
    await expect(radios.nth(1)).toBeFocused();
    await expect(summary).toHaveText(/\S/);
    const after = normalizeText(await summary.textContent());
    if (after === before) note(`Ringkasan hero sama untuk dua apartemen pertama: "${after}"`);
    await expect(page.getByTestId("hero-type-trigger")).toContainText("Semua tipe");
  });

  test("tipe kamar mengikuti apartemen; memilih tipe masuk ke URL", async ({ page }) => {
    await gotoOk(page, "/");
    const apartments = await readHeroApartments(page);
    const trigger = page.getByTestId("hero-type-trigger");
    await expect(trigger).toContainText("Semua tipe");

    let group = await openRadioPicker(page, trigger, TYPE_GROUP);
    await expectPickerTitle(page, group, "Pilih tipe kamar");
    const firstNames = await optionNames(group);
    expect(firstNames[0], "Opsi pertama").toBe("Semua tipe");
    await expect(group.getByRole("radio").first()).toBeChecked();
    await expect(group.getByRole("radio").first()).toHaveAccessibleName("Semua tipe");
    await expectOptionNotes(group, "belum tersedia");

    await page.keyboard.press("Escape");
    await expect(group).toBeHidden();
    await expect(trigger, "Fokus kembali ke tombol Tipe kamar setelah Esc").toBeFocused();

    let slug = await defaultLokasi(page);
    if (apartments.length >= 2) {
      await chooseApartment(apartmentRadios(page).nth(1));
      slug = apartments[1].slug;
      await expect(trigger).toContainText("Semua tipe");

      group = await openRadioPicker(page, trigger, TYPE_GROUP);
      const secondNames = await optionNames(group);
      expect(secondNames[0], "Opsi pertama").toBe("Semua tipe");
      expect(secondNames, "Daftar tipe kamar harus berbeda antar apartemen").not.toEqual(firstNames);
      await expectOptionNotes(group, "belum tersedia");
    } else {
      note("Hanya satu apartemen di hero; perbandingan tipe antar apartemen dilewati.");
      group = await openRadioPicker(page, trigger, TYPE_GROUP);
    }

    const options = group.getByRole("radio");
    const names = await optionNames(group);
    const pick = await firstEnabledOption(options, 1);
    test.skip(pick < 0, "Tidak ada tipe kamar dengan unit tersedia di apartemen ini");

    await options.nth(pick).click();
    await expect(group).toBeHidden();
    await expect(trigger, "Fokus kembali ke tombol Tipe kamar setelah memilih").toBeFocused();
    await expect(trigger).toContainText(names[pick]);
    await expect(heroForm(page).locator('input[name="tipe"]')).toBeEnabled();

    await heroSubmit(page).click();
    await expect(page, `URL harus /sewa?lokasi=${slug}&tipe=…`).toHaveURL(
      (url) =>
        url.pathname === "/sewa" &&
        url.searchParams.get("lokasi") === slug &&
        Boolean(url.searchParams.get("tipe")) &&
        url.search.includes("&tipe="),
      { timeout: 15_000 },
    );
    await sewaHeadingText(page);
    await expectNoHorizontalOverflow(page);
  });

  test("ganti apartemen mengembalikan tipe kamar ke Semua tipe", async ({ page }) => {
    await gotoOk(page, "/");
    const radios = apartmentRadios(page);
    test.skip((await radios.count()) < 2, "Butuh minimal dua apartemen di segmented control");

    const trigger = page.getByTestId("hero-type-trigger");
    const group = await openRadioPicker(page, trigger, TYPE_GROUP);
    const options = group.getByRole("radio");
    const names = await optionNames(group);
    const pick = await firstEnabledOption(options, 1);
    test.skip(pick < 0, "Tidak ada tipe kamar dengan unit tersedia di apartemen pertama");

    await options.nth(pick).click();
    await expect(group).toBeHidden();
    await expect(trigger).toContainText(names[pick]);

    await chooseApartment(radios.nth(1));
    await expect(trigger).toContainText("Semua tipe");
    await expect(heroForm(page).locator('input[name="tipe"]')).toBeDisabled();
  });

  test("budget: pilihan cepat masuk ke URL sebagai min/max", async ({ page }) => {
    await gotoOk(page, "/");
    await expect(heroForm(page)).toBeVisible();
    const slug = await defaultLokasi(page);

    const trigger = page.getByTestId("hero-budget-trigger");
    await expect(trigger).toContainText("Budget per malam");
    await expect(trigger).toContainText("Semua harga");

    const group = await openRadioPicker(page, trigger, BUDGET_GROUP);
    await expectPickerTitle(page, group, "Budget per malam");
    expect(await optionNames(group), "Pilihan cepat budget").toEqual(BUDGET_PRESETS.map((preset) => preset.label));
    const options = group.getByRole("radio");
    await expect(options.first()).toBeChecked();
    await expectOptionNotes(group, "tidak ada unit");
    const dialog = page.getByRole("dialog").filter({ has: group });
    await expect(dialog.getByRole("button", { name: "Atur sendiri", exact: true })).toBeVisible();

    const preferred = BUDGET_PRESETS.findIndex((preset) => preset.label === "Rp300rb – Rp500rb");
    const pick = (await isOptionDisabled(options.nth(preferred))) ? await firstEnabledOption(options, 1) : preferred;
    test.skip(pick < 0, "Tidak ada pilihan budget selain Semua harga yang punya unit");
    const preset = BUDGET_PRESETS[pick];
    if (pick !== preferred) note(`"Rp300rb – Rp500rb" tidak punya unit; memakai "${preset.label}".`);

    await options.nth(pick).click();
    await expect(group).toBeHidden();
    await expect(trigger, "Fokus kembali ke tombol Budget setelah memilih").toBeFocused();
    await expect(trigger).toContainText(preset.label);

    await heroSubmit(page).click();
    await expectSewaUrl(
      page,
      {
        lokasi: slug,
        min: preset.min === null ? null : String(preset.min),
        max: preset.max === null ? null : String(preset.max),
      },
      { exact: true },
    );
    await sewaHeadingText(page);
    await expectNoHorizontalOverflow(page);
  });

  test("budget: Atur sendiri membuka slider dua titik dan input Minimum/Maksimum", async ({ page }) => {
    await gotoOk(page, "/");
    await expect(heroForm(page)).toBeVisible();
    const slug = await defaultLokasi(page);
    const trigger = page.getByTestId("hero-budget-trigger");

    const group = await openRadioPicker(page, trigger, BUDGET_GROUP);
    const dialog = page.getByRole("dialog").filter({ has: group });
    await dialog.getByRole("button", { name: "Atur sendiri", exact: true }).click();

    const sliders = dialog.getByRole("slider");
    await expect(sliders, "Slider harga harus punya dua titik").toHaveCount(2);
    await expect(dialog.getByLabel("Minimum", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel("Maksimum", { exact: true })).toBeVisible();
    const apply = dialog.getByRole("button", { name: "Terapkan", exact: true });
    await expect(apply).toBeVisible();

    const lower = sliders.first();
    const min = Number(await lower.getAttribute("aria-valuemin"));
    const max = Number(await lower.getAttribute("aria-valuemax"));
    expect(min % PRICE_STEP, `Batas bawah slider (${min}) kelipatan Rp50.000`).toBe(0);
    expect(max % PRICE_STEP, `Batas atas slider (${max}) kelipatan Rp50.000`).toBe(0);
    test.skip(max - min < PRICE_STEP, "Semua unit apartemen ini berharga sama; slider tidak bisa digeser");

    const start = Number(await lower.getAttribute("aria-valuenow"));
    await lower.focus();
    await page.keyboard.press("ArrowRight");
    const moved = start + PRICE_STEP;
    await expect(lower, "Panah kanan menggeser titik bawah satu langkah Rp50.000").toHaveAttribute(
      "aria-valuenow",
      String(moved),
    );

    await apply.click();
    await expect(group).toBeHidden();
    await expect(trigger).not.toContainText("Semua harga");
    await expect(trigger).toContainText("Rp");

    await heroSubmit(page).click();
    await expectSewaUrl(page, { lokasi: slug, min: String(moved) });
    await sewaHeadingText(page);
  });

  test("bagian promo, apartemen, dan FAQ", async ({ page }) => {
    await gotoOk(page, "/");
    const apartments = await readHeroApartments(page);

    const promo = page.locator("#promo");
    if ((await promo.count()) > 0) {
      expect(await promo.getByTestId("unit-card").count(), "Kartu unit di #promo").toBeGreaterThan(0);
    } else {
      note("Bagian #promo tidak dirender (tidak ada unit promo/unggulan).");
    }

    const section = page.locator("#apartemen");
    await expect(section).toBeVisible();
    const links = section.getByRole("link", { name: /^Lihat unit/ });
    const linkCount = await links.count();
    expect(linkCount, 'Tautan "Lihat unit" di #apartemen').toBeGreaterThanOrEqual(1);
    const slugs: string[] = [];
    for (let i = 0; i < linkCount; i++) {
      const href = (await links.nth(i).getAttribute("href")) ?? "";
      expect(href, `href "Lihat unit" ke-${i + 1}`).toMatch(/^\/sewa\?lokasi=[a-z0-9-]+$/);
      slugs.push(href.replace("/sewa?lokasi=", ""));
    }
    const heroSlugs = apartments.map((item) => item.slug);
    if (heroSlugs.length && [...slugs].sort().join() !== [...heroSlugs].sort().join()) {
      note(`Apartemen di hero (${heroSlugs.join(", ")}) berbeda dengan #apartemen (${slugs.join(", ")}).`);
    }

    const faq = page.locator("#faq");
    if ((await faq.count()) > 0) {
      const more = faq.getByRole("button", { name: /^Lihat semua pertanyaan/ });
      if ((await more.count()) > 0) {
        const questions = faq.locator("button[aria-expanded]");
        const before = await questions.count();
        await clickUntilHidden(more, more);
        await expect.poll(() => questions.count(), { message: "Jumlah pertanyaan setelah dibuka" }).toBeGreaterThan(before);
        expect(new URL(page.url()).pathname, "FAQ dibuka di tempat, tanpa pindah halaman").toBe("/");
      } else {
        note('FAQ berisi 5 atau kurang; tombol "Lihat semua pertanyaan" tidak ada.');
      }
    } else {
      note("Bagian #faq tidak dirender (tidak ada FAQ aktif).");
    }
    await expectNoHorizontalOverflow(page);

    await links.first().click();
    await expectSewaUrl(page, { lokasi: slugs[0] }, { exact: true });
    await sewaHeadingText(page);
    await expectNoHorizontalOverflow(page);
  });
});

// ---------------------------------------------------------------------------
// 2. /sewa
// ---------------------------------------------------------------------------

test.describe("/sewa", () => {
  test("judul, daftar hasil, dan kontrol filter sesuai lebar layar", async ({ page }, testInfo) => {
    await gotoOk(page, "/sewa");

    const heading = sewaHeading(page);
    await expect(heading).toHaveText(headingFor("semua apartemen"));
    await expect(heading).toHaveJSProperty("tagName", "H1");
    const total = await sewaTotal(page);
    expect(total, "Data unit tersedia").toBeGreaterThan(0);

    const shown = Math.min(total, PAGE_SIZE);
    await expectResultCards(page, shown);
    const items = resultsList(page).locator(":scope > li");
    await expect(items, "Setiap kartu dibungkus <li>").toHaveCount(shown);
    await expect(items.first().getByTestId("unit-card")).toHaveCount(1);

    if (isMobile(testInfo)) {
      const filterButton = mobileFilterButton(page);
      await expect(filterButton).toBeVisible();
      await expect(mobileSortButton(page)).toBeVisible();
      await expect(filterSidebar(page), "Sidebar filter hanya untuk md ke atas").toBeHidden();

      // Bar lengket tetap terlihat saat daftar digulir.
      await page.evaluate(() => window.scrollTo(0, 900));
      await expect(filterButton, "Tombol Filter tetap terlihat saat menggulir").toBeInViewport();
      await page.evaluate(() => window.scrollTo(0, 0));
    } else {
      await expect(filterSidebar(page)).toBeVisible();
      await expect(desktopSortControl(page), 'Kontrol "Urutkan" di desktop').toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
    await snap(page, testInfo, "sewa");
  });

  test("filter apartemen diterapkan, lalu Back mengembalikan hasil sebelumnya", async ({ page }, testInfo) => {
    const apartments = await loadHeroApartments(page);
    test.skip(!apartments.length, "Hero memakai dropdown; nama apartemen tidak terbaca dari radio");
    const target = apartments[0];

    await gotoOk(page, "/sewa");
    const before = await sewaHeadingText(page);
    expect(before).toMatch(/unit di semua apartemen$/);
    const beforeUrl = page.url();

    if (isMobile(testInfo)) {
      const trigger = mobileFilterButton(page);
      const sheet = filterSheet(page);
      await clickUntilVisible(trigger, sheet);
      await expect(sheet.getByRole("button", { name: "Reset", exact: true })).toBeVisible();

      const choice = apartmentChoice(sheet, target.name);
      await expect(choice, `Pilihan apartemen "${target.name}" di sheet Filter`).toBeAttached();
      await activateChoice(choice);

      const apply = sheet.getByRole("button", { name: /^Tampilkan/ });
      await expect(apply).toBeEnabled();
      await expect(apply).toHaveText(/Tampilkan \d+ unit/);
      const shown = Number(/(\d+)/.exec(await apply.innerText())?.[1]);
      await apply.click();

      await expect(sheet).toBeHidden();
      await expectSewaUrl(page, { lokasi: target.slug });
      await expect(sewaHeading(page), "Jumlah di judul sama dengan tombol Tampilkan").toHaveText(
        headingFor(target.name, shown),
      );
      await expect(trigger, "Tombol Filter menampilkan jumlah filter aktif").toContainText("1");
      const focused = await sewaHeading(page).evaluate((el) => el === document.activeElement);
      if (!focused) note("Fokus tidak pindah ke judul H1 setelah Tampilkan (UX 2.3).");
    } else {
      const aside = filterSidebar(page);
      await expect(aside).toBeVisible();
      const choice = apartmentChoice(aside, target.name);
      await expect(choice, `Pilihan apartemen "${target.name}" di sidebar Filter`).toBeAttached();
      await waitForHydration(choice);
      await activateChoice(choice);

      await expectSewaUrl(page, { lokasi: target.slug });
      await expect(sewaHeading(page)).toHaveText(headingFor(target.name));
    }
    await expectNoHorizontalOverflow(page);

    await page.goBack();
    await expect(page, "Back kembali ke URL sebelum filter").toHaveURL(beforeUrl);
    await expect(sewaHeading(page), "Back mengembalikan judul sebelumnya").toHaveText(before);
  });

  test("mobile: sheet filter tanpa hasil menonaktifkan tombol, Reset memulihkan", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), "Sheet filter hanya tampil di bawah md");
    await gotoOk(page, "/sewa?max=1");
    await expect(sewaHeading(page)).toHaveText(/^\s*0 unit di /);

    const trigger = mobileFilterButton(page);
    await expect(trigger, "Tombol Filter menampilkan jumlah filter aktif").toContainText("1");
    const sheet = filterSheet(page);

    await clickUntilVisible(trigger, sheet);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(trigger, "Fokus kembali ke tombol Filter setelah Esc").toBeFocused();

    await clickUntilVisible(trigger, sheet);
    const none = sheet.getByRole("button", { name: "Tidak ada unit yang cocok", exact: true });
    await expect(none).toBeVisible();
    await expect(none).toBeDisabled();

    await sheet.getByRole("button", { name: "Reset", exact: true }).click();
    const apply = sheet.getByRole("button", { name: /^Tampilkan \d+ unit/ });
    await expect(apply).toBeEnabled();
    const shown = Number(/(\d+)/.exec(await apply.innerText())?.[1]);
    expect(shown, "Jumlah unit setelah Reset").toBeGreaterThan(0);

    await apply.click();
    await expect(sheet).toBeHidden();
    await expectSewaUrl(page, {}, { exact: true });
    await expect(sewaHeading(page)).toHaveText(headingFor("semua apartemen", shown));
    await expectNoHorizontalOverflow(page);
  });

  test("chip filter aktif bisa dihapus", async ({ page }) => {
    const apartments = await loadHeroApartments(page);
    test.skip(!apartments.length, "Hero memakai dropdown; slug apartemen tidak terbaca dari radio");
    const target = apartments[0];

    await gotoOk(page, `/sewa?lokasi=${target.slug}&urut=termurah`);
    await expect(sewaHeading(page)).toHaveText(headingFor(target.name));

    const chips = page.getByRole("button", { name: /^Hapus filter / });
    await expect(chips.first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Hapus semua", exact: true })).toBeVisible();

    const ownChip = page.getByRole("button", { name: new RegExp(`^Hapus filter .*${escapeRegExp(target.name)}`) });
    const hasOwnChip = (await ownChip.count()) > 0;
    if (!hasOwnChip) note(`Chip apartemen tidak memuat nama "${target.name}"; memakai chip pertama.`);
    const chip = hasOwnChip ? ownChip.first() : chips.first();

    // urut=termurah: harga kartu tidak boleh turun.
    const cards = resultsList(page).getByTestId("unit-card");
    if ((await cards.count()) >= 2) {
      const prices = await cardPrices(cards, 3);
      expect(isNonDecreasing(prices), `Harga terendah: harga 3 kartu pertama harus naik (${prices.join(", ")})`).toBe(
        true,
      );
    }
    await expectNoHorizontalOverflow(page);

    await clickUntilUrl(
      page,
      chip,
      (url) => url.pathname === "/sewa" && !url.searchParams.has("lokasi"),
      "Chip harus menghapus lokasi dari URL",
    );
    await expect(sewaHeading(page)).toHaveText(headingFor("semua apartemen"));
    if (new URL(page.url()).searchParams.get("urut") !== "termurah") {
      note("Menghapus chip apartemen juga mengubah urutan (urut=termurah hilang).");
    }
    if (hasOwnChip) await expect(ownChip).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("urutkan Harga tertinggi", async ({ page }, testInfo) => {
    await gotoOk(page, "/sewa");
    await sewaHeadingText(page);

    if (isMobile(testInfo)) {
      const group = await openRadioPicker(page, mobileSortButton(page), "Urutkan");
      await expectPickerTitle(page, group, "Urutkan");
      expect(await optionNames(group), "Pilihan urutan").toEqual([...SORT_LABELS]);
      await expect(group.getByRole("radio", { name: "Rekomendasi", exact: true })).toBeChecked();

      await activateChoice(group.getByRole("radio", { name: "Harga tertinggi", exact: true }));
      await expectSewaUrl(page, { urut: "termahal" });
      await expect(group, "Sheet Urutkan tertutup setelah memilih").toBeHidden();
    } else {
      await chooseSortDesktop(page, "Harga tertinggi", "termahal");
      await expectSewaUrl(page, { urut: "termahal" });
    }

    const cards = resultsList(page).getByTestId("unit-card");
    await expect(cards.first()).toBeVisible();
    test.skip((await cards.count()) < 2, "Butuh minimal dua unit untuk membandingkan harga");
    await expect(async () => {
      const prices = await cardPrices(cards, 3);
      expect(prices.length, "Harga terbaca dari kartu").toBeGreaterThanOrEqual(2);
      expect(isNonIncreasing(prices), `Harga tertinggi: harga 3 kartu pertama harus turun (${prices.join(", ")})`).toBe(
        true,
      );
    }).toPass({ timeout: 15_000 });
    await expectNoHorizontalOverflow(page);
  });

  test("Muat lebih banyak menambah kartu tanpa melompat ke atas", async ({ page }) => {
    await gotoOk(page, "/sewa");
    const total = await sewaTotal(page);
    const cards = await expectResultCards(page, Math.min(total, PAGE_SIZE));
    const more = page.getByRole("button", { name: "Muat lebih banyak", exact: true });
    if (total <= PAGE_SIZE) {
      await expect(more).toHaveCount(0);
      test.skip(true, `Hanya ${total} unit; tidak ada halaman berikutnya`);
    }
    await expect(more).toBeVisible();
    const before = await cards.count();

    await more.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await waitForHydration(more);
    const yBefore = await page.evaluate(() => window.scrollY);
    expect(yBefore, "Tombol Muat lebih banyak berada di bawah layar pertama").toBeGreaterThan(0);
    const historyBefore = await page.evaluate(() => window.history.length);

    await more.click();
    await expectSewaUrl(page, { hal: "2" });
    await expect(cards, "Jumlah kartu setelah Muat lebih banyak").toHaveCount(Math.min(total, 2 * PAGE_SIZE));
    expect(await cards.count()).toBeGreaterThan(before);

    const yAfter = await page.evaluate(() => window.scrollY);
    expect(yAfter, `Posisi gulir tidak boleh kembali ke atas (sebelum ${yBefore}px)`).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.history.length), "Muat lebih banyak memakai replace, bukan push").toBe(
      historyBefore,
    );
    await expectNoHorizontalOverflow(page);
  });

  test("hasil kosong menampilkan saran unit terdekat", async ({ page }, testInfo) => {
    await gotoOk(page, "/sewa?max=1");
    await expect(sewaHeading(page)).toHaveText(/^\s*0 unit di /);

    await expect(page.getByRole("heading", { name: "Belum ada unit yang cocok", exact: true })).toBeVisible();
    await expect(page.getByText("Coba ubah tipe kamar atau naikkan budget.", { exact: true }).first()).toBeVisible();
    const clearAll = page
      .getByRole("button", { name: "Hapus semua filter", exact: true })
      .or(page.getByRole("link", { name: "Hapus semua filter", exact: true }))
      .first();
    await expect(clearAll).toBeVisible();

    const nearestHeading = page.getByRole("heading", { name: "Unit terdekat", exact: true });
    await expect(nearestHeading).toBeVisible();
    const nearest = await sectionOf(page, nearestHeading);
    const suggestionCount = await nearest.getByTestId("unit-card").count();
    expect(suggestionCount, "Jumlah saran Unit terdekat").toBeGreaterThanOrEqual(1);
    expect(suggestionCount, "Jumlah saran Unit terdekat").toBeLessThanOrEqual(3);

    await expectNoHorizontalOverflow(page);
    await snap(page, testInfo, "sewa-kosong");

    await clickUntilUrl(
      page,
      clearAll,
      (url) => url.pathname === "/sewa" && url.search === "",
      '"Hapus semua filter" harus kembali ke /sewa tanpa parameter',
    );
    await expect(sewaHeading(page)).toHaveText(/^\s*[1-9]\d* unit di semua apartemen\s*$/);
    await expectNoHorizontalOverflow(page);
  });

  for (const url of [
    "/sewa?lokasi=TIDAK%20ADA&min=abc&hal=-3",
    "/sewa?urut=acak&kategori=9br&tamu=0&fasilitas=x,y&penuh=ya&max=-5",
  ]) {
    test(`parameter tidak valid diabaikan tanpa error: ${url}`, async ({ page }) => {
      await gotoOk(page, url);
      await expect(sewaHeading(page)).toHaveText(SEWA_HEADING);
      await expect(sewaHeading(page), "Parameter tidak valid diabaikan").toHaveText(headingFor("semua apartemen"));
      await expect(resultsList(page).getByTestId("unit-card").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
