// Model form Pengaturan admin (PRD 7.9, 6.5). Fungsi murni (tanpa React/jaringan), ada unit test.
// Dipakai halaman server, form klien, dan Server Action `saveSettings`.

import type { z } from "zod";
import { normalizeSearch } from "@/lib/admin/unit-query";
import { formatOfficeHours, formatWhatsappDisplay, toDisplayLegalName } from "@/lib/format";
import { isBucketPath, isExternalUrl, normalizeStoragePath } from "@/lib/media";
import { settingsSchema, type SettingsInput } from "@/lib/validation/admin";
import { BOOKING_PLACEHOLDERS, fillTemplate, type BookingPlaceholder, type TemplateValues } from "@/lib/whatsapp";
import { SETTING_KEYS, type SiteSettings } from "@/types/settings";

export type SettingsField = keyof SettingsInput;
/** Hasil parse settingsSchema (nomor WhatsApp sudah 628…). */
export type SettingsData = z.output<typeof settingsSchema>;

/** Nilai form: setiap field terisi (tanpa undefined). */
export type SettingsFormValues = { [K in SettingsField]-?: Exclude<SettingsInput[K], undefined> };

/** Semua field form, urut seperti kunci DB (SETTING_KEYS). */
export const SETTINGS_FIELDS: readonly SettingsField[] = Object.values(SETTING_KEYS);

export function isSettingsField(value: unknown): value is SettingsField {
  return typeof value === "string" && (SETTINGS_FIELDS as readonly string[]).includes(value);
}

/** Label field (juga dipakai untuk pencarian pengaturan). */
export const SETTINGS_LABELS: Record<SettingsField, string> = {
  whatsappNumber: "Nomor WhatsApp",
  contactPhone: "Telepon yang ditampilkan",
  contactEmail: "Email kontak",
  officeHours: "Jam layanan",
  heroTitle: "Judul hero",
  heroSubtitle: "Subjudul hero",
  heroImage: "Foto hero",
  promoBannerText: "Teks pengumuman",
  bookingWhatsappTemplate: "Template pesan WhatsApp",
  checkinTime: "Jam check-in",
  checkoutTime: "Jam check-out",
  checkinRequirements: "Syarat check-in",
  houseRules: "Peraturan menginap",
  siteLogo: "Logo",
  companyLegalName: "Nama badan hukum",
  seoTitle: "Judul SEO",
  seoDescription: "Deskripsi SEO",
  instagramUrl: "Instagram",
  facebookUrl: "Facebook",
  tiktokUrl: "TikTok",
  googleBusinessUrl: "Google Business Profile",
};

/** Batas karakter (sama dengan settingsSchema) untuk maxLength dan penghitung. */
export const SETTINGS_MAX = {
  contactPhone: 50,
  contactEmail: 100,
  officeHours: 100,
  heroTitle: 90,
  heroSubtitle: 200,
  promoBannerText: 140,
  bookingWhatsappTemplate: 2000,
  checkinTime: 40,
  checkoutTime: 40,
  checkinRequirements: 300,
  houseRules: 3000,
  companyLegalName: 120,
  seoTitle: 70,
  seoDescription: 170,
  instagramUrl: 200,
  facebookUrl: 200,
  tiktokUrl: 200,
  googleBusinessUrl: 300,
} as const satisfies Partial<Record<SettingsField, number>>;

/** Batas lunak SEO: lebih dari ini bisa terpotong di hasil Google. */
export const SEO_TITLE_SOFT = 60;
export const SEO_DESCRIPTION_SOFT = 155;

// ---------------------------------------------------------------------------
// Nilai awal
// ---------------------------------------------------------------------------

/** Setting tersimpan → nilai form. Nomor WhatsApp ditampilkan seperti nomor HP (0857-…). */
export function toSettingsFormValues(settings: SiteSettings): SettingsFormValues {
  return {
    whatsappNumber: formatWhatsappDisplay(settings.whatsappNumber),
    contactPhone: settings.contactPhone,
    contactEmail: settings.contactEmail,
    officeHours: settings.officeHours,
    heroTitle: settings.heroTitle,
    heroSubtitle: settings.heroSubtitle,
    heroImage: settings.heroImage,
    promoBannerText: settings.promoBannerText,
    bookingWhatsappTemplate: settings.bookingWhatsappTemplate,
    checkinTime: settings.checkinTime,
    checkoutTime: settings.checkoutTime,
    checkinRequirements: settings.checkinRequirements,
    houseRules: settings.houseRules,
    siteLogo: settings.siteLogo,
    companyLegalName: settings.companyLegalName,
    seoTitle: settings.seoTitle,
    seoDescription: settings.seoDescription,
    instagramUrl: settings.instagramUrl,
    facebookUrl: settings.facebookUrl,
    tiktokUrl: settings.tiktokUrl,
    googleBusinessUrl: settings.googleBusinessUrl,
  };
}

