import { describe, expect, it } from "vitest";
import { contentTokens, mentionsDate, normalizeText, parseGuests, parseNights, parseRupiah, tokenize } from "./normalize";

describe("normalizeText", () => {
  it("membakukan slang dan frasa", () => {
    expect(normalizeText("Brp HRG studio di Vida??")).toBe("berapa harga studio di vida");
    expect(normalizeText("harga di Vida View")).toBe("harga di vidaview");
    expect(normalizeText("ada 2 bedroom yg kosong gak buat 4 org")).toBe("ada 2br yang tersedia tidak untuk 4 orang");
    expect(normalizeText("cek in jam brp")).toBe("checkin jamberapa");
    expect(normalizeText("Check-in jam berapa?")).toBe("checkin jamberapa");
    expect(normalizeText("bisa per bulan?")).toBe("bisa bulanan");
    expect(normalizeText("Delft CPI deket mall ga")).toBe("delft delftcpi dekat mall tidak");
  });

  it("mempertahankan angka dengan pemisah dan tanggal", () => {
    expect(normalizeText("budget 300.000")).toBe("budget 300.000");
    expect(normalizeText("1,5jt bisa?")).toBe("1.5jt bisa");
    expect(normalizeText("tgl 20/10 kosong?")).toBe("tanggal 20/10 tersedia");
    expect(normalizeText("harga 300-500 ribu")).toBe("harga 300-500 ribu");
  });

  it("membuang aksen dan tanda baca", () => {
    expect(normalizeText("Halo!!! Apa kabar... (tes)")).toBe("halo apa kabar tes");
    expect(normalizeText("Résumé")).toBe("resume");
  });

  it("tokenize dan contentTokens", () => {
    const tokens = tokenize("berapa harga studio di vidaview untuk 2 orang");
    expect(tokens.map((t) => t.norm)).toEqual(["berapa", "harga", "studio", "di", "vidaview", "untuk", "2", "orang"]);
    expect(tokens[6].isNumber).toBe(true);
    expect(contentTokens(tokens)).toEqual(["berapa", "harga", "studio", "vidaview", "2", "orang"]);
  });
});

describe("parseRupiah", () => {
  it.each([
    ["budget 300rb", { min: null, max: 300_000 }],
    ["harga 300 ribu", { min: null, max: 300_000 }],
    ["maks 300k", { min: null, max: 300_000 }],
    ["dibawah 300.000", { min: null, max: 300_000 }],
    ["sekitar 300000", { min: null, max: 300_000 }],
    ["0.5jt", { min: null, max: 500_000 }],
    ["1.5jt", { min: null, max: 1_500_000 }],
    ["1.2 juta", { min: null, max: 1_200_000 }],
    ["sejuta", { min: null, max: 1_000_000 }],
    ["budget 300", { min: null, max: 300_000 }],
    ["diatas 500rb", { min: 500_000, max: null }],
    ["antara 300rb sampai 500rb", { min: 300_000, max: 500_000 }],
    ["300-500 ribu", { min: 300_000, max: 500_000 }],
  ])("%s", (text, expected) => {
    expect(parseRupiah(text)).toEqual(expected);
  });

  it("mengabaikan angka yang bukan rupiah", () => {
    expect(parseRupiah("untuk 4 orang 2 malam")).toBeNull();
    expect(parseRupiah("harga untuk 10 orang")).toBeNull();
    expect(parseRupiah("studio at 26x")).toBeNull();
    expect(parseRupiah("tanggal 20 okt")).toBeNull();
    expect(parseRupiah("unit 1026")).toBeNull();
  });
});

describe("parseGuests", () => {
  it.each([
    ["untuk 4 orang", 4],
    ["4 org", null],
    ["2 dewasa 1 anak", 3],
    ["berdua", 2],
    ["bertiga aja", 3],
    ["untuk 5", 5],
    ["sendiri", 1],
    ["untuk 3 malam", null],
    ["dua orang", 2],
  ])("%s", (text, expected) => {
    expect(parseGuests(text)).toBe(expected);
  });
});

describe("parseNights", () => {
  it.each([
    ["3 malam", 3],
    ["2 hari 1 malam", 1],
    ["seminggu", 7],
    ["2 minggu", 14],
    ["sebulan", 30],
    ["3 bulan", 90],
    ["weekend", 2],
    ["semalam aja", 1],
    ["4 hari", 4],
    ["tanpa durasi", null],
  ])("%s", (text, expected) => {
    expect(parseNights(text)).toBe(expected);
  });
});

describe("mentionsDate", () => {
  it.each([
    ["tanggal 20 okt", true],
    ["20/10 kosong", true],
    ["besok bisa?", true],
    ["minggu depan", true],
    ["harga studio", false],
    ["untuk 4 orang", false],
  ])("%s", (text, expected) => {
    expect(mentionsDate(text)).toBe(expected);
  });
});
