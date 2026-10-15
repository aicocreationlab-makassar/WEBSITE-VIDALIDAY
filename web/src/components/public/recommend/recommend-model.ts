// Logika murni "Unit serupa" dan riwayat dilihat (PRD 6.6 tahap 2, UX 2.6). Ada test.
// Tanpa akses jaringan atau penyimpanan; dipakai komponen klien di folder ini.

import { personalize, type Recommendation, type RecentEntry } from "@/lib/recommend";
import { formatUnitPlace } from "@/lib/unit-display";
import type { CatalogUnit } from "@/types/domain";

/** Jumlah kartu "Unit serupa": 6 (desktop 3 kolom x 2 baris). */
export const SIMILAR_LIMIT = 6;

/**
 * Urutan render server dan kunjungan pertama: skor tahap 1 tanpa bonus profil, maks. 3 unit dengan tipe
 * kamar persis sama, maks. 6, dilengkapi sampai 3 dari `pool` kalau kurang. Sengaja memakai `personalize`
 * dengan riwayat kosong supaya aturan batas tipe dan pelengkap hanya ada di satu tempat (`lib/recommend`).
 */
export function initialOrder(
  current: CatalogUnit,
  stage1: Recommendation[],
  pool: CatalogUnit[],
): Recommendation[] {
  return personalize(current, stage1, [], pool, SIMILAR_LIMIT);
}

/**
 * Urutan setelah hidrasi: tahap 1 + bonus profil dari riwayat di perangkat.
 * - Riwayat kosong atau hanya berisi unit ini (kunjungan pertama) → sama persis dengan `initialOrder`,
 *   jadi tidak ada kartu yang berpindah.
 * - Jumlah kartu selalu sama dengan `initialOrder`: batas per tipe dan pelengkap tidak bergantung urutan,
 *   sehingga tinggi section tidak berubah (tanpa pergeseran tata letak).
 */
export function rankSimilar(
  current: CatalogUnit,
  stage1: Recommendation[],
  recent: RecentEntry[],
  pool: CatalogUnit[],
): Recommendation[] {
  return personalize(current, stage1, recent, pool, SIMILAR_LIMIT);
}

/** Entri riwayat `vdl:recent` untuk unit yang sedang dilihat (waktu `v` diisi saat disimpan). */
export function toRecentEntry(unit: CatalogUnit): Omit<RecentEntry, "v"> {
  return {
    id: unit.id,
    slug: unit.slug,
    l: unit.locationSlug,
    c: unit.category,
    p: unit.effectivePrice,
    name: unit.name,
    photo: unit.photos[0] ?? null,
    place: formatUnitPlace(unit),
  };
}
