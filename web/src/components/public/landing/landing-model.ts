// Model halaman landing tipe kamar per apartemen /apartemen/[slug]/[tipe] (SEO, AI Overview).
// Semua teks dibentuk dari fakta data; fungsi murni, ada test.

import { formatRupiah, formatRupiahShort, toDisplayLegalName } from "@/lib/format";
import { sortUnits } from "@/lib/search";
import { formatUnitSpot, roomTypeHref } from "@/lib/unit-display";
import { sewaHref } from "@/lib/validation/filters";
import type { Amenity, CatalogUnit, Faq, Landmark, LocationWithTypes, RoomTypeSummary } from "@/types/domain";
import type { SiteSettings } from "@/types/settings";

export type LandingData = {
  location: LocationWithTypes;
  type: RoomTypeSummary;
  /** Unit tipe ini, tersedia dulu lalu termurah. */
  units: CatalogUnit[];
  allFull: boolean;
  /** Harga unit tersedia; semua penuh → dari semua unit. */
  priceFrom: number | null;
  priceTo: number | null;
  weeklyFrom: number | null;
  monthlyFrom: number | null;
  capacityMax: number;
  sizeRange: { min: number; max: number } | null;
  floorRange: { min: number; max: number } | null;
  /** Nama tower unik; kosong untuk gedung satu tower (Delft). */
  towers: string[];
  views: string[];
  /** Fasilitas kamar yang ada di minimal separuh unit, maks 12. */
  commonAmenities: Amenity[];
};

export type LandingSettings = Pick<SiteSettings, "companyLegalName" | "checkinTime" | "checkoutTime" | "officeHours" | "whatsappNumber">;

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 155;
const MAX_COMMON = 12;

export function findLandingType(location: LocationWithTypes, tipe: string): RoomTypeSummary | null {
  return location.roomTypes.find((type) => type.slug === tipe && type.unitCount > 0) ?? null;
}

function range(values: number[]): { min: number; max: number } | null {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  return valid.length ? { min: Math.min(...valid), max: Math.max(...valid) } : null;
}

function minOf(values: (number | null)[]): number | null {
  const valid = values.filter((value): value is number => value !== null && value > 0);
  return valid.length ? Math.min(...valid) : null;
}

export function buildLanding(location: LocationWithTypes, type: RoomTypeSummary, catalog: CatalogUnit[]): LandingData {
  const units = sortUnits(
    catalog.filter((unit) => unit.locationId === location.id && unit.roomTypeId === type.id),
    "termurah",
  );
  const available = units.filter((unit) => unit.isAvailable);
  const allFull = available.length === 0;
  const priced = allFull ? units : available;
  const prices = range(priced.map((unit) => unit.effectivePrice));

  const counts = new Map<number, number>();
  const byId = new Map<number, Amenity>();
  for (const unit of units) {
    for (const amenity of unit.amenities) {
      counts.set(amenity.id, (counts.get(amenity.id) ?? 0) + 1);
      byId.set(amenity.id, amenity);
    }
  }
  const threshold = Math.max(1, Math.ceil(units.length / 2));
  const commonAmenities = [...counts.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([id]) => byId.get(id)!)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .slice(0, MAX_COMMON);

  return {
    location,
    type,
    units,
    allFull,
    priceFrom: prices?.min ?? null,
    priceTo: prices?.max ?? null,
    weeklyFrom: minOf(units.map((unit) => unit.weeklyPrice)),
    monthlyFrom: minOf(units.map((unit) => unit.monthlyPrice)),
    capacityMax: units.reduce((max, unit) => Math.max(max, unit.maxGuests), 0),
    sizeRange: range(units.map((unit) => unit.sizeSqm ?? 0)),
    floorRange: range(units.map((unit) => unit.floorNumber ?? 0)),
    towers: [...new Set(units.map((unit) => unit.tower?.trim()).filter((tower): tower is string => Boolean(tower)))],
    views: [...new Set(units.map((unit) => unit.viewType?.trim()).filter((view): view is string => Boolean(view)))],
    commonAmenities,
  };
}

function withCity(name: string): string {
  return /\bmakassar\b/i.test(name) ? name : `${name} Makassar`;
}

/** "Sewa Studio di Vida View Makassar, Harian & Bulanan" */
export function landingH1(d: LandingData): string {
  return `Sewa ${d.type.name} di ${withCity(d.location.shortName)}, Harian & Bulanan`;
}

/** Judul meta ≤ 60 karakter, dipendekkan bertahap. */
export function landingMetaTitle(d: LandingData): string {
  const candidates = [
    `Sewa ${d.type.name} ${withCity(d.location.shortName)} Harian & Bulanan | VIDALIDAY`,
    `Sewa ${d.type.name} ${withCity(d.location.shortName)} | VIDALIDAY`,
    `Sewa ${d.type.name} ${d.location.shortName} | VIDALIDAY`,
  ];
  return candidates.find((title) => title.length <= MAX_TITLE) ?? candidates[candidates.length - 1];
}

