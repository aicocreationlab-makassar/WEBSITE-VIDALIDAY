// Pencocokan toleran typo untuk bot chat: jarak Damerau-Levenshtein (OSA), ambang per panjang kata,
// dan kemiripan frasa (Jaccard fuzzy). Fungsi murni, ada test.

/** Jarak Damerau-Levenshtein (optimal string alignment) dengan batas atas untuk berhenti lebih awal. */
export function damerau(a: string, b: string, max = Number.POSITIVE_INFINITY): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    let rowMin = Number.POSITIVE_INFINITY;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, d[i - 2][j - 2] + 1);
      }
      d[i][j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** Toleransi typo menurut panjang kata target: pendek harus persis, kata panjang boleh 2-3 salah. */
export function fuzzyThreshold(length: number): number {
  if (length <= 3) return 0;
  if (length <= 5) return 1;
  if (length <= 8) return 2;
  return 3;
}

const NUMERIC = /^\d/;

/**
 * Token input cocok dengan kata target: persis, dalam ambang typo, atau awalan (minimal 4 huruf dari
 * kata ≥ 5 huruf, mis. "studi" → "studio"). Angka dan kata ≤ 2 huruf hanya cocok persis.
 */
export function tokenMatches(token: string, target: string): boolean {
  if (token === target) return true;
  if (!token || !target) return false;
  if (NUMERIC.test(token) || NUMERIC.test(target) || token.length <= 2 || target.length <= 2) return false;
  // Awalan hanya untuk kata yang hampir lengkap ("studi" → studio), bukan "berapa" → berapajauh.
  if (target.length >= 5 && token.length >= 4 && token.length >= target.length * 0.7 && target.startsWith(token)) return true;
  // Ambang mengikuti kata yang lebih pendek, supaya "berapa" tidak dianggap "jamberapa".
  const threshold = Math.min(fuzzyThreshold(target.length), fuzzyThreshold(token.length));
  if (threshold === 0) return false;
  return damerau(token, target, threshold) <= threshold;
}

/** Kandidat paling mirip; null kalau tidak ada yang lolos ambang. */
export function bestMatch(token: string, candidates: readonly string[]): string | null {
  let best: string | null = null;
  let bestScore = -1;
  for (const candidate of candidates) {
    if (!tokenMatches(token, candidate)) continue;
    const score = 1 - damerau(token, candidate) / Math.max(candidate.length, 1);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/** Jaccard fuzzy dua daftar token: |irisan| / |gabungan|, token dianggap sama bila tokenMatches. */
export function phraseSimilarity(a: readonly string[], b: readonly string[]): { score: number; shared: number } {
  if (!a.length || !b.length) return { score: 0, shared: 0 };
  const used = new Set<number>();
  let shared = 0;
  for (const token of a) {
    const index = b.findIndex((candidate, i) => !used.has(i) && tokenMatches(token, candidate));
    if (index >= 0) {
      used.add(index);
      shared += 1;
    }
  }
  const union = a.length + b.length - shared;
  return { score: union ? shared / union : 0, shared };
}
