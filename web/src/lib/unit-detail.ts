// Fungsi murni untuk halaman detail unit /unit/[slug] (PRD 6.4). Ada test di unit-detail.test.ts.
// Aman diimpor dari server maupun klien (tanpa akses jaringan, tanpa jam sistem).

import type { BookingUnit } from "@/components/public/booking/types";
import { addDays, diffDays, formatRupiah, isDateString, stripMarkdown } from "@/lib/format";
import type { IconName } from "@/lib/icons";
import { estimateTotal, type Estimate } from "@/lib/pricing";
import { cardAmenities, formatUnitSpot, roomTypeHref, unitHref } from "@/lib/unit-display";
import { MAX_GUESTS } from "@/lib/validation/booking-constants";
import { ROOM_CATEGORIES, type CatalogUnit, type UnitDetail } from "@/types/domain";

// ---------------------------------------------------------------------------
// Bentuk data
// ---------------------------------------------------------------------------

/** Detail → CatalogUnit polos (tanpa deskripsi, video, dan lokasi) untuk komponen klien dan rekomendasi. */
export function toCatalogUnit(detail: UnitDetail): CatalogUnit {
  const { description, youtubeUrl, location, ...unit } = detail;
  void description;
  void youtubeUrl;
  void location;
  return unit;
}

/** Hanya field yang dibutuhkan form sewa (props klien sekecil mungkin). */
export function toBookingUnit(unit: CatalogUnit): BookingUnit {
  return {
    id: unit.id,
    slug: unit.slug,
    name: unit.name,
    locationSlug: unit.locationSlug,
    locationShortName: unit.locationShortName,
    category: unit.category,
    tower: unit.tower,
    floorNumber: unit.floorNumber,
    effectivePrice: unit.effectivePrice,
    normalPrice: unit.normalPrice,
    promoPrice: unit.promoPrice,
    isPromoActive: unit.isPromoActive,
    promoBadge: unit.promoBadge,
    weeklyPrice: unit.weeklyPrice,
    monthlyPrice: unit.monthlyPrice,
    maxGuests: unit.maxGuests,
    isAvailable: unit.isAvailable,
    photos: unit.photos,
  };
}

/**
 * Cadangan "Unit serupa" (PRD 6.6): maks. 8 unit tersedia selain unit ini,
 * unggulan apartemen yang sama dulu (termurah), lalu sisanya dari yang termurah.
 */
export function similarFallbackPool(current: CatalogUnit, catalog: CatalogUnit[], limit = 8): CatalogUnit[] {
  const pool = catalog.filter((unit) => unit.id !== current.id && unit.isAvailable);
  const byPrice = (a: CatalogUnit, b: CatalogUnit) => a.effectivePrice - b.effectivePrice || a.id - b.id;
  const featured = pool.filter((unit) => unit.isFeatured && unit.locationId === current.locationId).sort(byPrice);
  const taken = new Set(featured.map((unit) => unit.id));
  const rest = pool.filter((unit) => !taken.has(unit.id)).sort(byPrice);
  return [...featured, ...rest].slice(0, limit);
}

// ---------------------------------------------------------------------------
// Teks dan blok tampilan
// ---------------------------------------------------------------------------

export type UnitFactKey = "type" | "guests" | "floor" | "tower" | "view" | "size";

export type UnitFact = {
  key: UnitFactKey;
  label: string;
  value: string;
  icon: IconName;
};

const sizeNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** "Tower Ashton" → "Ashton"; nilai yang hanya berisi "Tower" dibiarkan. */
function towerName(tower: string): string {
  const stripped = tower.replace(/^tower\s+/i, "").trim();
  return stripped || tower;
}

type FactFields = Pick<
  CatalogUnit,
  "roomTypeName" | "category" | "maxGuests" | "floorNumber" | "tower" | "viewType" | "sizeSqm"
>;

/** Fakta kunci (DESIGN 4.8). Yang kosong tidak pernah ditampilkan sebagai "Lantai –". */
export function unitFacts(unit: FactFields): UnitFact[] {
  const facts: UnitFact[] = [];
  const typeName =
    unit.roomTypeName?.trim() ||
    (unit.category !== "other" ? ROOM_CATEGORIES.find((c) => c.value === unit.category)?.label : undefined);
  if (typeName) facts.push({ key: "type", label: "Tipe kamar", value: typeName, icon: "bed-double" });
  if (unit.maxGuests > 0) {
    facts.push({ key: "guests", label: "Kapasitas", value: `Maks. ${unit.maxGuests} tamu`, icon: "users" });
  }
  if (unit.floorNumber != null) {
    facts.push({ key: "floor", label: "Lantai", value: String(unit.floorNumber), icon: "layers" });
  }
  const tower = unit.tower?.trim();
  if (tower) facts.push({ key: "tower", label: "Tower", value: towerName(tower), icon: "building-2" });
  const view = unit.viewType?.trim();
  if (view) facts.push({ key: "view", label: "View", value: view, icon: "eye" });
  if (unit.sizeSqm != null && unit.sizeSqm > 0) {
    facts.push({ key: "size", label: "Luas", value: `${sizeNumber.format(unit.sizeSqm)} m²`, icon: "ruler" });
  }
  return facts;
}