function trimTo(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}

export function landingMetaDescription(d: LandingData): string {
  const place = d.location.area ? `${d.location.shortName} ${d.location.area}, Makassar` : `${d.location.shortName} Makassar`;
  if (d.allFull) {
    return trimTo(
      `Unit ${d.type.name} di ${place} sedang penuh. Lihat harga, fasilitas, dan tanya jadwal kosong ke admin via WhatsApp.`,
      MAX_DESCRIPTION,
    );
  }
  const available = d.type.availableCount;
  const parts = [`${available} unit ${d.type.name} di ${place}`];
  if (d.priceFrom) parts.push(`mulai ${formatRupiah(d.priceFrom)}/malam`);
  if (d.capacityMax) parts.push(`maks. ${d.capacityMax} tamu`);
  return trimTo(`${parts.join(", ")}. Sewa harian, mingguan, bulanan, pesan via WhatsApp.`, MAX_DESCRIPTION);
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}`;
}

/** Dua paragraf pembuka dari fakta yang ada (tanpa mengarang). */
export function landingIntro(d: LandingData, s: LandingSettings): string[] {
  const area = d.location.area ? `${d.location.area}, Makassar` : "Makassar";
  const first: string[] = [
    `VIDALIDAY menyewakan ${d.units.length} unit ${d.type.name} di ${d.location.name} (${area}) secara harian, mingguan, dan bulanan.`,
  ];
  const facts: string[] = [];
  if (d.priceFrom) facts.push(`Harga mulai ${formatRupiah(d.priceFrom)}/malam`);
  if (d.capacityMax) facts.push(`untuk maksimal ${d.capacityMax} tamu`);
  if (d.sizeRange) facts.push(d.sizeRange.min === d.sizeRange.max ? `luas ${d.sizeRange.min} m²` : `luas ${d.sizeRange.min}–${d.sizeRange.max} m²`);
  if (d.towers.length) facts.push(`di Tower ${joinNames(d.towers)}`);
  if (d.floorRange) facts.push(d.floorRange.min === d.floorRange.max ? `lantai ${d.floorRange.min}` : `lantai ${d.floorRange.min}–${d.floorRange.max}`);
  if (d.views.length) facts.push(`dengan view ${joinNames(d.views)}`);
  if (facts.length) first.push(`${facts.join(", ")}.`);
  if (d.allFull) first.push("Saat ini semua unit tipe ini sedang penuh; admin bisa memberi tahu jadwal kosong berikutnya.");

  const second: string[] = [];
  const legal = s.companyLegalName ? toDisplayLegalName(s.companyLegalName) : "";
  const amenities = d.commonAmenities.slice(0, 3).map((amenity) => amenity.name);
  second.push(
    `Semua unit dikelola resmi${legal ? ` oleh ${legal}` : ""}${amenities.length ? `: ${joinNames(amenities)} sudah termasuk` : ""}.`,
  );
  if (s.checkinTime || s.checkoutTime) second.push(`Check-in ${s.checkinTime || "sesuai konfirmasi"}, check-out ${s.checkoutTime || "sesuai konfirmasi"}.`);
  second.push(`Pesan lewat WhatsApp admin${s.officeHours ? `, dilayani ${s.officeHours}` : ""}.`);
  return [first.join(" "), second.join(" ")];
}

export type SummaryRow = { label: string; value: string };

export function landingSummary(d: LandingData, s: LandingSettings): SummaryRow[] {
  const rows: SummaryRow[] = [
    { label: "Tipe kamar", value: `${d.type.name} di ${d.location.shortName}` },
    { label: "Unit tersedia", value: `${d.type.availableCount} dari ${d.units.length} unit` },
  ];
  if (d.priceFrom) {
    rows.push({
      label: "Harga per malam",
      value: d.priceTo && d.priceTo !== d.priceFrom ? `${formatRupiah(d.priceFrom)} – ${formatRupiah(d.priceTo)}` : `mulai ${formatRupiah(d.priceFrom)}`,
    });
  }
  if (d.weeklyFrom) rows.push({ label: "Harga mingguan", value: `mulai ${formatRupiah(d.weeklyFrom)}` });
  if (d.monthlyFrom) rows.push({ label: "Harga bulanan", value: `mulai ${formatRupiah(d.monthlyFrom)}` });
  if (d.capacityMax) rows.push({ label: "Kapasitas", value: `sampai ${d.capacityMax} tamu` });
  if (d.sizeRange) rows.push({ label: "Luas", value: d.sizeRange.min === d.sizeRange.max ? `${d.sizeRange.min} m²` : `${d.sizeRange.min}–${d.sizeRange.max} m²` });
  if (d.towers.length) rows.push({ label: "Tower", value: joinNames(d.towers) });
  if (d.floorRange) rows.push({ label: "Lantai", value: d.floorRange.min === d.floorRange.max ? `${d.floorRange.min}` : `${d.floorRange.min}–${d.floorRange.max}` });
  if (d.views.length) rows.push({ label: "View", value: joinNames(d.views) });
  if (s.checkinTime || s.checkoutTime) rows.push({ label: "Check-in / check-out", value: `${s.checkinTime || "-"} / ${s.checkoutTime || "-"}` });
  if (d.location.address) rows.push({ label: "Alamat", value: d.location.address });
  return rows;
}

/** FAQ yang dibentuk dari data (id negatif supaya tidak bentrok dengan FAQ DB); hanya kalau datanya ada. */
export function landingFaqs(d: LandingData, s: LandingSettings, landmarks: Landmark[]): Faq[] {
  const faqs: Faq[] = [];
  const type = d.type.name;
  const apt = d.location.shortName;
  if (d.priceFrom) {
    faqs.push({
      id: -1,
      question: `Berapa harga sewa ${type} di ${apt} per malam?`,
      answer: `Harga ${type} di ${apt} mulai ${formatRupiah(d.priceFrom)} per malam${d.priceTo && d.priceTo !== d.priceFrom ? ` sampai ${formatRupiah(d.priceTo)}` : ""}, sudah termasuk fasilitas unit. Harga final dikonfirmasi admin lewat WhatsApp.`,
      sortOrder: 1,
    });
  }
  if (d.capacityMax) {
    faqs.push({
      id: -2,
      question: `Berapa tamu maksimal di ${type} ${apt}?`,
      answer: `${type} di ${apt} bisa untuk sampai ${d.capacityMax} tamu, tergantung unitnya. Kapasitas tiap unit tertulis di halaman unit.`,
      sortOrder: 2,
    });
  }
  const long: string[] = [];
  if (d.weeklyFrom) long.push(`tarif mingguan mulai ${formatRupiah(d.weeklyFrom)} berlaku untuk 7 malam atau lebih`);
  if (d.monthlyFrom) long.push(`tarif bulanan mulai ${formatRupiah(d.monthlyFrom)} berlaku untuk 30 malam atau lebih`);
  faqs.push({
    id: -3,
    question: `Apakah ${type} di ${apt} bisa disewa mingguan atau bulanan?`,
    answer: long.length
      ? `Bisa. ${long.join(", ")[0].toUpperCase()}${long.join(", ").slice(1)}. Di luar itu berlaku harga per malam.`
      : `Bisa. Sewa mingguan dan bulanan ${type} di ${apt} diatur langsung dengan admin lewat WhatsApp; harga per malam berlaku untuk sewa harian.`,
    sortOrder: 3,
  });
  if (s.checkinTime || s.checkoutTime) {
    faqs.push({
      id: -4,
      question: `Jam berapa check-in dan check-out di ${apt}?`,
      answer: `Check-in mulai ${s.checkinTime || "sesuai konfirmasi admin"} dan check-out sampai ${s.checkoutTime || "sesuai konfirmasi admin"}. Early check-in atau late check-out bisa ditanyakan ke admin.`,
      sortOrder: 4,
    });
  }
  if (d.location.address) {
    const nearby = landmarks.slice(0, 3).map((landmark) => `${landmark.name} (${landmark.distanceTime})`);
    faqs.push({
      id: -5,
      question: `Di mana lokasi ${apt}?`,
      answer: `${d.location.name} berada di ${d.location.address}${d.location.area ? `, kawasan ${d.location.area}` : ""}, Makassar${nearby.length ? `. Dekat dengan ${joinNames(nearby)}` : ""}.`,
      sortOrder: 5,
    });
  }
  faqs.push({
    id: -6,
    question: `Bagaimana cara pesan ${type} di ${apt}?`,
    answer: `Pilih unit ${type} di halaman ini, tekan Sewa sekarang, isi nama, kota asal, nomor WhatsApp, tanggal, dan jumlah tamu, lalu kirim lewat WhatsApp. Admin mengonfirmasi ketersediaan dan pembayaran.`,
    sortOrder: 6,
  });
  return faqs;
}

export function landingCtaHref(d: LandingData): string {
  return sewaHref({ lokasi: d.location.slug, tipe: d.type.slug, penuh: d.allFull });
}

export function landingPath(d: Pick<LandingData, "location" | "type">): string {
  return roomTypeHref(d.location.slug, d.type.slug);
}

/** Label singkat unit untuk daftar/llms: "Studio AT 26X (Tower Ashton lt. 26)". */
export function unitSpotLabel(unit: CatalogUnit): string {
  const spot = formatUnitSpot(unit);
  return spot ? `${unit.name} (${spot})` : unit.name;
}

export function priceFromShort(d: LandingData): string | null {
  return d.priceFrom ? formatRupiahShort(d.priceFrom) : null;
}
