// Normalisasi teks tamu untuk bot chat: huruf kecil tanpa aksen, frasa dan slang dibakukan, lalu
// pembacaan angka (rupiah, tamu, malam) dan deteksi penyebutan tanggal. Fungsi murni, ada test.

import { NUMBER_WORDS, PHRASES, SLANG, STOPWORDS } from "./lexicon";

export type Token = { norm: string; isNumber: boolean };

const DIGIT_SEP = "\u0001";

/** Frasa multi-kata → token tunggal (lihat lexicon.PHRASES). */
export function expandPhrases(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PHRASES) out = out.replace(pattern, replacement);
  return out;
}

/** Teks apa adanya → teks baku: "Brp HRG studio di Vida??" → "berapa harga studio di vidaview". */
export function normalizeText(raw: string): string {
  let text = raw.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  // Titik/koma di dalam angka dipertahankan (300.000, 1,5jt); tanda baca lain jadi spasi.
  text = text.replace(/(\d)[.,](\d)/g, `$1${DIGIT_SEP}$2`);
  text = text.replace(/[^a-z0-9\u0001/\-\s]/g, " ");
  // Garis miring dan strip hanya bertahan di antara angka (tanggal 20/10, rentang 300-500).
  text = text.replace(/(?<!\d)[/-]|[/-](?!\d)/g, " ");
  text = text.replace(/\u0001/g, ".");
  text = ` ${text.replace(/\s+/g, " ").trim()} `;
  text = expandPhrases(text);
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => SLANG[token] ?? token)
    .join(" ")
    .trim();
}

export function tokenize(text: string): Token[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((norm) => ({ norm, isNumber: /^\d/.test(norm) }));
}

/** Token bermakna (tanpa kata sambung) untuk mencocokkan FAQ dan nama. */
export function contentTokens(tokens: readonly Token[]): string[] {
  return tokens.map((token) => token.norm).filter((norm) => !STOPWORDS.has(norm));
}

