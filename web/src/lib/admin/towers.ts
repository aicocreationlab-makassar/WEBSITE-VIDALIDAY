// Nama tower di form unit admin: daftar saran dari unit yang sudah ada dan petunjuk ejaan
// ("Brensville" → "Brentsville"). Fungsi murni, ada test.

import { damerau } from "@/lib/chat/fuzzy";

/** "Tower Brentsville " → "brentsville" (awalan "tower" diabaikan saat membandingkan). */
function towerKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^tower\s+/, "");
}

/** Dua nama tower dianggap ejaan yang sama dengan salah ketik 1 huruf (2 untuk nama ≥ 8 huruf). */
function similar(key: string, target: string): boolean {
  const max = target.length >= 8 ? 2 : 1;
  return damerau(key, target, max) <= max;
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
