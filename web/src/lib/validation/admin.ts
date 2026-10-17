// Skema zod form admin (PRD 7.4–7.9), dipakai di klien (react-hook-form) dan di server (Server Action).

import { z } from "zod";
import "./locale";
import { SLUG_PATTERN } from "@/lib/slug";
import { youtubeId } from "@/lib/youtube";

const text = (max: number, message = `Maksimal ${max} karakter.`) => z.string().trim().max(max, message);
// nullish: hasil parse (null untuk kosong) harus lolos lagi saat Server Action mem-parse ulang data dari form.
const optionalText = (max: number) =>
  text(max)
    .nullish()
    .transform((value) => (value ? value : null));

const slug = z
  .string()
  .trim()
  .min(2, "Slug minimal 2 karakter.")
  .max(80, "Slug maksimal 80 karakter.")
  .regex(SLUG_PATTERN, "Slug hanya huruf kecil, angka, dan tanda hubung (mis. studio-at-26x).");

const money = z
  .number({ error: "Isi dengan angka." })
  .int("Isi tanpa desimal.")
  .min(0, "Tidak boleh negatif.")
  .max(1_000_000_000, "Angka terlalu besar.");
const optionalMoney = money.nullable().optional().transform((value) => (value ? value : null));
const sortOrder = z
  .number({ error: "Isi urutan dengan angka." })
  .int("Urutan harus bilangan bulat.")
  .min(0, "Urutan minimal 0.")
  .max(100_000, "Urutan terlalu besar.")
  .default(0);

// ---------------------------------------------------------------------------
// Unit (PRD 7.4)
// ---------------------------------------------------------------------------

export const PROMO_BADGE_MAX = 24;
export const UNIT_PHOTOS_MAX = 15;

export const unitSchema = z
  .object({
    locationId: z.number({ error: "Pilih apartemen." }).int().positive("Pilih apartemen."),
    roomTypeId: z.number({ error: "Pilih tipe kamar." }).int().positive("Pilih tipe kamar."),
    name: z.string().trim().min(2, "Nama unit minimal 2 karakter.").max(120, "Nama unit maksimal 120 karakter."),
    slug,
    tower: optionalText(40),
    floorNumber: z.number().int().min(0, "Lantai tidak valid.").max(200, "Lantai tidak valid.").nullable().optional().transform((v) => v ?? null),
    viewType: optionalText(60),
    sizeSqm: z.number().min(1, "Luas tidak valid.").max(2000, "Luas tidak valid.").nullable().optional().transform((v) => v ?? null),
    maxGuests: z.number({ error: "Isi kapasitas." }).int().min(1, "Kapasitas 1 sampai 30 tamu.").max(30, "Kapasitas 1 sampai 30 tamu."),
    normalPrice: money.min(1, "Isi harga normal per malam."),
    promoPrice: optionalMoney,
    isPromoActive: z.boolean(),
    promoBadge: optionalText(PROMO_BADGE_MAX),
    weeklyPrice: optionalMoney,
    monthlyPrice: optionalMoney,
    amenityIds: z.array(z.number().int().positive()).max(60).default([]),
    photos: z.array(z.string().trim().min(1).max(500, "Maksimal 500 karakter.")).max(UNIT_PHOTOS_MAX, `Maksimal ${UNIT_PHOTOS_MAX} foto.`).default([]),
    youtubeUrl: z
      .string()
      .trim()
      .max(500, "Maksimal 500 karakter.")
      .nullish()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || youtubeId(v) !== null, "Link YouTube belum benar. Contoh: https://youtu.be/abc123XYZ00"),
    description: optionalText(2000),
    isPublished: z.boolean(),
    isAvailable: z.boolean(),
    isFeatured: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.isPromoActive) {
      if (!value.promoPrice) {
        ctx.addIssue({ code: "custom", path: ["promoPrice"], message: "Isi harga promo atau matikan promo." });
      } else if (value.promoPrice >= value.normalPrice) {
        ctx.addIssue({ code: "custom", path: ["promoPrice"], message: "Harga promo harus lebih murah dari harga normal." });
      }
    }
  });

export type UnitInput = z.input<typeof unitSchema>;
export type UnitData = z.output<typeof unitSchema>;

