/**
 * Helper e2e fase 3 (hero pencarian beranda + halaman /sewa). Dipakai oleh fase-3.spec.ts.
 * Semua pencari elemen mengikuti kontrak bersama fase 3 (role, nama aksesibel, data-testid),
 * bukan kelas CSS, supaya tahan terhadap perubahan tampilan.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { clickUntilVisible, gotoOk } from "./helpers";

// ---------------------------------------------------------------------------
// Konstanta kontrak (cermin dari src/lib; sengaja disalin supaya e2e tidak mengimpor kode app)
// ---------------------------------------------------------------------------

/** Kartu per halaman /sewa (src/lib/validation/filters.ts PAGE_SIZE). */
export const PAGE_SIZE = 12;

/** Langkah slider harga (src/lib/search-index.ts PRICE_STEP). */
export const PRICE_STEP = 50_000;

/** Pilihan cepat budget (src/lib/budget.ts BUDGET_PRESETS), urut sesuai tampilan. */
export const BUDGET_PRESETS = [
  { label: "Semua harga", min: null, max: null },
  { label: "Di bawah Rp300rb", min: null, max: 300_000 },
  { label: "Rp300rb – Rp500rb", min: 300_000, max: 500_000 },
  { label: "Rp500rb – Rp1jt", min: 500_000, max: 1_000_000 },
  { label: "Di atas Rp1jt", min: 1_000_000, max: null },
] as const;

/** Label urutan (src/lib/validation/filters.ts SORT_OPTIONS), urut sesuai tampilan. */
export const SORT_LABELS = ["Rekomendasi", "Harga terendah", "Harga tertinggi", "Diskon terbesar", "Terbaru"] as const;

/** Judul /sewa: "24 unit di Vida View" / "24 unit di semua apartemen". */
export const SEWA_HEADING = /^\s*\d+ unit di \S/;

// ---------------------------------------------------------------------------
// Utilitas umum
// ---------------------------------------------------------------------------

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeText(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Catatan non-fatal untuk hal di luar kontrak (mis. saran UX): tercetak di output reporter dan
 * tersimpan sebagai anotasi "catatan", tanpa menggagalkan test.
 */
export function note(message: string): void {
  test.info().annotations.push({ type: "catatan", description: message });
  console.log(`[catatan] ${message}`);
}

/**
 * Tunggu sampai React selesai menghidrasi elemen (React memasang properti `__reactProps$…`
 * pada node DOM saat hidrasi). Klik sebelum hidrasi bisa hilang tanpa jejak.
 */
export async function waitForHydration(locator: Locator): Promise<void> {
  await expect(locator).toBeAttached();
  await expect
    .poll(() => locator.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactProps$"))), {
      message: "Elemen belum dihidrasi React",
      timeout: 15_000,
    })
    .toBe(true);
}

/**
 * Klik `trigger` sampai URL memenuhi `predicate`. URL dicek dulu sebelum tiap klik
 * supaya tidak mengklik dua kali setelah navigasi berhasil.
 */
export async function clickUntilUrl(
  page: Page,
  trigger: Locator,
  predicate: (url: URL) => boolean,
  message: string,
): Promise<void> {
  await expect(async () => {
    if (!predicate(new URL(page.url()))) await trigger.click({ timeout: 3_000 });
    await expect(page, message).toHaveURL(predicate, { timeout: 5_000 });
  }).toPass({ timeout: 25_000 });
}

type ParamExpectation = string | RegExp | null;

/**
 * Tunggu URL menjadi /sewa dengan parameter sesuai harapan. `null` = parameter tidak boleh ada.
 * `exact: true` = tidak boleh ada parameter lain.
 */
export async function expectSewaUrl(
  page: Page,
  params: Record<string, ParamExpectation>,
  options: { exact?: boolean; timeout?: number } = {},
): Promise<void> {
  const wanted = Object.entries(params)
    .map(([key, value]) => `${key}=${value === null ? "(tidak ada)" : String(value)}`)
    .join(", ");
  await expect(page, `URL harus /sewa dengan ${wanted}${options.exact ? " (tanpa parameter lain)" : ""}`).toHaveURL(
    (url) => {
      if (url.pathname !== "/sewa") return false;
      for (const [key, want] of Object.entries(params)) {
        const got = url.searchParams.get(key);
        if (want === null) {
          if (got !== null) return false;
        } else if (typeof want === "string") {
          if (got !== want) return false;
        } else if (got === null || !want.test(got)) {
          return false;
        }
      }
      if (options.exact) {
        for (const key of url.searchParams.keys()) {
          if (!(key in params) || params[key] === null) return false;
        }
      }
      return true;
    },
    { timeout: options.timeout ?? 15_000 },
  );
}

/**
 * Aktifkan pilihan (chip/radio/tombol). Radio/checkbox native yang disembunyikan (sr-only)
 * diklik lewat label-nya, karena titik tengah input 1px bisa tertutup label.
 */