export type RateRow = { key: "weekly" | "monthly"; amount: number; suffix: "/minggu" | "/bulan" };

/** Baris harga mingguan/bulanan, hanya kalau diisi admin. */
export function rateRows(unit: Pick<CatalogUnit, "weeklyPrice" | "monthlyPrice">): RateRow[] {
  const rows: RateRow[] = [];
  if (unit.weeklyPrice != null && unit.weeklyPrice > 0) {
    rows.push({ key: "weekly", amount: unit.weeklyPrice, suffix: "/minggu" });
  }
  if (unit.monthlyPrice != null && unit.monthlyPrice > 0) {
    rows.push({ key: "monthly", amount: unit.monthlyPrice, suffix: "/bulan" });
  }
  return rows;
}

/** Deskripsi siap tampil: tanpa tanda markdown, baris kosong berlebih dirapikan; kosong → null. */
export function cleanDescription(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = stripMarkdown(text.replace(/\r\n?/g, "\n"))
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || null;
}

/** Tebakan awal (sebelum diukur di browser) apakah deskripsi melebihi 4 baris di layar HP. */
export function isLongText(text: string, maxLines = 4, charsPerLine = 42): boolean {
  const lines = text.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  return lines > maxLines;
}

export type HouseRule = { text: string; icon: "cigarette-off" | "ban" };

/** Setting house_rules: satu poin per baris; penanda daftar ("-", "•", "1.") dibuang. */
export function parseHouseRules(text: string | null | undefined): HouseRule[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) =>
      stripMarkdown(line)
        .replace(/^\s*(?:[-•–·*]+|\d{1,2}[.)])\s*/, "")
        .trim(),
    )
    .filter(Boolean)
    .map((line) => ({ text: line, icon: /rokok|merokok|smoking|vape/i.test(line) ? "cigarette-off" : "ban" }));
}

export type Crumb = { name: string; href: string };

/** Beranda / {apartemen} / {tipe} / {unit}: dipakai breadcrumb dan JSON-LD BreadcrumbList. */
export function unitBreadcrumbs(
  unit: Pick<CatalogUnit, "slug" | "name" | "locationSlug" | "locationShortName"> &
    Partial<Pick<CatalogUnit, "roomTypeSlug" | "roomTypeName">>,
): Crumb[] {
  const crumbs: Crumb[] = [
    { name: "Beranda", href: "/" },
    { name: unit.locationShortName, href: `/apartemen/${encodeURIComponent(unit.locationSlug)}` },
  ];
  if (unit.roomTypeSlug && unit.roomTypeName) {
    crumbs.push({ name: unit.roomTypeName, href: roomTypeHref(unit.locationSlug, unit.roomTypeSlug) });
  }
  crumbs.push({ name: unit.name, href: unitHref(unit.slug) });
  return crumbs;
}

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

/** "{nama} — {tipe kamar} di {apartemen} Makassar" (template layout menambah "| VIDALIDAY"). */
export function unitMetaTitle(unit: Pick<CatalogUnit, "name" | "roomTypeName" | "locationShortName">): string {
  const place = /\bmakassar\b/i.test(unit.locationShortName) ? unit.locationShortName : `${unit.locationShortName} Makassar`;
  return `${unit.name} — ${unit.roomTypeName?.trim() || "Unit"} di ${place}`;
}

/**
 * Satu kalimat ringkasan unit dalam teks polos (untuk tamu dan AI Overview): tipe, apartemen, posisi,
 * kapasitas, harga per malam (+ mingguan/bulanan), fasilitas utama.
 */
export function unitSummarySentence(
  unit: Pick<
    CatalogUnit,
    | "name"
    | "roomTypeName"
    | "locationName"
    | "locationShortName"
    | "locationArea"
    | "tower"
    | "floorNumber"
    | "maxGuests"
    | "effectivePrice"
    | "weeklyPrice"
    | "monthlyPrice"
    | "amenities"
  >,
): string {
  const spot = formatUnitSpot(unit);
  const rates = [`${formatRupiah(unit.effectivePrice)}/malam`];
  if (unit.weeklyPrice) rates.push(`${formatRupiah(unit.weeklyPrice)}/minggu`);
  if (unit.monthlyPrice) rates.push(`${formatRupiah(unit.monthlyPrice)}/bulan`);
  // "A", "A atau B", "A, B, atau C".
  const ratesText = rates.length > 2 ? `${rates.slice(0, -1).join(", ")}, atau ${rates.at(-1)}` : rates.join(" atau ");
  const amenities = cardAmenities(unit.amenities, 3).map((amenity) => amenity.name);
  const first = `${unit.name} adalah unit ${unit.roomTypeName?.trim() || "apartemen"} di ${unit.locationName}${spot ? `, ${spot}` : ""}, muat maksimal ${unit.maxGuests} tamu, dengan harga ${ratesText}.`;
  return amenities.length ? `${first} Fasilitas: ${amenities.join(", ")}.` : first;
}