/** Field yang kosong di DB berarti "sengaja kosong" (gambar = bawaan, pengumuman = disembunyikan). */
const EMPTY_IS_MEANINGFUL = new Set<SettingsField>(["heroImage", "siteLogo", "promoBannerText"]);

/** Field yang saat ini memakai nilai bawaan aplikasi (baris belum ada atau kosong). */
export function fieldsUsingDefault(filledKeys: Iterable<string>): SettingsField[] {
  const filled = new Set(filledKeys);
  return Object.entries(SETTING_KEYS)
    .filter(([key, field]) => !filled.has(key) && !EMPTY_IS_MEANINGFUL.has(field))
    .map(([, field]) => field);
}

// ---------------------------------------------------------------------------
// Bagian form, pencarian, status
// ---------------------------------------------------------------------------

export type SettingsSectionId = "kontak" | "beranda" | "pemesanan" | "brand" | "seo" | "sosial";

export type SettingsSection = {
  id: SettingsSectionId;
  title: string;
  description: string;
  fields: SettingsField[];
  /** Kata kunci tambahan untuk pencarian. */
  keywords: string;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "kontak",
    title: "Kontak",
    description: "Nomor WhatsApp tujuan semua tombol, telepon, email, dan jam layanan.",
    fields: ["whatsappNumber", "contactPhone", "contactEmail", "officeHours"],
    keywords: "wa hp nomor telepon email jam layanan operasional kontak footer",
  },
  {
    id: "beranda",
    title: "Beranda",
    description: "Teks dan foto di bagian atas beranda, serta pengumuman di atas header.",
    fields: ["heroTitle", "heroSubtitle", "heroImage", "promoBannerText"],
    keywords: "hero judul subjudul foto gambar latar gedung pengumuman banner promo",
  },
  {
    id: "pemesanan",
    title: "Pemesanan",
    description: "Pesan WhatsApp dari form sewa, jam check-in/check-out, dan peraturan menginap.",
    fields: ["bookingWhatsappTemplate", "checkinTime", "checkoutTime", "checkinRequirements", "houseRules"],
    keywords: "template pesan whatsapp wa form sewa booking checkin checkout jam syarat ktp identitas peraturan aturan",
  },
  {
    id: "brand",
    title: "Brand",
    description: "Logo dan nama perusahaan di header, footer, dan halaman About.",
    fields: ["siteLogo", "companyLegalName"],
    keywords: "logo nama pt perusahaan badan hukum legalitas",
  },
  {
    id: "seo",
    title: "SEO",
    description: "Judul dan deskripsi bawaan untuk Google dan saat link situs dibagikan.",
    fields: ["seoTitle", "seoDescription"],
    keywords: "google pencarian meta judul deskripsi share bagikan",
  },
  {
    id: "sosial",
    title: "Media sosial dan Google",
    description: "Tautan profil resmi; dipakai untuk data terstruktur (sameAs) supaya Google dan AI mengenali VIDALIDAY.",
    fields: ["instagramUrl", "facebookUrl", "tiktokUrl", "googleBusinessUrl"],
    keywords: "instagram facebook tiktok google business profile maps sosial media sameas tautan link",
  },
];

/** Bagian yang cocok dengan pencarian (setiap kata harus ada di judul, deskripsi, label, atau kata kunci). */
export function matchSettingsSections(query: string, sections: SettingsSection[] = SETTINGS_SECTIONS): SettingsSectionId[] {
  const tokens = query.split(/\s+/).map(normalizeSearch).filter(Boolean);
  if (!tokens.length) return sections.map((section) => section.id);
  return sections
    .filter((section) => {
      // Dinormalkan per kata (tetap dipisah spasi) supaya kata tidak cocok lintas batas kata.
      const haystack = [section.title, section.description, section.keywords, ...section.fields.map((f) => SETTINGS_LABELS[f])]
        .join(" ")
        .split(/\s+/)
        .map(normalizeSearch)
        .join(" ");
      return tokens.every((token) => haystack.includes(token));
    })
    .map((section) => section.id);
}

