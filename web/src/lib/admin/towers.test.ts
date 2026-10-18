import { describe, expect, it } from "vitest";
import { knownTowers, towerSuggestion } from "./towers";

describe("knownTowers", () => {
  it("menggabungkan beda huruf besar/kecil, memilih ejaan terbanyak, urut dari yang paling banyak", () => {
    expect(knownTowers(["Brentsville", "brentsville", "Brentsville", "Ashton", " Ashton ", null, "", "Utama"])).toEqual([
      "Brentsville",
      "Ashton",
      "Utama",
    ]);
    expect(knownTowers([])).toEqual([]);
  });

  it("ejaan langka yang mirip tower umum dianggap salah ketik dan tidak disarankan", () => {
    const towers = knownTowers(["Brentsville", "Brentsville", "Brensville", "Ashton", "Tower Ashton"]);
    // "Tower Ashton" = "Ashton"; jumlah sama (2) → urut nama.
    expect(towers).toEqual(["Ashton", "Brentsville"]);
    // Unit lama yang salah ketik mendapat petunjuk ejaan.
    expect(towerSuggestion("Brensville", towers)).toBe("Brentsville");
  });
});

describe("towerSuggestion", () => {
  const towers = ["Brentsville", "Ashton"];

  it("menyarankan tower yang mirip (salah ketik)", () => {
    expect(towerSuggestion("Brensville", towers)).toBe("Brentsville");
    expect(towerSuggestion("Tower Brentsvile", towers)).toBe("Brentsville");
    expect(towerSuggestion("Ashtom", towers)).toBe("Ashton");
  });

  it("tower yang memang berbeda satu huruf/angka tidak dianggap salah ketik", () => {
    expect(knownTowers(["Blok A", "Blok A", "Blok A", "Blok B"])).toEqual(["Blok A", "Blok B"]);
    expect(knownTowers(["Menara 1", "Menara 2", "Tower A1", "Tower A2"])).toHaveLength(4);
    expect(towerSuggestion("Blok B", ["Blok A"])).toBeNull();
    expect(towerSuggestion("Menara 2", ["Menara 1"])).toBeNull();
    expect(towerSuggestion("Gedung B", ["Gedung A"])).toBeNull();
    // Salah ketik di kata panjang tetap dikenali.
    expect(towerSuggestion("Tower Brentsvile", ["Brentsville"])).toBe("Brentsville");
  });

  it("diam kalau sama, kosong, terlalu pendek, atau memang tower lain", () => {
    expect(towerSuggestion("Brentsville", towers)).toBeNull();
    expect(towerSuggestion("brentsville", towers)).toBeNull();
    expect(towerSuggestion("Tower Ashton", towers)).toBeNull();
    expect(towerSuggestion("", towers)).toBeNull();
    expect(towerSuggestion("A", towers)).toBeNull();
    expect(towerSuggestion("Utama", towers)).toBeNull();
    expect(towerSuggestion("Brensville", [])).toBeNull();
  });
});
