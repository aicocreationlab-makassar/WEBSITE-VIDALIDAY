// Penanda "Perlu dicek" untuk pembersihan data setelah migrasi (PRD 8, SETUP 7C). Fungsi murni.

import { isStockPhoto } from "@/lib/media";
import type { HealthFlag } from "./unit-query";

export const HEALTH_LABELS: Record<HealthFlag, string> = {
  "tanpa-tower-lantai": "Tower atau lantai kosong",
  "tamu-janggal": "Kapasitas tamu janggal untuk tipenya",
  "label-promo-lama": "Label promo berisi persen lama",
  "tanpa-foto": "Belum ada foto asli",
  "harga-promo-janggal": "Harga promo tidak lebih murah",
  "periode-bukan-harian": "Periode sewa lama bukan per malam",
  "tanpa-tipe": "Belum punya tipe kamar",
};

type HealthInput = {
  tower: string | null;
  /** Apartemen punya beberapa tower (bawaan true); satu gedung → tower tidak dituntut. */
  has_towers?: boolean;
  floor_number: number | null;
  max_guests: number;
  promo_badge: string | null;
  is_promo_active: boolean;
  promo_price: number;
  normal_price: number;
  main_image: string | null;
  gallery_images: unknown;
  rental_period: string | null;
  room_type_id: number | null;
};

const NIGHTLY = /^(harian|malam|per\s*malam|hari|night)$/i;

export function healthFlags(unit: HealthInput, typeDefaultGuests: number | null): HealthFlag[] {
  const flags: HealthFlag[] = [];
  if (!unit.room_type_id) flags.push("tanpa-tipe");
  const needsTower = unit.has_towers !== false && !unit.tower?.trim();
  if (needsTower || unit.floor_number == null) flags.push("tanpa-tower-lantai");
  if (typeDefaultGuests && unit.max_guests < typeDefaultGuests - 2) flags.push("tamu-janggal");
  if (unit.promo_badge && /\d+\s*%/.test(unit.promo_badge)) flags.push("label-promo-lama");
  const gallery = Array.isArray(unit.gallery_images) ? unit.gallery_images : [];
  const hasRealPhoto = [unit.main_image, ...gallery].some(
    (value) => typeof value === "string" && value.trim() && !isStockPhoto(value),
  );
  if (!hasRealPhoto) flags.push("tanpa-foto");
  if (unit.is_promo_active && unit.promo_price > 0 && unit.promo_price >= unit.normal_price) {
    flags.push("harga-promo-janggal");
  }
  if (unit.rental_period && !NIGHTLY.test(unit.rental_period.trim())) flags.push("periode-bukan-harian");
  return flags;
}
