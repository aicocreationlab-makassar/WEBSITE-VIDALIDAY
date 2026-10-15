// Logika murni daftar unit admin (PRD 7.4, UX 2.7): chip cepat, hitungan filter, pratinjau harga,
// aturan aksi massal, seleksi, dan teks ringkas. Dipakai komponen klien dan Server Action, ada unit test.

import type { AdminUnitFilter, AdminUnitRow, AdminUnitSort, QuickCounts } from "@/lib/admin/unit-query";
import { formatRupiah } from "@/lib/format";
import { badgeFor, effectivePrice, strikePrice } from "@/lib/pricing";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { BULK_ACTIONS } from "@/lib/validation/admin";

// ---------------------------------------------------------------------------
// Chip cepat & filter
// ---------------------------------------------------------------------------

export type QuickChipKey = keyof QuickCounts;

export const QUICK_CHIPS: { key: QuickChipKey; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "cek", label: "Perlu dicek" },
  { key: "penuh", label: "Penuh" },
  { key: "promo", label: "Promo aktif" },
  { key: "draft", label: "Draft" },
  { key: "unggulan", label: "Unggulan" },
];

/** Parameter URL yang dikendalikan chip cepat (saling meniadakan). */
const CHIP_PARAMS = ["status", "stok", "promo", "unggulan", "cek"] as const;

type ChipChanges = Record<(typeof CHIP_PARAMS)[number], string | null>;

const CHIP_VALUES: Record<QuickChipKey, Partial<ChipChanges>> = {
  semua: {},
  cek: { cek: "1" },
  penuh: { stok: "penuh" },
  promo: { promo: "aktif" },
  draft: { status: "draft" },
  unggulan: { unggulan: "1" },
};

/** Perubahan URL saat chip diklik: set nilai chip itu, kosongkan parameter chip lain. */
export function chipChanges(key: QuickChipKey): ChipChanges {
  const changes = Object.fromEntries(CHIP_PARAMS.map((param) => [param, null])) as ChipChanges;
  return { ...changes, ...CHIP_VALUES[key] };
}

/** Chip yang aktif, atau null kalau kombinasi filter tidak sama dengan satu chip mana pun. */
export function activeChip(filter: AdminUnitFilter): QuickChipKey | null {
  const current: ChipChanges = {
    status: filter.status,
    stok: filter.stok,
    promo: filter.promo,
    unggulan: filter.unggulan ? "1" : null,
    cek: filter.cek ? "1" : null,
  };
  for (const chip of QUICK_CHIPS) {
    const expected = chipChanges(chip.key);
    if (CHIP_PARAMS.every((param) => expected[param] === current[param])) return chip.key;
  }
  return null;
}

type Option<T extends string> = { value: T; label: string };

export const STATUS_OPTIONS: Option<"" | "tampil" | "draft">[] = [
  { value: "", label: "Semua status" },
  { value: "tampil", label: "Tampil" },
  { value: "draft", label: "Draft" },
];

export const STOCK_OPTIONS: Option<"" | "tersedia" | "penuh">[] = [
  { value: "", label: "Semua ketersediaan" },
  { value: "tersedia", label: "Tersedia" },
  { value: "penuh", label: "Penuh" },
];

export const PROMO_OPTIONS: Option<"" | "aktif" | "tidak">[] = [
  { value: "", label: "Semua promo" },
  { value: "aktif", label: "Promo aktif" },
  { value: "tidak", label: "Tanpa promo" },
];

export const SORT_OPTIONS: Option<AdminUnitSort>[] = [
  { value: "diubah", label: "Terakhir diubah" },
  { value: "nama", label: "Nama A–Z" },
  { value: "termurah", label: "Harga terendah" },
  { value: "termahal", label: "Harga tertinggi" },
];

/** Isian panel Filter (sheet di HP, baris select di desktop). */
export type PanelFilter = Pick<AdminUnitFilter, "lokasi" | "tipe" | "status" | "stok" | "promo" | "urut">;