/** Ubah harga cepat dari daftar unit (PRD 7.4). */
export const quickPriceSchema = z
  .object({
    id: z.number().int().positive(),
    normalPrice: money.min(1, "Isi harga normal per malam."),
    promoPrice: optionalMoney,
    isPromoActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.isPromoActive && (!value.promoPrice || value.promoPrice >= value.normalPrice)) {
      ctx.addIssue({
        code: "custom",
        path: ["promoPrice"],
        message: value.promoPrice ? "Harga promo harus lebih murah dari harga normal." : "Isi harga promo atau matikan promo.",
      });
    }
  });

export const BULK_ACTIONS = ["tersedia", "penuh", "promo-on", "promo-off", "tampil", "sembunyi", "ubah-tipe"] as const;

export const bulkSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, "Pilih minimal satu unit.").max(500, "Maksimal 500 unit sekaligus."),
  action: z.enum(BULK_ACTIONS),
  roomTypeId: z.number().int().positive().optional(),
});

// ---------------------------------------------------------------------------
// Apartemen & tipe kamar (PRD 7.5)
// ---------------------------------------------------------------------------

export const locationSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120, "Maksimal 120 karakter."),
  shortName: z.string().trim().min(2, "Nama singkat minimal 2 karakter.").max(16, "Nama singkat maksimal 16 karakter (label tab di hero)."),
  slug,
  area: optionalText(60),
  address: optionalText(300),
  gmapsUrl: z
    .string()
    .trim()
    .max(500, "Maksimal 500 karakter.")
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https?:\/\//i.test(v), "Link harus diawali https://"),
  latitude: z.number({ error: "Isi latitude dengan angka." }).min(-90, "Latitude -90 sampai 90.").max(90, "Latitude -90 sampai 90.").nullable().optional().transform((v) => v ?? null),
  longitude: z.number({ error: "Isi longitude dengan angka." }).min(-180, "Longitude -180 sampai 180.").max(180, "Longitude -180 sampai 180.").nullable().optional().transform((v) => v ?? null),
  tagline: optionalText(160),
  description: optionalText(2000),
  heroImage: z.string().trim().max(500).nullable().optional().transform((v) => v || null),
  sortOrder,
  isActive: z.boolean(),
  /** Gedung punya beberapa tower (bawaan true). false (mis. Delft CPI) → unitnya tanpa tower. */
  hasTowers: z.boolean().optional().default(true),
});

export type LocationInput = z.input<typeof locationSchema>;

export const ROOM_CATEGORY_VALUES = ["studio", "1br", "2br", "3br", "other"] as const;

export const roomTypeSchema = z.object({
  locationId: z.number().int().positive(),
  name: z.string().trim().min(2, "Nama tipe minimal 2 karakter.").max(60, "Maksimal 60 karakter."),
  slug,
  category: z.enum(ROOM_CATEGORY_VALUES),
  defaultMaxGuests: z.number({ error: "Isi kapasitas dengan angka." }).int("Kapasitas harus bilangan bulat.").min(1, "Kapasitas 1 sampai 30 tamu.").max(30, "Kapasitas 1 sampai 30 tamu.").nullable().optional().transform((v) => v ?? null),
  sortOrder,
  isActive: z.boolean(),
});

export type RoomTypeInput = z.input<typeof roomTypeSchema>;

// ---------------------------------------------------------------------------
// Fasilitas kamar, fasilitas gedung, landmark, FAQ (PRD 7.6–7.7)
// ---------------------------------------------------------------------------

const iconName = z.string().trim().min(1, "Pilih ikon.").max(40, "Maksimal 40 karakter.");

export const amenitySchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(60, "Maksimal 60 karakter."),
  icon: iconName,
  sortOrder,
  isActive: z.boolean(),
});

export const facilitySchema = z.object({
  locationId: z.number({ error: "Pilih apartemen." }).int().positive("Pilih apartemen."),
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120, "Maksimal 120 karakter."),
  description: optionalText(300),
  icon: iconName,
  image: z.string().trim().max(500).nullable().optional().transform((v) => v || null),
  sortOrder,
  isActive: z.boolean(),
});

export const landmarkSchema = z.object({
  locationId: z.number({ error: "Pilih apartemen." }).int().positive("Pilih apartemen."),
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120, "Maksimal 120 karakter."),
  distanceTime: z.string().trim().min(1, "Isi jarak atau waktu tempuh, mis. 5 menit.").max(100, "Maksimal 100 karakter."),
  notes: optionalText(255),
  icon: iconName,
  sortOrder,
  isActive: z.boolean(),
});