export async function activateChoice(control: Locator): Promise<void> {
  const tag = await control.evaluate((el) => el.tagName.toLowerCase());
  if (tag !== "input") {
    await control.click();
    return;
  }
  const wrapping = control.locator("xpath=ancestor::label[1]");
  if ((await wrapping.count()) > 0) {
    await wrapping.click();
    return;
  }
  const id = await control.getAttribute("id");
  if (id) {
    const byFor = control.page().locator(`label[for="${id.replace(/["\\]/g, "\\$&")}"]`);
    if ((await byFor.count()) > 0) {
      await byFor.first().click();
      return;
    }
  }
  await control.dispatchEvent("click");
}

/** Pilihan apartemen di panel filter (chip berupa radio, checkbox, tombol, atau opsi) berdasarkan nama. */
export function apartmentChoice(scope: Locator, name: string): Locator {
  const re = new RegExp(`^${escapeRegExp(name)}`);
  return scope
    .getByRole("radio", { name: re })
    .or(scope.getByRole("checkbox", { name: re }))
    .or(scope.getByRole("button", { name: re }))
    .or(scope.getByRole("option", { name: re }))
    .first();
}

// ---------------------------------------------------------------------------
// Hero beranda
// ---------------------------------------------------------------------------

export function heroForm(page: Page): Locator {
  return page.getByRole("search", { name: "Cari unit", exact: true });
}

/** Fieldset segmented control apartemen (mode ≤ 3 apartemen). */
export function apartmentGroup(page: Page): Locator {
  return heroForm(page).getByRole("group", { name: "Pilih apartemen", exact: true });
}

export function apartmentRadios(page: Page): Locator {
  return apartmentGroup(page).getByRole("radio");
}

export function heroSubmit(page: Page): Locator {
  return heroForm(page).getByRole("button", { name: "Cari unit", exact: true });
}

export type HeroApartment = { slug: string; name: string; checked: boolean };

/** Baca radio apartemen di hero: slug (value), nama (label = shortName), status terpilih. */
export async function readHeroApartments(page: Page): Promise<HeroApartment[]> {
  await expect(heroForm(page)).toBeVisible();
  return apartmentGroup(page)
    .locator('input[type="radio"][name="lokasi"]')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const input = element as HTMLInputElement;
        const label = Array.from(input.labels ?? [])
          .map((item) => item.textContent ?? "")
          .join(" ");
        return { slug: input.value, name: label.replace(/\s+/g, " ").trim(), checked: input.checked };
      }),
    );
}

/** Buka beranda dan baca daftar apartemen hero (kosong kalau hero memakai dropdown > 3 apartemen). */
export async function loadHeroApartments(page: Page): Promise<HeroApartment[]> {
  await gotoOk(page, "/");
  return readHeroApartments(page);
}

/** Lokasi bawaan yang akan dikirim form tanpa diubah: radio terpilih, atau input tersembunyi (mode dropdown). */
export async function defaultLokasi(page: Page): Promise<string> {
  const form = heroForm(page);
  const checked = form.locator('input[type="radio"][name="lokasi"]:checked');
  if ((await checked.count()) > 0) return (await checked.first().getAttribute("value")) ?? "";
  const hidden = form.locator('input[type="hidden"][name="lokasi"]:not([disabled])');
  return (await hidden.first().getAttribute("value")) ?? "";
}

