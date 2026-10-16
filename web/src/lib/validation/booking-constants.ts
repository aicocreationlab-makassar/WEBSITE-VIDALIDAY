// Batas dan pesan form sewa (PRD 6.5) tanpa zod. Komponen yang tampil sejak awal (kartu sewa,
// galeri, model booking) mengimpor dari sini, supaya zod baru termuat bersama form sewa.

export const PURPOSES = ["Liburan", "Kerja/Bisnis", "Staycation", "Tinggal sementara", "Lainnya"] as const;
export type Purpose = (typeof PURPOSES)[number];

export const MAX_GUESTS = 30;
export const MAX_NOTES = 500;

export const BOOKING_MESSAGES = {
  name: "Tulis nama lengkap minimal 2 huruf.",
  nameLong: "Nama maksimal 100 karakter.",
  phone: "Nomor WhatsApp belum benar. Contoh: 0812 3456 7890.",
  checkInPast: "Check-in tidak boleh sebelum hari ini.",
  checkInFar: "Check-in maksimal 365 hari dari sekarang.",
  checkInInvalid: "Pilih tanggal check-in.",
  checkOutInvalid: "Pilih tanggal check-out.",
  checkOutOrder: "Tanggal check-out harus setelah check-in.",
  stayTooLong: "Lama menginap maksimal 365 malam.",
  guests: "Jumlah tamu 1 sampai 30 orang.",
  notes: `Catatan maksimal ${MAX_NOTES} karakter.`,
} as const;

export type BookingField = "fullName" | "whatsapp" | "checkIn" | "checkOut" | "guests" | "purpose" | "notes";