export const faqSchema = z.object({
  question: z.string().trim().min(5, "Pertanyaan minimal 5 karakter.").max(255, "Maksimal 255 karakter."),
  answer: z.string().trim().min(5, "Jawaban minimal 5 karakter.").max(2000, "Maksimal 2000 karakter."),
  sortOrder,
  isActive: z.boolean(),
});

/** Naik/turun urutan (PRD 7.7). */
export const reorderSchema = z.object({
  id: z.number().int().positive(),
  direction: z.enum(["up", "down"]),
});

// ---------------------------------------------------------------------------
// Permintaan sewa (PRD 7.8)
// ---------------------------------------------------------------------------

export const LEAD_STATUS_VALUES = ["baru", "dihubungi", "deal", "batal"] as const;

export const leadUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(LEAD_STATUS_VALUES).optional(),
  adminNotes: z.string().trim().max(1000, "Catatan maksimal 1000 karakter.").optional(),
});

/** Hapus permanen satu atau banyak permintaan sewa (maks. 100 sekaligus, satu halaman daftar). */
export const LEAD_DELETE_MAX = 100;
export const leadDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "Pilih minimal satu permintaan.").max(LEAD_DELETE_MAX),
});

// ---------------------------------------------------------------------------
// Pengaturan & About (PRD 7.9)
// ---------------------------------------------------------------------------

/** URL profil (https://...) atau kosong. */
function socialUrl(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Tautan harus diawali https://")
    .default("");
}

export const settingsSchema = z.object({
  whatsappNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, "").replace(/^0/, "62"))
    .refine((v) => /^628\d{7,11}$/.test(v), "Nomor WhatsApp belum benar. Contoh: 0857 1169 6970."),
  contactPhone: text(50).default(""),
  contactEmail: z.union([z.literal(""), z.email("Format email belum benar.")]).default(""),
  officeHours: text(100).default(""),
  heroTitle: z.string().trim().min(5, "Judul minimal 5 karakter.").max(90, "Judul maksimal 90 karakter."),
  heroSubtitle: text(200).default(""),
  heroImage: z.string().trim().max(500).nullable().optional().transform((v) => v || null),
  promoBannerText: text(140).default(""),
  bookingWhatsappTemplate: z.string().trim().min(20, "Template terlalu pendek.").max(2000, "Maksimal 2000 karakter."),
  checkinTime: text(40).default(""),
  checkoutTime: text(40).default(""),
  checkinRequirements: text(300).default(""),
  houseRules: text(3000).default(""),
  siteLogo: z.string().trim().max(500).nullable().optional().transform((v) => v || null),
  companyLegalName: z.string().trim().min(2, "Isi nama badan hukum.").max(120, "Maksimal 120 karakter."),
  seoTitle: z.string().trim().min(10, "Judul SEO minimal 10 karakter.").max(70, "Judul SEO maksimal 70 karakter."),
  seoDescription: z.string().trim().min(30, "Deskripsi SEO minimal 30 karakter.").max(170, "Deskripsi SEO maksimal 170 karakter."),
  // Tautan profil resmi untuk data terstruktur (sameAs); kosong = tidak dipakai.
  instagramUrl: socialUrl(200),
  facebookUrl: socialUrl(200),
  tiktokUrl: socialUrl(200),
  googleBusinessUrl: socialUrl(300),
});

export type SettingsInput = z.input<typeof settingsSchema>;

export const aboutSchema = z.object({
  tagline: z.string().trim().min(2).max(120, "Maksimal 120 karakter."),
  heroTitle: z.string().trim().min(5).max(160, "Maksimal 160 karakter."),
  introP1: z.string().trim().min(10, "Paragraf 1 wajib diisi.").max(1500, "Maksimal 1500 karakter."),
  introP2: text(1500).default(""),
  introP3: text(1500).default(""),
  commitTitle: z.string().trim().min(2).max(80, "Maksimal 80 karakter."),
  commitText: z.string().trim().min(10).max(1500, "Maksimal 1500 karakter."),
  closingQuote: text(200).default(""),
  closingCta: text(250).default(""),
  reasons: z
    .array(
      z.object({
        title: z.string().trim().min(2, "Judul alasan minimal 2 karakter.").max(80, "Maksimal 80 karakter."),
        desc: text(240).default(""),
        icon: iconName,
      }),
    )
    .max(12, "Maksimal 12 alasan.")
    .default([]),
});

export type AboutInput = z.input<typeof aboutSchema>;
