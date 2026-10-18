/** Alasan memilih VIDALIDAY di halaman About (setting `about_reasons`, JSON). */
export type AboutReason = {
  title: string;
  desc: string;
  /** Nama ikon lucide kebab-case; di-resolve lewat lib/icons.tsx. */
  icon: string;
};

/** Semua setting situs dalam satu objek bertipe. Kunci DB snake_case → camelCase. */
export type SiteSettings = {
  // Kontak
  whatsappNumber: string;
  contactPhone: string;
  contactEmail: string;
  officeHours: string;
  // Beranda
  heroTitle: string;
  heroSubtitle: string;
  /** Path di bucket `media` atau URL penuh; null = pakai foto gedung bawaan. */
  heroImage: string | null;
  promoBannerText: string;
  // Pemesanan
  bookingWhatsappTemplate: string;
  checkinTime: string;
  checkoutTime: string;
  checkinRequirements: string;
  /** Satu peraturan per baris. */
  houseRules: string;
  // Brand
  /** Path di bucket `media` atau URL penuh; null = logo bawaan. */
  siteLogo: string | null;
  companyLegalName: string;
  // SEO
  seoTitle: string;
  seoDescription: string;
  // Profil resmi (sameAs di data terstruktur); kosong = tidak dipakai
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  googleBusinessUrl: string;
  // Halaman About
  about: {
    tagline: string;
    heroTitle: string;
    introP1: string;
    introP2: string;
    introP3: string;
    commitTitle: string;
    commitText: string;
    closingQuote: string;
    closingCta: string;
    reasons: AboutReason[];
  };
};

/** Peta kunci DB → field SiteSettings (kunci `about_*` ditangani terpisah). */
export const SETTING_KEYS = {
  whatsapp_number: "whatsappNumber",
  contact_phone: "contactPhone",
  contact_email: "contactEmail",
  office_hours: "officeHours",
  hero_title: "heroTitle",
  hero_subtitle: "heroSubtitle",
  hero_image: "heroImage",
  promo_banner_text: "promoBannerText",
  booking_whatsapp_template: "bookingWhatsappTemplate",
  checkin_time: "checkinTime",
  checkout_time: "checkoutTime",
  checkin_requirements: "checkinRequirements",
  house_rules: "houseRules",
  site_logo: "siteLogo",
  company_legal_name: "companyLegalName",
  seo_title: "seoTitle",
  seo_description: "seoDescription",
  instagram_url: "instagramUrl",
  facebook_url: "facebookUrl",
  tiktok_url: "tiktokUrl",
  google_business_url: "googleBusinessUrl",
} as const satisfies Record<string, keyof Omit<SiteSettings, "about">>;

export const ABOUT_KEYS = {
  about_tagline: "tagline",
  about_hero_title: "heroTitle",
  about_intro_p1: "introP1",
  about_intro_p2: "introP2",
  about_intro_p3: "introP3",
  about_commit_title: "commitTitle",
  about_commit_text: "commitText",
  about_closing_quote: "closingQuote",
  about_closing_cta: "closingCta",
} as const satisfies Record<string, keyof Omit<SiteSettings["about"], "reasons">>;
