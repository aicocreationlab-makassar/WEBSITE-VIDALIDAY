// Model daftar FAQ admin (PRD 7.7). Fungsi murni (tanpa React/Supabase), ada unit test.
// Kolom lama `badge` tidak dibaca, diubah, atau ditampilkan.

import { sortBySortOrder } from "@/components/admin/locations/location-model";
import { normalizeSearch } from "@/lib/admin/unit-query";
import { stripMarkdown } from "@/lib/format";

export type AdminFaqRow = {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

/** Baris mentah tabel `faqs` (tanpa badge). */
export type RawFaq = { id: number; question: string; answer: string; sort_order: number; is_active: boolean };

export type FaqChip = "semua" | "aktif" | "nonaktif";

export const FAQ_CHIPS: { value: FaqChip; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "aktif", label: "Aktif" },
  { value: "nonaktif", label: "Nonaktif" },
];

/** Beranda menampilkan sekian FAQ aktif teratas sebelum "Lihat semua pertanyaan" (PRD 6.2). */
export const HOME_FAQ_COUNT = 5;
export const QUESTION_MAX = 255;
export const ANSWER_MAX = 2000;

export function toFaqRow(raw: RawFaq): AdminFaqRow {
  return {
    id: raw.id,
    question: raw.question,
    answer: raw.answer,
    sortOrder: raw.sort_order,
    isActive: raw.is_active,
  };
}

/** Urutan tampil: sort_order lalu id (sama dengan situs). */
export function sortFaqs<T extends AdminFaqRow>(rows: readonly T[]): T[] {
  return sortBySortOrder(rows);
}

/** Setiap kata pencarian harus ada di pertanyaan atau jawaban (abaikan huruf besar dan tanda baca). */
export function matchesFaq(row: Pick<AdminFaqRow, "question" | "answer">, query: string): boolean {
  const tokens = query.split(/\s+/).map(normalizeSearch).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalizeSearch(`${row.question} ${row.answer}`);
  return tokens.every((token) => haystack.includes(token));
}

export function matchesFaqChip(row: Pick<AdminFaqRow, "isActive">, chip: FaqChip): boolean {
  if (chip === "aktif") return row.isActive;
  if (chip === "nonaktif") return !row.isActive;
  return true;
}

export function filterFaqs<T extends AdminFaqRow>(rows: readonly T[], query: string, chip: FaqChip): T[] {
  return sortFaqs(rows.filter((row) => matchesFaq(row, query) && matchesFaqChip(row, chip)));
}

/** Jumlah per chip, dihitung dari hasil pencarian saat ini. */
export function faqChipCounts(rows: readonly AdminFaqRow[], query: string): Record<FaqChip, number> {
  const base = rows.filter((row) => matchesFaq(row, query));
  return {
    semua: base.length,
    aktif: base.filter((row) => row.isActive).length,
    nonaktif: base.filter((row) => !row.isActive).length,
  };
}

/** Id FAQ aktif yang langsung terlihat di beranda (5 teratas). */
export function homeFaqIds(rows: readonly AdminFaqRow[], count = HOME_FAQ_COUNT): Set<number> {
  return new Set(
    sortFaqs(rows.filter((row) => row.isActive))
      .slice(0, count)
      .map((row) => row.id),
  );
}

/** Urutan untuk FAQ baru: max + 1 (perilaku admin lama). */
export function nextFaqSortOrder(rows: readonly Pick<AdminFaqRow, "sortOrder">[]): number {
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), 0) + 1;
}

/** Cuplikan jawaban satu paragraf tanpa tanda * (dipotong 2 baris oleh CSS). */
export function answerPreview(answer: string): string {
  return stripMarkdown(answer).replace(/\s+/g, " ").trim();
}

/** Teks masih menyebut tombol lama "Pesan via WhatsApp" (sekarang "Sewa sekarang"). */
export function mentionsLegacyButton(text: string | null | undefined): boolean {
  if (!text) return false;
  return /pesan\s+(via|lewat|melalui|di)\s+(wa|whats\s*app)\b/i.test(text);
}
