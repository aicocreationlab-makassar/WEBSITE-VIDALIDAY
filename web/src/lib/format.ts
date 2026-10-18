// Format angka, tanggal, jam, dan nomor WhatsApp untuk tampilan (Bahasa Indonesia, zona WITA).

export const TIME_ZONE = "Asia/Makassar";

const rupiahNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 280000 → "Rp280.000" */
export function formatRupiah(value: number): string {
  return `Rp${rupiahNumber.format(Math.round(value))}`;
}

const longDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE });

/** "2026-10-18" → "18 Oktober 2026" (zona WITA). */
export function formatDateLong(value: string | Date): string {
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+08:00`) : new Date(value);
  return longDate.format(date);
}

const fileSizeNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** Ukuran file: 0 → "0 B", 1536 → "1,5 KB", 2.300.000 → "2,3 MB". */
export function formatFileSize(bytes: number): string {
  const value = Math.max(0, Number.isFinite(bytes) ? bytes : 0);
  if (value < 1024) return `${Math.round(value)} B`;
  if (value < 1024 * 1024) return `${fileSizeNumber.format(value / 1024)} KB`;
  if (value < 1024 * 1024 * 1024) return `${fileSizeNumber.format(value / (1024 * 1024))} MB`;
  return `${fileSizeNumber.format(value / (1024 * 1024 * 1024))} GB`;
}

/** Bentuk singkat hanya kalau persis (tanpa pembulatan); selain itu null. 1050000, 1e6, 2 → "1,05". */
function exactShort(n: number, unit: number, decimals: number): string | null {
  if (n % (unit / 10 ** decimals) !== 0) return null;
  return (n / unit).toFixed(decimals).replace(/\.?0+$/, "").replace(".", ",");
}

/**
 * 280000 → "Rp280rb", 1500000 → "Rp1,5jt", 1050000 → "Rp1,05jt".
 * Nilai yang tidak bisa disingkat tanpa pembulatan ditulis penuh ("Rp1.234.567"),
 * supaya label budget dan "mulai" tidak berbeda dengan harga sebenarnya.
 */
export function formatRupiahShort(value: number): string {
  const n = Math.round(value);
  if (n >= 1_000_000) {
    const short = exactShort(n, 1_000_000, 2);
    return short === null ? formatRupiah(n) : `Rp${short}jt`;
  }
  if (n >= 1_000) {
    const short = exactShort(n, 1_000, 1);
    return short === null ? formatRupiah(n) : `Rp${short}rb`;
  }
  return `Rp${n}`;
}

// ---------------------------------------------------------------------------
// Tanggal
// ---------------------------------------------------------------------------

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Tanggal kalender "YYYY-MM-DD" diformat apa adanya; timestamp diformat di zona WITA. */
function toDateAndZone(value: string | Date): { date: Date; timeZone: string } {
  if (typeof value === "string") {
    const match = DATE_ONLY.exec(value);
    if (match) {
      const [, y, m, d] = match;
      return { date: new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12)), timeZone: "UTC" };
    }
    return { date: new Date(value), timeZone: TIME_ZONE };
  }
  return { date: value, timeZone: TIME_ZONE };
}

function parts(value: string | Date, options: Intl.DateTimeFormatOptions) {
  const { date, timeZone } = toDateAndZone(value);
  const formatted = new Intl.DateTimeFormat("id-ID", { ...options, timeZone }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    formatted.find((part) => part.type === type)?.value ?? "";
  return get;
}

/** "2026-10-18" → "Sab, 18 Okt 2026" */
export function formatDate(value: string | Date): string {
  const get = parts(value, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return `${get("weekday")}, ${get("day")} ${get("month")} ${get("year")}`;
}

/** "2026-10-18" → "Sab, 18 Okt" */
export function formatDateShort(value: string | Date): string {
  const get = parts(value, { weekday: "short", day: "numeric", month: "short" });
  return `${get("weekday")}, ${get("day")} ${get("month")}`;
}

/** "2026-10-18" → "18 Okt 2026" */
export function formatDateCompact(value: string | Date): string {
  const get = parts(value, { day: "numeric", month: "short", year: "numeric" });
  return `${get("day")} ${get("month")} ${get("year")}`;
}

/** Timestamp → "14.00 WITA" */
export function formatTime(value: string | Date): string {
  const get = parts(value, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${get("hour")}.${get("minute")} WITA`;
}

