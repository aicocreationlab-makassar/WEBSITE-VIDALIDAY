// Model form halaman About admin (PRD 7.9, 6.8). Fungsi murni, ada unit test.
// Dipakai halaman server, form klien, dan Server Action `saveAbout`.

import { adminIssueMessage } from "@/components/admin/settings/settings-model";
import { ICON_CHOICES, resolveIconName, type IconChoice, type IconName } from "@/lib/icons";
import type { AboutInput } from "@/lib/validation/admin";
import type { SiteSettings } from "@/types/settings";

export const MAX_REASONS = 12;

/** Ikon cadangan untuk alasan lama yang ikonnya tidak dikenal (sama dengan mapSettings). */
export const REASON_FALLBACK_ICON: IconName = "shield-check";

/** Ikon untuk alasan baru. */
export const NEW_REASON_ICON: IconName = "sparkles";

/** Batas karakter (sama dengan aboutSchema). */
export const ABOUT_MAX = {
  tagline: 120,
  heroTitle: 160,
  introP1: 1500,
  introP2: 1500,
  introP3: 1500,
  commitTitle: 80,
  commitText: 1500,
  closingQuote: 200,
  closingCta: 250,
  reasonTitle: 80,
  reasonDesc: 240,
} as const;

export type AboutReasonValues = { title: string; desc: string; icon: string };

export type AboutFormValues = {
  tagline: string;
  heroTitle: string;
  introP1: string;
  introP2: string;
  introP3: string;
  commitTitle: string;
  commitText: string;
  closingQuote: string;
  closingCta: string;
  reasons: AboutReasonValues[];
};

/**
 * Ikon alasan: ikon yang dipakai alasan bawaan/situs lama (rumah, harga, privasi, chat) lebih dulu,
 * lalu daftar ikon fasilitas. Tanpa duplikat.
 */
const REASON_ICONS: IconChoice[] = [
  { name: "shield-check", label: "Terpercaya / aman", keywords: "legal resmi keamanan badan hukum" },
  { name: "sparkles", label: "Bersih / istimewa", keywords: "kebersihan nyaman" },
  { name: "house", label: "Rumah / fasilitas", keywords: "home nyaman lengkap" },
  { name: "tag", label: "Harga / promo", keywords: "murah hemat bersaing" },
  { name: "lock", label: "Privasi", keywords: "aman kunci" },
  { name: "message-circle", label: "Chat / WhatsApp", keywords: "pesan hubungi admin mudah" },
  { name: "badge-percent", label: "Diskon", keywords: "promo hemat" },
  { name: "clock", label: "Jam layanan", keywords: "cepat waktu respons" },
  { name: "map-pin", label: "Lokasi strategis", keywords: "tempat dekat" },
  { name: "building-2", label: "Gedung / apartemen", keywords: "tower" },
];

export const ABOUT_ICON_CHOICES: IconChoice[] = [
  ...REASON_ICONS,
  ...ICON_CHOICES.filter((choice) => !REASON_ICONS.some((reason) => reason.name === choice.name)),
];

/** Nama ikon dari DB (bisa nama lama: shield, home, chat) → nama registry. */
export function reasonIcon(name: string | null | undefined): IconName {
  return resolveIconName(name, REASON_FALLBACK_ICON);
}

/** Setting tersimpan → nilai form. Ikon lama di-resolve supaya pemilih ikon dan simpan memakai nama yang benar. */
export function toAboutFormValues(about: SiteSettings["about"]): AboutFormValues {
  return {
    tagline: about.tagline,
    heroTitle: about.heroTitle,
    introP1: about.introP1,
    introP2: about.introP2,
    introP3: about.introP3,
    commitTitle: about.commitTitle,
    commitText: about.commitText,
    closingQuote: about.closingQuote,
    closingCta: about.closingCta,
    reasons: about.reasons.map((reason) => ({ title: reason.title, desc: reason.desc, icon: reasonIcon(reason.icon) })),
  };
}

export function newReason(): AboutReasonValues {
  return { title: "", desc: "", icon: NEW_REASON_ICON };
}

// ---------------------------------------------------------------------------
// Bagian form
// ---------------------------------------------------------------------------

export type AboutSectionId = "pembuka" | "cerita" | "alasan" | "penutup";

export const ABOUT_SECTIONS: { id: AboutSectionId; title: string; fields: (keyof AboutInput)[] }[] = [
  { id: "pembuka", title: "Pembuka", fields: ["tagline", "heroTitle"] },
  { id: "cerita", title: "Cerita", fields: ["introP1", "introP2", "introP3"] },
  { id: "alasan", title: "Alasan memilih", fields: ["reasons"] },
  { id: "penutup", title: "Komitmen & penutup", fields: ["commitTitle", "commitText", "closingQuote", "closingCta"] },
];

const TOP_FIELDS = new Set<string>(ABOUT_SECTIONS.flatMap((section) => section.fields));

/** Path error dari server yang boleh dipasang ke form (mis. "introP1", "reasons.2.title"). */
export function isAboutFieldPath(path: string): boolean {
  return TOP_FIELDS.has(path) || /^reasons\.\d{1,2}\.(title|desc|icon)$/.test(path);
}

// ---------------------------------------------------------------------------
// Pesan error zod
// ---------------------------------------------------------------------------

const MIN_MESSAGES: Partial<Record<string, string>> = {
  tagline: "Tagline minimal 2 karakter.",
  heroTitle: "Judul halaman minimal 5 karakter.",
  commitTitle: "Judul komitmen minimal 2 karakter.",
  commitText: "Teks komitmen minimal 10 karakter.",
};

/**
 * Pesan Bahasa Indonesia untuk issue aboutSchema yang tidak punya pesan sendiri
 * (pesan di skema selalu menang). Dipakai di zodResolver dan di server.
 */
export function aboutIssueMessage(issue: { code?: string; path?: PropertyKey[] }): string {
  const field = typeof issue.path?.[0] === "string" ? issue.path[0] : "";
  if (issue.code === "too_small" && MIN_MESSAGES[field]) return MIN_MESSAGES[field];
  return adminIssueMessage(issue);
}