/** Deskripsi meta dari harga, kapasitas, dan 3 fasilitas utama. */
export function unitMetaDescription(
  unit: Pick<CatalogUnit, "name" | "locationName" | "effectivePrice" | "maxGuests" | "amenities" | "isAvailable">,
): string {
  const amenities = cardAmenities(unit.amenities, 3).map((amenity) => amenity.name);
  const facts = [`${formatRupiah(unit.effectivePrice)}/malam`, `maks. ${unit.maxGuests} tamu`];
  const withAmenities = amenities.length ? `${facts.join(", ")}, fasilitas ${amenities.join(", ")}` : facts.join(", ");
  const closing = unit.isAvailable ? "Pesan cepat via WhatsApp." : "Tanya ketersediaan via WhatsApp.";
  return `Sewa ${unit.name} di ${unit.locationName}: ${withAmenities}. Harian, mingguan, atau bulanan. ${closing}`;
}

// ---------------------------------------------------------------------------
// Galeri
// ---------------------------------------------------------------------------

/** Susunan grid galeri desktop menurut jumlah foto (UX 3c). */
export type GalleryLayout = "none" | "single" | "pair" | "trio" | "mosaic";

export function galleryLayout(count: number): GalleryLayout {
  if (count <= 0) return "none";
  if (count === 1) return "single";
  if (count === 2) return "pair";
  if (count <= 4) return "trio";
  return "mosaic";
}

/** Tangkapan layar video 9:16 dengan bar hitam (rasio lebar/tinggi < 0,5) → tampilkan di bingkai 9:16 cover. */
export function isLetterboxed(width: number, height: number): boolean {
  return width > 0 && height > 0 && width / height < 0.5;
}

/** Indeks foto dibatasi 0..count-1. */
export function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(index)));
}

// ---------------------------------------------------------------------------
// Kartu sewa desktop
// ---------------------------------------------------------------------------

export const MAX_NIGHTS = 365;

export function clampGuests(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_GUESTS, Math.max(1, Math.round(value)));
}

/**
 * Check-in dipindah: kalau melewati/menyamai check-out, check-out ikut bergeser
 * dengan jumlah malam sebelumnya (min. 1). Selain itu check-out tetap.
 */
export function shiftCheckOut(prevCheckIn: string, prevCheckOut: string, nextCheckIn: string): string {
  if (!isDateString(nextCheckIn)) return prevCheckOut;
  if (isDateString(prevCheckOut) && prevCheckOut > nextCheckIn) return prevCheckOut;
  const previous = isDateString(prevCheckIn) && isDateString(prevCheckOut) ? diffDays(prevCheckIn, prevCheckOut) : 1;
  const nights = Number.isFinite(previous) && previous >= 1 ? Math.min(previous, MAX_NIGHTS) : 1;
  return addDays(nextCheckIn, nights);
}

export type StayEstimate =
  | { status: "empty" }
  | { status: "invalid" }
  | { status: "too-long" }
  | { status: "ok"; estimate: Estimate };

type RateUnit = Pick<CatalogUnit, "effectivePrice" | "weeklyPrice" | "monthlyPrice">;

/** Estimasi untuk kartu sewa; rumus sama dengan lib/pricing (dan submit_lead). */
export function stayEstimate(unit: RateUnit, checkIn: string, checkOut: string): StayEstimate {
  if (!checkIn || !checkOut) return { status: "empty" };
  if (!isDateString(checkIn) || !isDateString(checkOut)) return { status: "invalid" };
  const nights = diffDays(checkIn, checkOut);
  if (!Number.isFinite(nights) || nights < 1) return { status: "invalid" };
  if (nights > MAX_NIGHTS) return { status: "too-long" };
  return {
    status: "ok",
    estimate: estimateTotal(
      { effective_price: unit.effectivePrice, weekly_price: unit.weeklyPrice, monthly_price: unit.monthlyPrice },
      nights,
    ),
  };
}

/** "(tarif mingguan)" / "(tarif bulanan)" bila berlaku. */
export function rateNote(estimate: Estimate): string | null {
  if (estimate.rate === "mingguan") return "tarif mingguan";
  if (estimate.rate === "bulanan") return "tarif bulanan";
  return null;
}