export function panelFromFilter(filter: AdminUnitFilter): PanelFilter {
  return {
    lokasi: filter.lokasi,
    tipe: filter.tipe,
    status: filter.status,
    stok: filter.stok,
    promo: filter.promo,
    urut: filter.urut,
  };
}

export const EMPTY_PANEL: PanelFilter = { lokasi: null, tipe: null, status: null, stok: null, promo: null, urut: "diubah" };

/** Perubahan URL dari isian panel (tipe kamar hanya berlaku bersama apartemen; urutan bawaan tidak ditulis). */
export function panelChanges(panel: PanelFilter): Record<keyof PanelFilter, string | number | null> {
  return {
    lokasi: panel.lokasi,
    tipe: panel.lokasi ? panel.tipe : null,
    status: panel.status,
    stok: panel.stok,
    promo: panel.promo,
    urut: panel.urut === "diubah" ? null : panel.urut,
  };
}

/** Jumlah filter di panel Filter (apartemen, tipe, status, ketersediaan, promo); untuk badge tombol. */
export function panelFilterCount(filter: AdminUnitFilter): number {
  return [filter.lokasi, filter.tipe, filter.status, filter.stok, filter.promo].filter(Boolean).length;
}

/** Ada pencarian atau filter apa pun (urutan tidak dihitung). */
export function hasActiveFilters(filter: AdminUnitFilter): boolean {
  return Boolean(filter.q) || panelFilterCount(filter) > 0 || filter.unggulan || filter.cek;
}

// ---------------------------------------------------------------------------
// Harga
// ---------------------------------------------------------------------------

export type PriceDraft = {
  normalPrice: number | null;
  promoPrice: number | null;
  isPromoActive: boolean;
};

/**
 * Pratinjau harga untuk tamu, sama dengan yang tampil di kartu publik:
 * "Tamu melihat: Rp280.000/malam, coret Rp300.000, Hemat 7%".
 */
export function pricePreviewText(draft: PriceDraft, promoBadge: string | null = null): string {
  if (!draft.normalPrice || draft.normalPrice <= 0) return "Tamu melihat: harga belum lengkap.";
  const unit = {
    normal_price: draft.normalPrice,
    promo_price: draft.promoPrice ?? 0,
    is_promo_active: draft.isPromoActive,
    promo_badge: promoBadge,
  };
  const parts = [`${formatRupiah(effectivePrice(unit))}/malam`];
  const strike = strikePrice(unit);
  if (strike !== null) parts.push(`coret ${formatRupiah(strike)}`);
  const badge = badgeFor(unit);
  if (badge && strike !== null) parts.push(badge.label);
  return `Tamu melihat: ${parts.join(", ")}`;
}

/** Promo hanya bisa diaktifkan kalau harga promo terisi dan lebih murah dari harga normal. */
export function isPromoEligible(unit: { normalPrice: number; promoPrice: number }): boolean {
  return unit.promoPrice > 0 && unit.promoPrice < unit.normalPrice;
}

/** Ubah issues zod → { field: pesan pertama } (versi klien; guard.ts hanya untuk server). */
export function issuesToFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Aksi massal
// ---------------------------------------------------------------------------

export type BulkAction = (typeof BULK_ACTIONS)[number];

export const BULK_BUTTONS: { action: BulkAction; label: string }[] = [
  { action: "tersedia", label: "Tersedia" },
  { action: "penuh", label: "Penuh" },
  { action: "promo-on", label: "Promo aktif" },
  { action: "promo-off", label: "Promo mati" },
  { action: "tampil", label: "Tampilkan" },
  { action: "sembunyi", label: "Sembunyikan" },
];

export type RoomTypeTarget =
  | { ok: true; locationId: number }
  | { ok: false; reason: "empty" | "mixed" };

/** "Ubah tipe kamar" hanya untuk unit dari satu apartemen (tipe kamar milik apartemen). */
export function roomTypeTarget(rows: { locationId: number }[]): RoomTypeTarget {
  if (!rows.length) return { ok: false, reason: "empty" };
  const ids = new Set(rows.map((row) => row.locationId));
  return ids.size === 1 ? { ok: true, locationId: rows[0].locationId } : { ok: false, reason: "mixed" };
}

