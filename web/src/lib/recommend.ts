// Rekomendasi "Unit serupa" (PRD 6.6).
// Tahap 1 (server): skor konten. Tahap 2 (klien): personalisasi dari riwayat di perangkat.
// Fungsi murni, tanpa akses jaringan; aman diimpor dari server maupun klien.

import { formatRupiahShort } from "@/lib/format";
import type { CatalogUnit, Popularity, RoomCategory } from "@/types/domain";

export type ReasonKind = "cheaper" | "bigger" | "same-location" | "same-type" | "same-view";

export type Recommendation = {
  unit: CatalogUnit;
  score: number;
  reason: { kind: ReasonKind; label: string } | null;
};

function jaccard(a: number[], b: number[]): number {
  if (!a.length && !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const id of setA) if (setB.has(id)) intersection += 1;
  return intersection / (setA.size + setB.size - intersection);
}

function same(a: string | null, b: string | null): boolean {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

const MIN_SAVING = 10_000;

function reasonFor(current: CatalogUnit, c: CatalogUnit): Recommendation["reason"] {
  const saving = current.effectivePrice - c.effectivePrice;
  if (c.category === current.category && saving >= MIN_SAVING) {
    return { kind: "cheaper", label: `Lebih hemat ${formatRupiahShort(saving)}` };
  }
  if (c.maxGuests > current.maxGuests) return { kind: "bigger", label: `Muat ${c.maxGuests} tamu` };
  if (c.locationId === current.locationId) return { kind: "same-location", label: "Apartemen sama" };
  if (c.roomTypeId !== null && c.roomTypeId === current.roomTypeId) return { kind: "same-type", label: "Tipe sama" };
  if (same(c.viewType, current.viewType)) return { kind: "same-view", label: "View sama" };
  return null;
}

/** Tahap 1: skor konten untuk semua kandidat (published, tersedia, bukan unit ini). Ambil 12 teratas. */
export function scoreSimilar(
  current: CatalogUnit,
  catalog: CatalogUnit[],
  popularity: Popularity = {},
  limit = 12,
): Recommendation[] {
  const candidates = catalog.filter((c) => c.id !== current.id && c.isAvailable);
  const maxLead = Math.max(0, ...candidates.map((c) => popularity[c.id] ?? 0));
  const currentAmenities = current.amenities.map((a) => a.id);
  const basePrice = current.effectivePrice > 0 ? current.effectivePrice : 1;
  const baseGuests = Math.max(current.maxGuests, 1);

  const scored = candidates.map((c) => {
    let score = 0;
    if (c.locationId === current.locationId) score += 25;
    const sameType = c.roomTypeId !== null && c.roomTypeId === current.roomTypeId;
    if (sameType) score += 25;
    else if (c.category === current.category && c.category !== "other") score += 15;
    score += 20 * Math.max(0, 1 - Math.abs(c.effectivePrice - current.effectivePrice) / basePrice);
    score += 10 * Math.max(0, 1 - Math.abs(c.maxGuests - current.maxGuests) / baseGuests);
    score += 10 * jaccard(
      c.amenities.map((a) => a.id),
      currentAmenities,
    );
    if (same(c.viewType, current.viewType)) score += 5;
    if (c.locationId === current.locationId && same(c.tower, current.tower)) score += 3;
    if (maxLead > 0) score += (5 * (popularity[c.id] ?? 0)) / maxLead;
    if (c.isFeatured) score += 2;
    return { unit: c, score, reason: reasonFor(current, c) };
  });

  return scored.sort((a, b) => b.score - a.score || a.unit.effectivePrice - b.unit.effectivePrice || a.unit.id - b.unit.id).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Tahap 2: personalisasi di perangkat (localStorage "vdl:recent", tidak dikirim ke server)
// ---------------------------------------------------------------------------

export type RecentEntry = {
  id: number;
  slug: string;
  /** slug apartemen */
  l: string;
  c: RoomCategory;
  p: number;
  /** waktu dilihat (ms epoch) */
  v: number;
  name: string;
  photo: string | null;
  place: string;
};

export type RecentProfile = {
  location: string | null;
  category: RoomCategory | null;
  medianPrice: number | null;
  seen: Set<number>;
};

function mostCommon<T extends string>(values: T[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function buildProfile(recent: RecentEntry[]): RecentProfile {
  return {
    location: mostCommon(recent.map((r) => r.l)),
    category: mostCommon(recent.map((r) => r.c)),
    medianPrice: median(recent.map((r) => r.p)),
    seen: new Set(recent.map((r) => r.id)),
  };
}

const MAX_SAME_TYPE = 3;

/**
 * Tahap 2: tambah bonus profil (+6 apartemen, +6 kategori, +4 harga dalam ±25% median, −4 sudah dilihat),
 * urutkan ulang, batasi maks. 3 unit dengan tipe kamar persis sama, ambil 6.
 * Kandidat < 3 → lengkapi dengan unit unggulan apartemen yang sama, lalu yang termurah.
 */
export function personalize(
  current: CatalogUnit,
  stage1: Recommendation[],
  recent: RecentEntry[],
  fallbackPool: CatalogUnit[] = [],
  limit = 6,
): Recommendation[] {
  const profile = buildProfile(recent.filter((r) => r.id !== current.id));
  const rescored = stage1.map((rec) => {
    let bonus = 0;
    if (profile.location && rec.unit.locationSlug === profile.location) bonus += 6;
    if (profile.category && rec.unit.category === profile.category) bonus += 6;
    if (profile.medianPrice !== null && Math.abs(rec.unit.effectivePrice - profile.medianPrice) <= profile.medianPrice * 0.25) {
      bonus += 4;
    }
    if (profile.seen.has(rec.unit.id)) bonus -= 4;
    return { ...rec, score: rec.score + bonus };
  });
  rescored.sort((a, b) => b.score - a.score || a.unit.id - b.unit.id);

  const picked: Recommendation[] = [];
  const perType = new Map<number | string, number>();
  for (const rec of rescored) {
    if (picked.length >= limit) break;
    const typeKey = rec.unit.roomTypeId ?? `none-${rec.unit.id}`;
    const count = perType.get(typeKey) ?? 0;
    if (count >= MAX_SAME_TYPE) continue;
    perType.set(typeKey, count + 1);
    picked.push(rec);
  }

  if (picked.length < 3) {
    const taken = new Set([current.id, ...picked.map((p) => p.unit.id)]);
    const pool = fallbackPool.filter((u) => u.isAvailable && !taken.has(u.id));
    const featuredSameLocation = pool
      .filter((u) => u.isFeatured && u.locationId === current.locationId)
      .sort((a, b) => a.effectivePrice - b.effectivePrice);
    const cheapest = [...pool].sort((a, b) => a.effectivePrice - b.effectivePrice);
    for (const unit of [...featuredSameLocation, ...cheapest]) {
      if (picked.length >= 3) break;
      if (picked.some((p) => p.unit.id === unit.id)) continue;
      picked.push({ unit, score: 0, reason: reasonFor(current, unit) });
    }
  }
  return picked;
}