export type SectionStatus = "error" | "dirty" | null;

/** Status bagian untuk navigasi: ada error > ada perubahan > tidak ada. */
export function sectionStatus(
  fields: readonly string[],
  errorFields: Iterable<string>,
  dirtyFields: Iterable<string>,
): SectionStatus {
  const errors = new Set(errorFields);
  if (fields.some((field) => errors.has(field))) return "error";
  const dirty = new Set(dirtyFields);
  return fields.some((field) => dirty.has(field)) ? "dirty" : null;
}

/** Kunci objek yang bernilai truthy (errors react-hook-form). */
export function truthyKeys(record: object | undefined | null): string[] {
  if (!record) return [];
  return Object.entries(record)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
}

function containsTrue(value: unknown): boolean {
  if (value === true) return true;
  if (Array.isArray(value)) return value.some(containsTrue);
  if (value && typeof value === "object") return Object.values(value).some(containsTrue);
  return false;
}

/**
 * Kunci dirtyFields react-hook-form yang benar-benar berubah. Field array berbentuk
 * `[undefined, { title: true }]` atau `[]` (sudah dikembalikan), jadi diperiksa sampai dalam.
 */
export function dirtyKeys(record: object | undefined | null): string[] {
  if (!record) return [];
  return Object.entries(record)
    .filter(([, value]) => containsTrue(value))
    .map(([key]) => key);
}

// ---------------------------------------------------------------------------
// Simpan: hanya field yang berubah
// ---------------------------------------------------------------------------

/**
 * Daftar field yang dikirim form (yang berubah). Bukan array → semua field (aman: simpan semuanya).
 * Nama yang tidak dikenal dibuang. Array kosong → tidak ada yang ditulis.
 */
export function parseChangedFields(value: unknown): SettingsField[] {
  if (!Array.isArray(value)) return [...SETTINGS_FIELDS];
  return SETTINGS_FIELDS.filter((field) => value.includes(field));
}

/** Ambil sebagian field saja. */
export function pickFields<T extends object, K extends keyof T>(values: T, fields: readonly K[]): Partial<T> {
  const out: Partial<T> = {};
  for (const field of fields) out[field] = values[field];
  return out;
}

// ---------------------------------------------------------------------------
// Foto (hero, logo) di folder settings/
// ---------------------------------------------------------------------------

const SETTINGS_UPLOAD = /^settings\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i;

/** Hasil unggahan baru dari browser (`settings/<uuid>.webp`, lib/upload/upload.ts). */
export function isSettingsUploadPath(value: string | null | undefined): value is string {
  return typeof value === "string" && SETTINGS_UPLOAD.test(value.trim());
}

/** Nilai foto sama (persis, atau path bucket yang sama setelah dinormalkan). */
export function sameImage(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = a?.trim() || null;
  const right = b?.trim() || null;
  if (left === right) return true;
  if (!left || !right) return false;
  return isBucketPath(left) && isBucketPath(right) && normalizeStoragePath(left) === normalizeStoragePath(right);
}

/**
 * Foto yang boleh disimpan: kosong (pakai bawaan), nilai lama yang tidak berubah, atau unggahan baru
 * `settings/<uuid>.webp` (hasil pengunggah). URL luar baru dan file lain di bucket ditolak, supaya
 * file milik unit/apartemen tidak bisa dipasang lalu ikut terhapus saat foto diganti.
 */
export function isAcceptableSettingsImage(next: string | null | undefined, current: string | null | undefined): boolean {
  const value = next?.trim() || null;
  if (value === null || sameImage(value, current)) return true;
  if (isExternalUrl(value) || value.includes("..") || value.includes("\\")) return false;
  return isSettingsUploadPath(normalizeStoragePath(value));
}

/** Path file milik pengaturan yang boleh dihapus dari bucket (hanya folder settings/; URL luar diabaikan). */
export function ownedSettingsImage(value: string | null | undefined): string | null {
  if (!isBucketPath(value)) return null;
  const path = normalizeStoragePath(value);
  if (path.includes("..") || path.includes("\\")) return null;
  return /^settings\/[^/]+$/.test(path) ? path : null;
}

// ---------------------------------------------------------------------------
// Bantuan isian
// ---------------------------------------------------------------------------

/** Nomor WhatsApp sesuai aturan simpan (skema yang sama dengan server); null kalau belum valid. */
export function normalizedWhatsapp(raw: string | null | undefined): string | null {
  const parsed = settingsSchema.shape.whatsappNumber.safeParse(raw ?? "");
  return parsed.success ? parsed.data : null;
}

