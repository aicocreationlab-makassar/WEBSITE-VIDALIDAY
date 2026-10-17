import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/whatsapp";
import type { SiteSettings } from "@/types/settings";

/**
 * Nilai bawaan kalau baris setting belum ada atau kosong di DB.
 * Sumber: migrasi 0002 dan default AboutController situs lama (disesuaikan ke sapaan "kamu").
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  contactPhone: "+62 857-1169-6970",
  contactEmail: "info@vidaliday.com",
  officeHours: "08.00–23.00 WITA",
  heroTitle: "Sewa apartemen harian di Makassar",
  heroSubtitle: "Unit resmi di Vida View dan Delft CPI. Bisa harian, mingguan, atau bulanan.",
  heroImage: null,
  promoBannerText: "",
  bookingWhatsappTemplate: `Halo Admin VIDALIDAY, saya mau sewa unit ini:

Unit: {unit}
Apartemen: {apartemen}
Lokasi unit: {lokasi_unit}
Harga: {harga}/malam

Nama: {nama}
Kota asal: {kota}
No. WhatsApp: {whatsapp}
Check-in: {checkin}
Check-out: {checkout} ({malam} malam)
Jumlah tamu: {tamu} orang
Keperluan: {keperluan}
Catatan: {catatan}

Estimasi: {estimasi}
Kode permintaan: {kode}
{link}`,
  checkinTime: "14.00 WITA",
  checkoutTime: "12.00 WITA",
  checkinRequirements: "Usia minimal 18 tahun dan membawa KTP, SIM, atau identitas lain.",
  houseRules: [
    "Dilarang merokok di dalam unit. Merokok hanya di balkon.",
    "Dilarang membawa narkoba, minuman keras, dan melakukan prostitusi.",
    "Jaga ketenangan dan kenyamanan penghuni lain.",
    "Jaga kebersihan, perabot, dan perlengkapan unit.",
    "Buang sampah di tempat yang disediakan.",
    "Perlengkapan unit tidak boleh dibawa atau dipindahkan tanpa izin admin.",
    "Check-out lewat dari 12.10 WITA dikenakan biaya Rp50.000 per jam.",
  ].join("\n"),
  siteLogo: null,
  companyLegalName: "PT Perdana Mega Trans",
  seoTitle: "Sewa Apartemen Harian di Makassar | VIDALIDAY",
  seoDescription:
    "Sewa apartemen resmi di Makassar: Vida View Panakkukang dan Delft CPI. Harian, mingguan, bulanan. Pesan cepat via WhatsApp.",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  googleBusinessUrl: "",
  about: {
    tagline: "Your Comfort, Our Priority",
    heroTitle: "VIDALIDAY, partner terpercaya untuk menginap nyaman di Makassar",
    introP1:
      "VIDALIDAY adalah brand di bawah PT Perdana Mega Trans, perusahaan berbadan hukum yang menghadirkan layanan sewa apartemen yang profesional, terpercaya, dan mengutamakan kenyamanan tamu.",
    introP2:
      "Kami menyediakan unit apartemen di Delft CPI dan Vida View Makassar dengan fasilitas lengkap, harga bersaing, dan promo menarik untuk liburan, perjalanan bisnis, staycation, maupun tinggal sementara.",
    introP3:
      "Setiap unit disiapkan dengan mengutamakan kebersihan, kenyamanan, dan kelengkapan fasilitas, supaya kamu bisa menginap senyaman di rumah sendiri.",
    commitTitle: "Komitmen kami",
    commitText:
      "Kepuasan dan kepercayaan tamu adalah prioritas VIDALIDAY. Kami berkomitmen memberi pelayanan yang ramah, proses pemesanan yang jelas, serta pengalaman menginap yang aman dan nyaman.",
    closingQuote: "VIDALIDAY: menginap nyaman, harga bersahabat, pilihan terpercaya.",
    closingCta: "Temukan unit favoritmu dan nikmati pengalaman menginap yang lebih menyenangkan bersama VIDALIDAY.",
    reasons: [
      { title: "Terpercaya dan berbadan hukum", desc: "Brand di bawah PT Perdana Mega Trans.", icon: "shield-check" },
      { title: "Unit bersih dan nyaman", desc: "Kebersihan dan kenyamanan jadi prioritas kami.", icon: "sparkles" },
      { title: "Fasilitas lengkap", desc: "Fasilitas penunjang untuk menginap yang lebih praktis.", icon: "house" },
      { title: "Harga bersaing dan promo", desc: "Pilihan harga yang sesuai kebutuhan dan anggaranmu.", icon: "tag" },
      { title: "Privasi dan keamanan", desc: "Kami mengutamakan privasi dan kenyamanan tamu.", icon: "lock" },
      { title: "Pesan dengan mudah", desc: "Hubungi admin lewat WhatsApp untuk info unit, harga, dan ketersediaan.", icon: "message-circle" },
    ],
  },
};