/** Pilih apartemen di segmented control (klik label; diulang kalau klik jatuh sebelum hidrasi). */
export async function chooseApartment(radio: Locator): Promise<void> {
  const label = radio.locator("xpath=ancestor::label[1]");
  const hasLabel = (await label.count()) > 0;
  await expect(async () => {
    if (!(await radio.isChecked())) {
      if (hasLabel) await label.click({ timeout: 2_000 });
      else await activateChoice(radio);
    }
    await expect(radio).toBeChecked({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

/**
 * Buka sheet (mobile) / popover (desktop) dari `trigger` sampai radiogroup `groupName` tampil.
 * Mengembalikan radiogroup tersebut.
 */
export async function openRadioPicker(page: Page, trigger: Locator, groupName: string): Promise<Locator> {
  const group = page.getByRole("radiogroup", { name: groupName, exact: true });
  await clickUntilVisible(trigger, group);
  return group;
}

/** Panel (sheet/popover) yang memuat `group` harus tampil sebagai dialog bernama `title`. */
export async function expectPickerTitle(page: Page, group: Locator, title: string): Promise<void> {
  const dialog = page.getByRole("dialog").filter({ has: group });
  await expect(dialog, `Panel "${title}" harus berupa dialog`).toBeVisible();
  await expect(dialog).toHaveAccessibleName(title);
}

/** Nama aksesibel tiap role=radio di grup (aria-labelledby → aria-label → label → teks). */
export async function optionNames(group: Locator): Promise<string[]> {
  const names = await group.getByRole("radio").evaluateAll((elements) =>
    elements.map((element) => {
      const byIds = (element.getAttribute("aria-labelledby") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ");
      const ariaLabel = element.getAttribute("aria-label") ?? "";
      const native =
        element instanceof HTMLInputElement
          ? Array.from(element.labels ?? [])
              .map((label) => label.textContent ?? "")
              .join(" ")
          : "";
      return byIds.trim() || ariaLabel.trim() || native.trim() || element.textContent || "";
    }),
  );
  return names.map(normalizeText);
}

export async function isOptionDisabled(option: Locator): Promise<boolean> {
  return (await option.getAttribute("aria-disabled")) === "true" || (await option.isDisabled());
}

// ---------------------------------------------------------------------------
// /sewa
// ---------------------------------------------------------------------------

export function sewaHeading(page: Page): Locator {
  return page.getByTestId("sewa-heading");
}

export function resultsList(page: Page): Locator {
  return page.getByRole("list", { name: "Hasil pencarian", exact: true });
}

/** Tunggu judul /sewa lalu kembalikan teksnya yang sudah dirapikan. */
export async function sewaHeadingText(page: Page): Promise<string> {
  const heading = sewaHeading(page);
  await expect(heading).toHaveText(SEWA_HEADING);
  return normalizeText(await heading.textContent());
}

/** Angka total di judul /sewa ("24 unit di …" → 24). */
export async function sewaTotal(page: Page): Promise<number> {
  const text = await sewaHeadingText(page);
  const match = /^(\d+) unit di /.exec(text);
  expect(match, `Judul /sewa tidak diawali jumlah unit: "${text}"`).not.toBeNull();
  return Number(match?.[1]);
}

/** Tombol "Filter" di bar lengket mobile (nama aksesibel diawali "Filter", bisa memuat jumlah). */
export function mobileFilterButton(page: Page): Locator {
  return page.getByRole("button", { name: /^Filter/ }).first();
}

/** Tombol "Urutkan" di bar lengket mobile. */
export function mobileSortButton(page: Page): Locator {
  return page.getByRole("button", { name: /^Urutkan/ }).first();
}

export function filterSheet(page: Page): Locator {
  return page.getByRole("dialog", { name: "Filter", exact: true });
}

export function filterSidebar(page: Page): Locator {
  return page.getByRole("complementary", { name: "Filter", exact: true });
}

/** Kontrol urutan desktop yang terlihat: <select>/combobox/tombol berlabel "Urutkan". */
export function desktopSortControl(page: Page): Locator {
  return page
    .getByLabel("Urutkan", { exact: true })
    .or(page.getByRole("combobox", { name: /^Urutkan/ }))
    .or(page.getByRole("button", { name: /^Urutkan/ }))
    .filter({ visible: true })
    .first();
}

/**
 * Pilih urutan di desktop: kontrol berlabel "Urutkan" berupa <select> native, combobox, atau
 * tombol dropdown (opsi role option / menuitemradio / radio / menuitem).
 */
export async function chooseSortDesktop(page: Page, label: string, urut: string): Promise<void> {
  const control = desktopSortControl(page);
  await expect(control, 'Kontrol "Urutkan" di desktop').toBeVisible();

  const predicate = (url: URL) => url.searchParams.get("urut") === urut;
  const tag = await control.evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    await expect(async () => {
      await control.selectOption({ label }, { timeout: 2_000 });
      await expect(page).toHaveURL(predicate, { timeout: 4_000 });
    }).toPass({ timeout: 20_000 });
    return;
  }

  const option = page
    .getByRole("option", { name: label, exact: true })
    .or(page.getByRole("menuitemradio", { name: label, exact: true }))
    .or(page.getByRole("radio", { name: label, exact: true }))
    .or(page.getByRole("menuitem", { name: label, exact: true }))
    .filter({ visible: true })
    .first();
  await clickUntilVisible(control, option);
  await activateChoice(option);
  await expect(page, `URL harus memuat urut=${urut}`).toHaveURL(predicate, { timeout: 15_000 });
}

/** "Rp1.250.000/malam" → 1250000. Utamakan angka yang diikuti "/malam", selain itu Rp pertama. */
export function parseRupiah(text: string): number | null {
  const match = /Rp\s?([\d.]+)\s*\/\s*malam/.exec(text) ?? /Rp\s?([\d.]+)/.exec(text);
  if (!match) return null;
  const value = Number(match[1].replace(/\./g, ""));
  return Number.isFinite(value) ? value : null;
}

/** Harga per malam dari `limit` kartu pertama (kartu tanpa harga terbaca dilewati). */
export async function cardPrices(cards: Locator, limit: number): Promise<number[]> {
  const total = Math.min(await cards.count(), limit);
  const prices: number[] = [];
  for (let i = 0; i < total; i++) {
    const price = parseRupiah(await cards.nth(i).innerText());
    if (price !== null) prices.push(price);
  }
  return prices;
}

export function isNonIncreasing(values: number[]): boolean {
  return values.every((value, i) => i === 0 || values[i - 1] >= value);
}

export function isNonDecreasing(values: number[]): boolean {
  return values.every((value, i) => i === 0 || values[i - 1] <= value);
}

/** Bagian yang memuat `heading` (section/region terdalam); jatuh ke <main> kalau tidak ada. */
export async function sectionOf(page: Page, heading: Locator): Promise<Locator> {
  const sections = page.locator("section, [role='region']").filter({ has: heading });
  return (await sections.count()) > 0 ? sections.last() : page.locator("main");
}
