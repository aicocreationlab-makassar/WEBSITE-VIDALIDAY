// Nama tower di form unit admin: daftar saran dari unit yang sudah ada dan petunjuk ejaan
// ("Brensville" → "Brentsville"). Fungsi murni, ada test.

import { damerau } from "@/lib/chat/fuzzy";

/** "Tower Brentsville " → "brentsville" (awalan tower/blok/gedung/menara diabaikan saat membandingkan). */
function towerKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^(tower|blok|block|gedung|menara)[\s-]*/, "");
}

/**
 * Dua nama tower dianggap ejaan yang sama dengan salah ketik 1 huruf (2 untuk nama ≥ 8 huruf). Dibandingkan
 * per kata: kata yang berbeda dan berisi angka atau pendek (≤ 3 huruf) menandai tower yang memang lain
 * ("Blok A"/"Blok B", "Menara 1"/"Menara 2", "Tower A1"/"Tower A2"), bukan salah ketik.
 */
function similar(key: string, target: string): boolean {
  if (key === target) return true;
  const a = key.split(/[\s-]+/).filter(Boolean);
  const b = target.split(/[\s-]+/).filter(Boolean);
  if (!a.length || a.length !== b.length) return false;
  const max = target.length >= 8 ? 2 : 1;
  let total = 0;
  for (let index = 0; index < a.length; index++) {
    if (a[index] === b[index]) continue;
    if (/\d/.test(a[index]) || /\d/.test(b[index]) || a[index].length <= 3 || b[index].length <= 3) return false;
    total += damerau(a[index], b[index], max);
    if (total > max) return false;
  }
  return total <= max;
}

/**
 * Nama tower yang dipakai unit (beda huruf besar/kecil dianggap sama), diurutkan dari yang paling banyak
 * unitnya; per kelompok dipilih ejaan terbanyak. Ejaan yang mirip tower lain yang lebih banyak dipakai
 * ("Brensville" 1 unit vs "Brentsville" 30 unit) dianggap salah ketik dan tidak ikut disarankan.
 */
export function knownTowers(values: (string | null | undefined)[]): string[] {
  const groups = new Map<string, Map<string, number>>();
  for (const value of values) {
    const tower = value?.trim();
    if (!tower) continue;
    const key = towerKey(tower);
    const spellings = groups.get(key) ?? new Map<string, number>();
    spellings.set(tower, (spellings.get(tower) ?? 0) + 1);
    groups.set(key, spellings);
  }
  const ranked = [...groups.entries()]
    .map(([key, spellings]) => {
      const [best] = [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const total = [...spellings.values()].reduce((sum, count) => sum + count, 0);
      return { key, name: best[0], total };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "id"));
  const kept: typeof ranked = [];
  for (const item of ranked) {
    if (item.key.length >= 4 && kept.some((other) => similar(item.key, other.key))) continue;
    kept.push(item);
  }
  return kept.map((item) => item.name);
}

/**
 * Tower yang mungkin dimaksud kalau isian mirip (salah 1–2 huruf) tapi tidak sama dengan tower yang sudah
 * dipakai, mis. "Brensville" → "Brentsville". Tower di daftar diurutkan dari yang paling banyak unitnya,
 * jadi ejaan yang umum didahulukan. null kalau isian kosong, terlalu pendek, sudah sama, atau tidak mirip.
 */
export function towerSuggestion(value: string | null | undefined, towers: readonly string[]): string | null {
  const key = towerKey(value ?? "");
  if (key.length < 4) return null;
  if (towers.some((tower) => towerKey(tower) === key)) return null;
  return towers.find((tower) => similar(key, towerKey(tower))) ?? null;
}
