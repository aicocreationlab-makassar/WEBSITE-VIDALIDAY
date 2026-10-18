import { describe, expect, it } from "vitest";
import { bestMatch, damerau, fuzzyThreshold, phraseSimilarity, tokenMatches } from "./fuzzy";

describe("damerau", () => {
  it("menghitung jarak termasuk transposisi", () => {
    expect(damerau("dleft", "delft")).toBe(1);
    expect(damerau("studoi", "studio")).toBe(1);
    expect(damerau("harga", "harga")).toBe(0);
    expect(damerau("abc", "xyz")).toBe(3);
    expect(damerau("abcdef", "abc", 1)).toBe(2);
  });
});

describe("tokenMatches", () => {
  it("ambang mengikuti panjang kata", () => {
    expect(fuzzyThreshold(3)).toBe(0);
    expect(fuzzyThreshold(5)).toBe(1);
    expect(fuzzyThreshold(8)).toBe(2);
    expect(fuzzyThreshold(12)).toBe(3);
    expect(tokenMatches("dleft", "delft")).toBe(true);
    expect(tokenMatches("tersedi", "tersedia")).toBe(true);
    expect(tokenMatches("hrga", "harga")).toBe(true);
    expect(tokenMatches("ac", "ac")).toBe(true);
    expect(tokenMatches("ab", "ac")).toBe(false);
    expect(tokenMatches("26", "28")).toBe(false);
    expect(tokenMatches("studi", "studio")).toBe(true);
    expect(tokenMatches("stu", "studio")).toBe(false);
    expect(tokenMatches("harga", "hari")).toBe(false);
  });

  it("bestMatch memilih kandidat paling mirip", () => {
    expect(bestMatch("vidavew", ["vidaview", "delft"])).toBe("vidaview");
    expect(bestMatch("xyz", ["vidaview", "delft"])).toBeNull();
  });
});

describe("phraseSimilarity", () => {
  it("jaccard fuzzy", () => {
    expect(phraseSimilarity(["syarat", "checkin"], ["syarat", "checkin", "apartemen"])).toEqual({ score: 2 / 3, shared: 2 });
    expect(phraseSimilarity(["harga"], ["aturan", "menginap"]).score).toBe(0);
    expect(phraseSimilarity([], ["a"]).score).toBe(0);
  });
});