/** "Setiap Hari: 08.00 - 23.00 WITA" → saran "08.00–23.00 WITA"; null kalau sudah rapi. */
export function officeHoursSuggestion(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const tidy = formatOfficeHours(value);
  return tidy && tidy !== value ? tidy : null;
}

/** "PT PERDANA MEGA TRANS" → saran "PT Perdana Mega Trans"; null kalau sudah huruf campuran. */
export function legalNameSuggestion(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const tidy = toDisplayLegalName(value);
  return tidy !== value ? tidy : null;
}

/** Jumlah baris berisi (peraturan menginap: satu per baris). */
export function countFilledLines(text: string | null | undefined): number {
  return (text ?? "").split(/\r?\n/).filter((line) => line.trim()).length;
}

// ---------------------------------------------------------------------------
// Template pesan WhatsApp (PRD 6.5)
// ---------------------------------------------------------------------------

/** Data tamu contoh untuk pratinjau (fiktif). */
export const PREVIEW_VALUES: TemplateValues = {
  unit: "Studio AT 26X",
  apartemen: "Vida View",
  lokasi_unit: "Tower Ashton lt. 26",
  harga: "Rp280.000",
  nama: "Budi Santoso",
  kota: "Jakarta",
  whatsapp: "0812-3456-7890",
  checkin: "Sab, 17 Okt 2026",
  checkout: "Sen, 19 Okt 2026",
  malam: 2,
  tamu: 2,
  keperluan: "Liburan",
  catatan: "",
  estimasi: "Rp560.000",
  kode: "VDL-5A1EAE",
  link: "https://vidaliday.com/unit/studio-at-26x",
};

export const PREVIEW_NOTE = "Minta early check-in kalau bisa.";

/** Pesan contoh dari template (baris dengan isian kosong dihapus, sama dengan form sewa). */
export function previewMessage(template: string, withNote = false): string {
  return fillTemplate(template, { ...PREVIEW_VALUES, catatan: withNote ? PREVIEW_NOTE : "" });
}

const KNOWN_PLACEHOLDERS = new Set<string>(BOOKING_PLACEHOLDERS.map((p) => p.key));
/** Isian yang sebaiknya selalu ada supaya admin tahu unit dan tanggal yang diminta. */
export const ESSENTIAL_PLACEHOLDERS: BookingPlaceholder[] = ["unit", "checkin", "checkout"];

export type TemplateCheck = {
  /** Isian dalam kurung kurawal yang tidak dikenal (tampil apa adanya di pesan). */
  unknown: string[];
  /** Isian penting yang belum dipakai. */
  missing: BookingPlaceholder[];
  /** Isian dikenal yang sudah dipakai. */
  used: BookingPlaceholder[];
};

export function checkTemplate(template: string): TemplateCheck {
  const found = [...template.matchAll(/\{([^{}\s]{1,40})\}/g)].map((match) => match[1]);
  const unknown = [...new Set(found.filter((key) => !KNOWN_PLACEHOLDERS.has(key)))].map((key) => `{${key}}`);
  const used = BOOKING_PLACEHOLDERS.map((p) => p.key).filter((key) => found.includes(key));
  const missing = ESSENTIAL_PLACEHOLDERS.filter((key) => !used.includes(key));
  return { unknown, missing, used };
}

/** Sisipkan teks di posisi kursor (menggantikan teks terpilih). Posisi di luar batas dijepit. */
export function insertToken(value: string, start: number, end: number, token: string): { value: string; caret: number } {
  const from = Math.max(0, Math.min(Number.isFinite(start) ? start : value.length, value.length));
  const to = Math.max(from, Math.min(Number.isFinite(end) ? end : from, value.length));
  return { value: value.slice(0, from) + token + value.slice(to), caret: from + token.length };
}

// ---------------------------------------------------------------------------
// Pesan error zod
// ---------------------------------------------------------------------------

/**
 * Pesan cadangan untuk issue zod yang tidak punya pesan sendiri di skema (pesan skema selalu menang).
 * Dipakai sebagai `error` per-parse di klien (zodResolver) dan server.
 */
export function adminIssueMessage(issue: { code?: string }): string {
  if (issue.code === "too_small") return "Isian terlalu pendek.";
  if (issue.code === "too_big") return "Isian terlalu panjang.";
  return "Isian belum benar.";
}