/** Teks tanpa spasi/tanda apa pun, untuk mencocokkan kode unit dan nama tipe. */
export function squash(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ---------------------------------------------------------------------------
// Angka
// ---------------------------------------------------------------------------

export type Budget = { min: number | null; max: number | null };

const RANGE_UNIT_PATTERN = /(\d+(?:\.\d+)?)\s*(?:-|sampai|hingga|s\/d)\s*(\d+(?:\.\d+)?)\s*(rb|ribu|k|jt|juta)\b/;
const UNIT_PATTERN = /(\d+(?:\.\d+)?)\s*(rb|ribu|k|jt|juta)\b/g;
const THOUSANDS_PATTERN = /\b\d{1,3}(?:\.\d{3})+\b(?!\s*(?:rb|ribu|k|jt|juta)\b)/g;
const BARE_PATTERN = /\b\d{5,8}\b/g;
const BUDGET_CUE = /\b(budget|harga|maks|maksimal|max|dibawah|diatas|sekitar|under|sampai|hingga|antara|dana|uang)\b/;
const NOT_RUPIAH_AFTER =
  /^\s*(orang|tamu|dewasa|anak|malam|hari|night|minggu|bulan|jam|lantai|tower|x|jan|feb|mar|apr|mei|jun|jul|agu|agt|sep|okt|nov|des|\/|-)/;
const MAX_CUE = /\b(dibawah|maks|maksimal|max|under|sampai|hingga|budget|paling mahal|mentok)\b/;
const MIN_CUE = /\b(diatas|minimal|mulai|paling murah|termurah)\b/;
const RANGE_CUE = /\b(antara|sampai|hingga|s\/d)\b|\d\s*-\s*\d/;

/** Nominal rupiah di teks: 300rb, 300 ribu, 300k, 300.000, 0,5jt, 1,2 juta, sejuta; "budget 300" = 300.000. */
export function parseRupiah(text: string): Budget | null {
  // "300-500 ribu": satuan di akhir berlaku untuk kedua angka.
  const range = RANGE_UNIT_PATTERN.exec(text);
  if (range) {
    const factor = range[3] === "jt" || range[3] === "juta" ? 1_000_000 : 1_000;
    const a = Math.round(Number.parseFloat(range[1]) * factor);
    const b = Math.round(Number.parseFloat(range[2]) * factor);
    if (Number.isFinite(a) && Number.isFinite(b) && a >= 10_000 && b >= 10_000) return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  const values: number[] = [];
  const consumed: [number, number][] = [];
  for (const match of text.matchAll(UNIT_PATTERN)) {
    const amount = Number.parseFloat(match[1]);
    const factor = match[2] === "jt" || match[2] === "juta" ? 1_000_000 : 1_000;
    if (Number.isFinite(amount)) {
      values.push(Math.round(amount * factor));
      consumed.push([match.index, match.index + match[0].length]);
    }
  }
  const covered = (index: number) => consumed.some(([start, end]) => index >= start && index < end);
  for (const match of text.matchAll(THOUSANDS_PATTERN)) {
    if (covered(match.index)) continue;
    values.push(Number(match[0].replace(/\./g, "")));
  }
  for (const match of text.matchAll(BARE_PATTERN)) {
    if (covered(match.index)) continue;
    const rest = text.slice(match.index + match[0].length);
    if (!NOT_RUPIAH_AFTER.test(rest)) values.push(Number(match[0]));
  }
  if (/\bsejuta\b/.test(text)) values.push(1_000_000);
  if (/\bsetengah juta\b/.test(text)) values.push(500_000);
  if (/\bseratus ribu\b/.test(text)) values.push(100_000);
  if (!values.length && BUDGET_CUE.test(text)) {
    for (const match of text.matchAll(/\b(\d{2,3})\b/g)) {
      const rest = text.slice(match.index + match[0].length);
      if (!NOT_RUPIAH_AFTER.test(rest)) values.push(Number(match[1]) * 1_000);
    }
  }
  const valid = values.filter((value) => value >= 10_000 && value <= 100_000_000);
  if (!valid.length) return null;

  if (valid.length >= 2 && RANGE_CUE.test(text)) {
    return { min: Math.min(...valid), max: Math.max(...valid) };
  }
  if (MIN_CUE.test(text) && !MAX_CUE.test(text)) return { min: valid[0], max: null };
  return { min: null, max: valid[0] };
}

const GUEST_UNIT = /\b(\d{1,2})\s*(orang|tamu|dewasa|anak|pax)\b/g;
const GUEST_WORD = /\b(berdua|bertiga|berempat|berlima|berenam|sendiri|sendirian)\b/;
const GUEST_FOR = /\b(untuk|buat|bawa)\s+(\d{1,2})\b(?!\s*(malam|hari|minggu|bulan|rb|ribu|k|jt|juta|x))/;
const GUEST_WORD_UNIT = /\b(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\s*(orang|tamu|dewasa|anak)\b/g;

/** Jumlah tamu: "4 org", "2 dewasa 1 anak" (dijumlah), "berdua", "untuk 5". */
export function parseGuests(text: string): number | null {
  let total = 0;
  for (const match of text.matchAll(GUEST_UNIT)) total += Number(match[1]);
  for (const match of text.matchAll(GUEST_WORD_UNIT)) total += NUMBER_WORDS[match[1]] ?? 0;
  if (total > 0) return Math.min(total, 30);
  const word = GUEST_WORD.exec(text);
  if (word) return NUMBER_WORDS[word[1]] ?? null;
  const forMatch = GUEST_FOR.exec(text);
  if (forMatch) return Math.min(Number(forMatch[2]), 30);
  return null;
}

const NIGHT_UNIT = /\b(\d{1,3})\s*(malam|night|nite|nights)\b/;
const DAY_UNIT = /\b(\d{1,3})\s*(hari|days?)\b/;
const WEEK_UNIT = /\b(\d{1,2})\s*(minggu|weeks?)\b/;
const MONTH_UNIT = /\b(\d{1,2})\s*(bulan|months?)\b/;
const NIGHT_WORD = /\b(semalam|dua malam|tiga malam|seminggu|sebulan|weekend|akhir pekan)\b/;
const NIGHT_WORDS: Record<string, number> = {
  semalam: 1,
  "dua malam": 2,
  "tiga malam": 3,
  seminggu: 7,
  sebulan: 30,
  weekend: 2,
  "akhir pekan": 2,
};

/** Lama menginap dalam malam: "3 malam", "2 hari 1 malam" → 1, "seminggu" → 7, "2 bulan" → 60. */
export function parseNights(text: string): number | null {
  const night = NIGHT_UNIT.exec(text);
  if (night) return clampNights(Number(night[1]));
  const week = WEEK_UNIT.exec(text);
  if (week) return clampNights(Number(week[1]) * 7);
  const month = MONTH_UNIT.exec(text);
  if (month) return clampNights(Number(month[1]) * 30);
  const day = DAY_UNIT.exec(text);
  if (day) return clampNights(Number(day[1]));
  const word = NIGHT_WORD.exec(text);
  if (word) return NIGHT_WORDS[word[1]] ?? null;
  return null;
}

function clampNights(value: number): number | null {
  if (!Number.isFinite(value) || value < 1) return null;
  return Math.min(value, 365);
}

const DATE_PATTERNS = [
  /\b\d{1,2}[/-]\d{1,2}\b/,
  /\b\d{1,2}\s*(jan|feb|mar|apr|mei|jun|jul|agu|agt|sep|okt|nov|des)\w*\b/,
  /\btanggal\b/,
  /\b(besok|lusa|minggu depan|bulan depan|akhir pekan|weekend|tahun baru|lebaran|natal|hari ini|nanti malam|malam ini|liburan sekolah|long weekend)\b/,
];

export function mentionsDate(text: string): boolean {
  return DATE_PATTERNS.some((pattern) => pattern.test(text));
}
