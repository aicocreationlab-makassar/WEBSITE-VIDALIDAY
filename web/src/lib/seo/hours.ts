// Jam layanan (setting `office_hours`, teks bebas) → OpeningHoursSpecification schema.org. Fungsi murni, ada test.

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const RANGE = /(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})/;

/** "Setiap Hari: 08.00 - 23.00 WITA" → { opens: "08:00", closes: "23:00" }; tidak terbaca → null. */
export function parseOfficeHours(raw: string | null | undefined): { opens: string; closes: string } | null {
  if (!raw) return null;
  const match = RANGE.exec(raw);
  if (!match) return null;
  const [sh, sm, eh, em] = match.slice(1).map(Number);
  if (sh > 24 || eh > 24 || sm > 59 || em > 59) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { opens: `${pad(sh)}:${pad(sm)}`, closes: `${pad(eh)}:${pad(em)}` };
}

/** Satu spesifikasi untuk semua hari (jam layanan VIDALIDAY sama setiap hari); kosong kalau tidak terbaca. */
export function openingHoursSpecification(raw: string | null | undefined): Record<string, unknown>[] {
  const hours = parseOfficeHours(raw);
  if (!hours) return [];
  return [{ "@type": "OpeningHoursSpecification", dayOfWeek: DAYS, opens: hours.opens, closes: hours.closes }];
}