/** Timestamp → "18 Okt 2026, 14.00 WITA" */
export function formatDateTime(value: string | Date): string {
  return `${formatDateCompact(value)}, ${formatTime(value)}`;
}

/** Tanggal hari ini di zona WITA sebagai "YYYY-MM-DD". */
export function todayInMakassar(now: Date = new Date()): string {
  const get = parts(now, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Tambah n hari ke tanggal kalender "YYYY-MM-DD". */
export function addDays(date: string, days: number): string {
  const match = DATE_ONLY.exec(date);
  if (!match) throw new Error(`Tanggal tidak valid: ${date}`);
  const [, y, m, d] = match;
  const result = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + days));
  return result.toISOString().slice(0, 10);
}

/** Selisih hari kalender antara dua tanggal "YYYY-MM-DD" (to - from). */
export function diffDays(from: string, to: string): number {
  const a = DATE_ONLY.exec(from);
  const b = DATE_ONLY.exec(to);
  if (!a || !b) return Number.NaN;
  const start = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const end = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((end - start) / 86_400_000);
}

export function isDateString(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

// ---------------------------------------------------------------------------
// Nomor WhatsApp
// ---------------------------------------------------------------------------

const WHATSAPP_VALID = /^628\d{7,11}$/;

/** "0812-3456 7890", "+62 812…", "62812…", "812…" → "6281234567890" (tanpa validasi). */
export function normalizeWhatsapp(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return digits;
}

export function isValidWhatsapp(normalized: string): boolean {
  return WHATSAPP_VALID.test(normalized);
}

/** "6281234567890" → "0812-3456-7890" */
export function formatWhatsappDisplay(normalized: string): string {
  const digits = normalizeWhatsapp(normalized);
  if (!digits.startsWith("62")) return normalized;
  const local = `0${digits.slice(2)}`;
  return [local.slice(0, 4), local.slice(4, 8), local.slice(8)].filter(Boolean).join("-");
}

// ---------------------------------------------------------------------------
// Teks lain
// ---------------------------------------------------------------------------

/** "Setiap Hari: 08.00 - 23.00 WITA" → "08.00–23.00 WITA" */
export function formatOfficeHours(raw: string): string {
  return raw
    .replace(/^\s*setiap\s+hari\s*[:,]?\s*/i, "")
    .replace(/(\d{2}[.:]\d{2})\s*[-–—]\s*(\d{2}[.:]\d{2})/g, "$1–$2")
    .replace(/\s+/g, " ")
    .trim();
}

const LEGAL_UPPER = new Set(["PT", "CV", "UD", "TBK", "PD", "FA"]);

/** "PT PERDANA MEGA TRANS" → "PT Perdana Mega Trans". Nama yang sudah huruf campuran tidak diubah. */
export function toDisplayLegalName(raw: string): string {
  const name = raw.trim();
  if (/[a-z]/.test(name)) return name;
  return name
    .split(/(\s+)/)
    .map((word) => {
      const bare = word.replace(/[^A-Za-z]/g, "");
      if (!bare) return word;
      if (LEGAL_UPPER.has(bare.toUpperCase())) return bare.toUpperCase() === "TBK" ? "Tbk" : word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

export function formatNights(nights: number): string {
  return `${nights} malam`;
}

export function formatGuests(guests: number): string {
  return `${guests} tamu`;
}

/** Buang penanda markdown sederhana (`*tebal*`) dari teks data lama. */
export function stripMarkdown(text: string): string {
  return text.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1").replace(/\*/g, "");
}