export const MIXED_LOCATION_MESSAGE = "Pilih unit dari satu apartemen saja untuk mengubah tipe kamar.";

/** Pesan hasil aksi massal (toast). */
export function bulkMessage(action: BulkAction, updated: number, skipped = 0, typeName?: string): string {
  const n = `${updated} unit`;
  const main: Record<BulkAction, string> = {
    tersedia: `${n} ditandai tersedia.`,
    penuh: `${n} ditandai penuh.`,
    "promo-on": `Promo aktif di ${n}.`,
    "promo-off": `Promo dimatikan di ${n}.`,
    tampil: `${n} ditampilkan di situs.`,
    sembunyi: `${n} disembunyikan dari situs.`,
    "ubah-tipe": typeName ? `Tipe kamar ${n} diubah ke ${typeName}.` : `Tipe kamar ${n} diubah.`,
  };
  if (!skipped) return main[action];
  const reason =
    action === "promo-on" ? "karena harga promo belum diisi atau tidak lebih murah" : "karena tidak ditemukan";
  return `${main[action]} ${skipped} unit dilewati ${reason}.`;
}

// ---------------------------------------------------------------------------
// Seleksi (Map id → baris, supaya pilihan bertahan saat pindah halaman)
// ---------------------------------------------------------------------------

export type Selection = ReadonlyMap<number, AdminUnitRow>;

export function toggleSelected(selection: Selection, row: AdminUnitRow): Map<number, AdminUnitRow> {
  const next = new Map(selection);
  if (next.has(row.id)) next.delete(row.id);
  else next.set(row.id, row);
  return next;
}

export function setPageSelected(selection: Selection, rows: AdminUnitRow[], checked: boolean): Map<number, AdminUnitRow> {
  const next = new Map(selection);
  for (const row of rows) {
    if (checked) next.set(row.id, row);
    else next.delete(row.id);
  }
  return next;
}

/** Status checkbox "pilih semua di halaman ini". */
export function pageSelectionState(selection: Selection, rows: AdminUnitRow[]): boolean | "indeterminate" {
  if (!rows.length) return false;
  const count = rows.filter((row) => selection.has(row.id)).length;
  if (count === 0) return false;
  return count === rows.length ? true : "indeterminate";
}

/** Data terbaru untuk baris terpilih: baris di halaman ini menggantikan salinan lama. */
export function freshSelection(selection: Selection, rows: AdminUnitRow[]): AdminUnitRow[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return [...selection.values()].map((row) => byId.get(row.id) ?? row);
}

// ---------------------------------------------------------------------------
// Teks baris & duplikat
// ---------------------------------------------------------------------------

/** Baris kecil kartu mobile: "Vida View · Studio · lt. 26" (tanpa potongan kosong). */
export function unitSubline(row: Pick<AdminUnitRow, "locationShortName" | "roomTypeName" | "floorNumber" | "tower">): string {
  const tower = row.tower?.trim();
  const spot =
    row.floorNumber != null ? `lt. ${row.floorNumber}` : tower ? (/^tower\b/i.test(tower) ? tower : `Tower ${tower}`) : null;
  return [row.locationShortName, row.roomTypeName, spot].filter(Boolean).join(" · ");
}

const NAME_MAX = 120;
const COPY_SUFFIX = " (salinan)";

/** "Studio AT 26X" → "Studio AT 26X (salinan)", tetap <= 120 karakter. */
export function duplicateName(name: string): string {
  const base = name.trim().slice(0, NAME_MAX - COPY_SUFFIX.length).trimEnd();
  return `${base}${COPY_SUFFIX}`;
}

/** Slug salinan unik dan <= 80 karakter (termasuk akhiran -2, -3, ...). */
export function duplicateSlug(slug: string, taken: Iterable<string>): string {
  const root = slugify(slug).slice(0, 68).replace(/-+$/g, "") || "unit";
  return uniqueSlug(`${root}-salinan`, taken);
}
