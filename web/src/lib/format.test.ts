import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatFileSize,
  formatOfficeHours,
  formatRupiah,
  formatRupiahShort,
  formatTime,
  formatWhatsappDisplay,
  isDateString,
  isValidWhatsapp,
  normalizeWhatsapp,
  stripMarkdown,
  toDisplayLegalName,
  todayInMakassar,
} from "./format";

describe("Rupiah", () => {
  it("formats id-ID without decimals and without a space", () => {
    expect(formatRupiah(280000)).toBe("Rp280.000");
    expect(formatRupiah(1250000.4)).toBe("Rp1.250.000");
    expect(formatRupiah(0)).toBe("Rp0");
  });

  it("formats the short form", () => {
    expect(formatRupiahShort(280000)).toBe("Rp280rb");
    expect(formatRupiahShort(250500)).toBe("Rp250,5rb");
    expect(formatRupiahShort(1000000)).toBe("Rp1jt");
    expect(formatRupiahShort(1500000)).toBe("Rp1,5jt");
    expect(formatRupiahShort(900)).toBe("Rp900");
    // Tanpa pembulatan: label harus sama dengan harga sebenarnya.
    expect(formatRupiahShort(1050000)).toBe("Rp1,05jt");
    expect(formatRupiahShort(1250000)).toBe("Rp1,25jt");
    expect(formatRupiahShort(2000000)).toBe("Rp2jt");
    expect(formatRupiahShort(1234567)).toBe("Rp1.234.567");
    expect(formatRupiahShort(250550)).toBe("Rp250.550");
    expect(formatRupiahShort(10000000)).toBe("Rp10jt");
  });
});

describe("dates (WITA)", () => {
  it("formats calendar dates without shifting the day", () => {
    // Catatan: contoh di PRD 6.5 menulis "Sab, 18 Okt 2026"; 18 Okt 2026 sebenarnya hari Minggu.
    expect(formatDate("2026-10-17")).toBe("Sab, 17 Okt 2026");
    expect(formatDate("2026-10-18")).toBe("Min, 18 Okt 2026");
    expect(formatDateShort("2026-10-19")).toBe("Sen, 19 Okt");
  });

  it("formats timestamps in Asia/Makassar", () => {
    // 06:00 UTC = 14:00 WITA
    expect(formatTime("2026-10-18T06:00:00Z")).toBe("14.00 WITA");
    expect(formatDateTime("2026-10-18T17:30:00Z")).toBe("19 Okt 2026, 01.30 WITA");
  });

  it("computes today in WITA", () => {
    expect(todayInMakassar(new Date("2026-10-15T16:30:00Z"))).toBe("2026-10-16");
    expect(todayInMakassar(new Date("2026-10-15T15:59:00Z"))).toBe("2026-10-15");
  });

  it("adds and diffs calendar days", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(diffDays("2026-10-18", "2026-10-20")).toBe(2);
    expect(diffDays("2026-12-31", "2027-01-30")).toBe(30);
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2026-02-28")).toBe(true);
  });
});

describe("WhatsApp numbers", () => {
  it.each([
    ["0812-3456-7890", "6281234567890"],
    ["+62 812 3456 7890", "6281234567890"],
    ["62812 3456 7890", "6281234567890"],
    ["812-3456-7890", "6281234567890"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeWhatsapp(input)).toBe(expected);
    expect(isValidWhatsapp(normalizeWhatsapp(input))).toBe(true);
  });

  it("rejects numbers outside ^628\\d{7,11}$", () => {
    expect(isValidWhatsapp(normalizeWhatsapp("021-555-1234"))).toBe(false);
    expect(isValidWhatsapp("62812345")).toBe(false);
    expect(isValidWhatsapp("628123456789012")).toBe(false);
  });

  it("formats for display", () => {
    expect(formatWhatsappDisplay("6281234567890")).toBe("0812-3456-7890");
    expect(formatWhatsappDisplay("6285711696970")).toBe("0857-1169-6970");
  });
});

describe("text helpers", () => {
  it("cleans office hours", () => {
    expect(formatOfficeHours("Setiap Hari: 08.00 - 23.00 WITA")).toBe("08.00–23.00 WITA");
    expect(formatOfficeHours("10.00-23.00 WITA")).toBe("10.00–23.00 WITA");
  });

  it("displays legal names in mixed case", () => {
    expect(toDisplayLegalName("PT PERDANA MEGA TRANS")).toBe("PT Perdana Mega Trans");
    expect(toDisplayLegalName("PT Perdana Mega Trans")).toBe("PT Perdana Mega Trans");
  });

  it("formats file sizes in Indonesian", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1,5 KB");
    expect(formatFileSize(2_300_000)).toBe("2,2 MB");
    expect(formatFileSize(3 * 1024 ** 3)).toBe("3 GB");
    expect(formatFileSize(Number.NaN)).toBe("0 B");
  });

  it("strips markdown asterisks", () => {
    expect(stripMarkdown("Unit sudah *deep cleaning* dan **wangi**.")).toBe(
      "Unit sudah deep cleaning dan wangi.",
    );
  });
});
