// Template pesan WhatsApp dan tautan wa.me.

export const BOOKING_PLACEHOLDERS = [
  { key: "unit", label: "Nama unit" },
  { key: "apartemen", label: "Nama apartemen" },
  { key: "lokasi_unit", label: "Tower dan lantai unit" },
  { key: "harga", label: "Harga per malam" },
  { key: "nama", label: "Nama tamu" },
  { key: "kota", label: "Kota asal tamu" },
  { key: "whatsapp", label: "Nomor WhatsApp tamu" },
  { key: "checkin", label: "Tanggal check-in" },
  { key: "checkout", label: "Tanggal check-out" },
  { key: "malam", label: "Jumlah malam" },
  { key: "tamu", label: "Jumlah tamu" },
  { key: "keperluan", label: "Keperluan menginap" },
  { key: "catatan", label: "Catatan tamu" },
  { key: "estimasi", label: "Estimasi total" },
  { key: "kode", label: "Kode permintaan" },
  { key: "link", label: "Tautan halaman unit" },
] as const;

export type BookingPlaceholder = (typeof BOOKING_PLACEHOLDERS)[number]["key"];

export type TemplateValues = Partial<Record<BookingPlaceholder, string | number | null | undefined>>;

const KNOWN = new Set<string>(BOOKING_PLACEHOLDERS.map((p) => p.key));
const PLACEHOLDER = /\{([a-z_]+)\}/g;

function isEmpty(value: string | number | null | undefined): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

/**
 * Isi template. Baris yang berisi placeholder kosong dihapus seluruhnya.
 * Kurung kurawal yang bukan placeholder dikenal dibiarkan apa adanya.
 * Baris kosong berurutan diringkas jadi satu, dan baris kosong di awal/akhir dibuang.
 */
export function fillTemplate(template: string, values: TemplateValues): string {
  // Teks "\n" harfiah (garis miring + n, mis. dari SQL yang salah escape) juga dianggap ganti baris:
  // template WhatsApp tidak pernah sengaja memuatnya, dan tanpa ini satu baris bisa memuat dua isian.
  const lines = template
    .replace(/\\r\\n|\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const kept: string[] = [];

  for (const line of lines) {
    const keys = [...line.matchAll(PLACEHOLDER)].map((m) => m[1]).filter((key) => KNOWN.has(key));
    if (keys.some((key) => isEmpty(values[key as BookingPlaceholder]))) continue;
    kept.push(
      line.replace(PLACEHOLDER, (match, key: string) =>
        KNOWN.has(key) ? String(values[key as BookingPlaceholder]).trim() : match,
      ),
    );
  }

  const collapsed: string[] = [];
  for (const line of kept) {
    const blank = line.trim() === "";
    if (blank && (collapsed.length === 0 || collapsed[collapsed.length - 1].trim() === "")) continue;
    collapsed.push(blank ? "" : line);
  }
  while (collapsed.length && collapsed[collapsed.length - 1] === "") collapsed.pop();
  return collapsed.join("\n");
}

/** Tautan wa.me. Nomor dibersihkan jadi digit saja. */
export function waLink(number: string, text?: string): string {
  const digits = number.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/**
 * Nomor WhatsApp admin bawaan (setting `whatsapp_number` kosong). Konstanta terpisah dari
 * DEFAULT_SETTINGS supaya halaman galat tidak ikut membundel semua teks bawaan.
 */
export const DEFAULT_WHATSAPP_NUMBER = "6285711696970";

/** Pesan umum ke admin (tombol WA di header, FAB, penutup beranda). */
export const GENERAL_INQUIRY_MESSAGE =
  "Halo Admin VIDALIDAY, saya mau tanya ketersediaan sewa apartemen di Makassar.";
