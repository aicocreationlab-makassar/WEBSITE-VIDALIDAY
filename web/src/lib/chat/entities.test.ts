import { describe, expect, it } from "vitest";
import { detectApartments, detectUnit, extractEntities } from "./entities";
import { normalizeText, tokenize } from "./normalize";
import { sampleIndex, sampleKnowledge } from "./test-knowledge";

const k = sampleKnowledge();
const idx = sampleIndex(k);

function entities(raw: string) {
  const text = normalizeText(raw);
  return extractEntities(text, tokenize(text), k, idx);
}

describe("apartemen", () => {
  it("mengenali alias statis, nama otomatis, dan typo", () => {
    expect(detectApartments(tokenize(normalizeText("harga di vida")), k)).toEqual(["vida-view"]);
    expect(detectApartments(tokenize(normalizeText("yang di Vida View")), k)).toEqual(["vida-view"]);
    expect(detectApartments(tokenize(normalizeText("dleft deket mall ga")), k)).toEqual(["delft-cpi"]);
    expect(detectApartments(tokenize(normalizeText("yang di cpi")), k)).toEqual(["delft-cpi"]);
    expect(detectApartments(tokenize(normalizeText("vida atau delft lebih murah?")), k)).toEqual(["vida-view", "delft-cpi"]);
    expect(detectApartments(tokenize(normalizeText("harga studio")), k)).toEqual([]);
  });

  it("kata umum tidak dianggap apartemen", () => {
    expect(detectApartments(tokenize(normalizeText("view laut ada?")), k)).toEqual([]);
    expect(detectApartments(tokenize(normalizeText("apartemen mana yang murah")), k)).toEqual([]);
  });
});

describe("tipe dan unit", () => {
  it("kategori dari kata dan typo", () => {
    expect(entities("studoi buat berdua").category).toBe("studio");
    expect(entities("ada 2 bedroom?").category).toBe("2br");
    expect(entities("3br delft").category).toBe("3br");
  });

  it("tipe kamar majemuk menentukan apartemen pemiliknya", () => {
    const e = entities("harga studio corner");
    expect(e.roomType).toBe("studio-corner");
    expect(e.category).toBe("studio");
    expect(e.apartment).toBe("delft-cpi");
    expect(entities("studio plus ada?").roomType).toBe("studio-plus");
  });

  it("unit dari kode, nomor, dan nama", () => {
    expect(detectUnit(normalizeText("AT 26X msh ada?"), k)?.slug).toBe("unit-1");
    expect(detectUnit(normalizeText("at26x"), k)?.slug).toBe("unit-1");
    expect(detectUnit(normalizeText("bv 19v berapa"), k)?.slug).toBe("unit-3");
    expect(detectUnit(normalizeText("studio 0812 kosong?"), k)?.slug).toBe("unit-5");
    expect(detectUnit(normalizeText("Studio Delft 0812"), k)?.slug).toBe("unit-5");
    expect(detectUnit(normalizeText("harga studio"), k)).toBeNull();
    const e = entities("AT 26X msh ada?");
    expect(e.unit).toBe("unit-1");
    expect(e.apartment).toBe("vida-view");
    expect(e.category).toBe("studio");
  });
});

describe("angka, fasilitas, landmark, FAQ", () => {
  it("budget, tamu, malam, tanggal", () => {
    const e = entities("studio buat 4 org 3 malam budget 300rb tgl 20 okt");
    expect(e.guests).toBe(4);
    expect(e.nights).toBe(3);
    expect(e.budget).toEqual({ min: null, max: 300_000 });
    expect(e.dateMentioned).toBe(true);
  });

  it("fasilitas kamar dari aturan ikon dan nama", () => {
    expect(entities("ada wifi sama dapur ga?").amenities.sort()).toEqual([2, 7]);
    expect(entities("kitchen set ada?").amenities).toEqual([7]);
    expect(entities("buat 4 orang").amenities).toEqual([]);
    expect(entities("view laut").amenities).toEqual([]);
  });

  it("fasilitas gedung dan landmark dibatasi apartemen yang disebut", () => {
    expect(entities("kolam renang di delft ada?").facilities).toEqual([4]);
    expect(entities("ada gym?").facilities).toEqual([2]);
    expect(entities("dleft deket mall ga?").landmarks).toEqual([3]);
    expect(entities("dekat bandara?").landmarks).toEqual([2]);
    expect(entities("rumah sakit terdekat").landmarks).toEqual([5]);
  });

  it("FAQ dari kemiripan pertanyaan", () => {
    expect(entities("syarat check in apa aja?").faq?.id).toBe(1);
    expect(entities("ada deposit?").faq?.id).toBe(3);
    expect(entities("harga studio").faq).toBeNull();
  });

  it("kata semua apartemen dan tanpa budget", () => {
    expect(entities("semua apartemen").allApartments).toBe(true);
    expect(entities("tanpa budget").anyBudget).toBe(true);
  });
});
