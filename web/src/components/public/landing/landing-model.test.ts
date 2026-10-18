import { describe, expect, it } from "vitest";
import { makeLocations, SAMPLE_LANDMARKS } from "@/lib/chat/test-knowledge";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { makeUnit, sampleCatalog } from "@/lib/test-fixtures";
import {
  buildLanding,
  findLandingType,
  viewParts,
  landingCtaHref,
  landingFaqs,
  landingGlobalFaqs,
  landingH1,
  landingIntro,
  landingMetaDescription,
  landingMetaTitle,
  landingPath,
  landingSummary,
} from "./landing-model";

const catalog = sampleCatalog();
const [vida, delft] = makeLocations(catalog);
const settings = DEFAULT_SETTINGS;

describe("buildLanding", () => {
  const studio = findLandingType(vida, "studio")!;
  const data = buildLanding(vida, studio, catalog);

  it("menghitung unit, harga, kapasitas, tower, dan fasilitas umum", () => {
    expect(findLandingType(vida, "tidak-ada")).toBeNull();
    expect(data.units.map((unit) => unit.id)).toEqual([2, 1]);
    expect(data.allFull).toBe(false);
    expect(data.priceFrom).toBe(250000);
    expect(data.priceTo).toBe(280000);
    expect(data.capacityMax).toBe(3);
    expect(data.towers).toEqual(["Ashton"]);
    expect(data.views).toEqual(["Kolam"]);
    expect(data.floorRange).toEqual({ min: 26, max: 26 });
    expect(data.sizeRange).toBeNull();
    expect(data.commonAmenities.map((amenity) => amenity.name)).toEqual(["AC", "WiFi", "Smart TV"]);
  });

  it("view dipecah jadi unsur unik, maks. 4", () => {
    expect(viewParts(["Kolam & Taman", "Kolam", "Taman & Kota", "Kota & Sunset", "Kota & Sunrise", "kolam & sunset", null])).toEqual([
      "Kolam",
      "Taman",
      "Kota",
      "Sunset",
    ]);
    expect(viewParts(["Laut, Kota", "Kota dan Gunung"])).toEqual(["Laut", "Kota", "Gunung"]);
    expect(viewParts([])).toEqual([]);
  });

  it("semua penuh memakai harga semua unit", () => {
    const plus = findLandingType(vida, "studio-plus")!;
    const full = buildLanding(vida, plus, catalog);
    expect(full.allFull).toBe(true);
    expect(full.priceFrom).toBe(400000);
    expect(landingMetaDescription(full)).toContain("sedang penuh");
    expect(landingCtaHref(full)).toBe("/sewa?lokasi=vida-view&tipe=studio-plus&penuh=1");
  });

  it("Delft tanpa tower tidak menyebut tower", () => {
    const corner = findLandingType(delft, "studio-corner")!;
    const d = buildLanding(delft, corner, catalog);
    expect(d.towers).toEqual([]);
    expect(landingIntro(d, settings).join(" ")).not.toContain("Tower");
    expect(landingSummary(d, settings).some((row) => row.label === "Tower")).toBe(false);
  });

  it("judul, H1, deskripsi dalam batas dan menyebut Makassar", () => {
    expect(landingH1(data)).toBe("Sewa Studio di Vida View Makassar, Harian & Bulanan");
    expect(landingMetaTitle(data)).toBe("Sewa Studio Vida View Makassar Harian & Bulanan | VIDALIDAY");
    expect(landingMetaTitle(data).length).toBeLessThanOrEqual(60);
    const long = buildLanding(delft, { ...findLandingType(delft, "3-bedroom")!, name: "3 Bedroom Corner Premium" }, catalog);
    expect(landingMetaTitle(long).length).toBeLessThanOrEqual(60);
    expect(landingMetaTitle(long)).toContain("| VIDALIDAY");
    const description = landingMetaDescription(data);
    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).toContain("2 unit Studio di Vida View Panakkukang, Makassar, mulai Rp250.000/malam, maks. 3 tamu.");
    expect(landingPath(data)).toBe("/apartemen/vida-view/studio");
    expect(landingCtaHref(data)).toBe("/sewa?lokasi=vida-view&tipe=studio");
  });

  it("intro dan ringkasan hanya dari fakta yang ada", () => {
    const [first, second] = landingIntro(data, settings);
    expect(first).toContain("VIDALIDAY menyewakan 2 unit Studio di Apartemen Vida View (Panakkukang, Makassar)");
    expect(first).toContain("Harga mulai Rp250.000/malam, untuk maksimal 3 tamu, di Tower Ashton, lantai 26, dengan view Kolam.");
    expect(second).toContain("PT Perdana Mega Trans: AC, WiFi dan Smart TV sudah termasuk.");
    expect(second).toContain("Check-in 14.00 WITA, check-out 12.00 WITA.");
    expect(second).toContain("dilayani setiap hari 08.00–23.00 WITA.");
    expect(landingIntro(data, { ...settings, officeHours: "Setiap Hari: 10.00 - 23.00 WITA" })[1]).toContain(
      "dilayani setiap hari 10.00–23.00 WITA.",
    );
    const summary = landingSummary(data, settings);
    expect(summary.map((row) => row.label)).toEqual([
      "Tipe kamar",
      "Unit tersedia",
      "Harga per malam",
      "Kapasitas",
      "Tower",
      "Lantai",
      "View",
      "Check-in / check-out",
      "Alamat",
    ]);
    expect(summary[2].value).toBe("Rp250.000 – Rp280.000");
    expect(JSON.stringify(summary)).not.toContain("undefined");
  });

  it("FAQ dibentuk dari data, tarif mingguan/bulanan disebut kalau ada", () => {
    const faqs = landingFaqs(data, settings, SAMPLE_LANDMARKS.filter((landmark) => landmark.locationId === vida.id));
    expect(faqs.map((faq) => faq.id)).toEqual([-1, -2, -3, -4, -5, -6]);
    expect(faqs[0].answer).toContain("mulai Rp250.000 per malam sampai Rp280.000");
    expect(faqs[2].answer).toContain("diatur langsung dengan admin");
    expect(faqs[4].answer).toContain("Tempat terdekat: Mall Panakkukang, sekitar 5 menit; Bandara Sultan Hasanuddin, sekitar 30 menit.");
    // Alamat yang sudah menyebut kota tidak ditambah ", Makassar" lagi.
    const cityAddress = buildLanding({ ...vida, address: "Jl. Topaz Raya, Panakkukang, Kota Makassar" }, studio, catalog);
    const cityFaq = landingFaqs(cityAddress, settings, []).find((faq) => faq.id === -5);
    expect(cityFaq?.answer).toBe(`${vida.name} berada di Jl. Topaz Raya, Panakkukang, Kota Makassar.`);
    const withRates = buildLanding(vida, studio, [...catalog, makeUnit({ id: 50, roomTypeId: 11, weeklyPrice: 1500000, monthlyPrice: 5000000 })]);
    const rateFaq = landingFaqs(withRates, settings, [])[2];
    expect(rateFaq.answer).toContain("Tarif mingguan mulai Rp1.500.000 berlaku untuk 7 malam atau lebih, tarif bulanan mulai Rp5.000.000 berlaku untuk 30 malam atau lebih.");
    for (const faq of faqs) expect(faq.answer).not.toMatch(/undefined|null|NaN/);
  });

  it("FAQ umum yang topiknya sudah dijawab FAQ tipe tidak diulang", () => {
    const globals = [
      "Apa saja syarat check-in unit di apartemen?",
      "Bagaimana tata cara pemesanan dan pembayaran sewa apartemen?",
      "Bagaimana ketentuan jam check-in dan check-out unit?",
      "Berapakah kapasitas maksimal penghuni setiap type Unit?",
      "Apa saja peraturan menginap di apartemen?",
      "Apakah boleh membawa hewan peliharaan?",
    ].map((question, index) => ({ id: index + 1, question, answer: "Jawaban.", sortOrder: index + 1 }));
    const allTypeFaqs = [-1, -2, -3, -4, -5, -6].map((id) => ({ id }));
    expect(landingGlobalFaqs(globals, allTypeFaqs, 4).map((faq) => faq.id)).toEqual([1, 5, 6]);
    expect(landingGlobalFaqs(globals, allTypeFaqs, 2).map((faq) => faq.id)).toEqual([1, 5]);
    // Jam check-in kosong di Pengaturan → FAQ tipe -4 tidak dibuat → FAQ umum jam check-in tetap tampil.
    const withoutCheckin = allTypeFaqs.filter((faq) => faq.id !== -4);
    expect(landingGlobalFaqs(globals, withoutCheckin, 4).map((faq) => faq.id)).toEqual([1, 3, 5, 6]);
  });
});
