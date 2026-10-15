import { describe, expect, it } from "vitest";
import {
  answerPreview,
  faqChipCounts,
  filterFaqs,
  homeFaqIds,
  matchesFaq,
  mentionsLegacyButton,
  nextFaqSortOrder,
  toFaqRow,
  type AdminFaqRow,
} from "./faq-model";

const faq = (over: Partial<AdminFaqRow>): AdminFaqRow => ({
  id: 1,
  question: "Jam check-in?",
  answer: "Mulai 14.00 WITA.",
  sortOrder: 1,
  isActive: true,
  ...over,
});

const rows: AdminFaqRow[] = [
  faq({ id: 1, question: "Bagaimana jam check-in & check-out?", answer: "Check-in 14.00, check-out 12.00 WITA.", sortOrder: 2 }),
  faq({ id: 2, question: "Apakah ada parkir?", answer: "Ada, parkir *gratis* di basement.", sortOrder: 1 }),
  faq({ id: 3, question: "Boleh bawa hewan?", answer: "Maaf, tidak boleh.", sortOrder: 3, isActive: false }),
  faq({ id: 4, question: "Cara bayar?", answer: "Transfer bank.", sortOrder: 2 }),
];

describe("toFaqRow", () => {
  it("maps columns and ignores the legacy badge", () => {
    const raw = { id: 5, question: "Q?", answer: "A.", sort_order: 9, is_active: false, badge: "Fleksibel" };
    expect(toFaqRow(raw)).toEqual({ id: 5, question: "Q?", answer: "A.", sortOrder: 9, isActive: false });
  });
});

describe("search and filters", () => {
  it("matches every word in question or answer", () => {
    expect(matchesFaq(rows[0], "check out")).toBe(true);
    expect(matchesFaq(rows[1], "parkir basement")).toBe(true);
    expect(matchesFaq(rows[1], "parkir kolam")).toBe(false);
    expect(matchesFaq(rows[1], "")).toBe(true);
  });

  it("filters and sorts by sort_order then id", () => {
    expect(filterFaqs(rows, "", "semua").map((r) => r.id)).toEqual([2, 1, 4, 3]);
    expect(filterFaqs(rows, "", "aktif").map((r) => r.id)).toEqual([2, 1, 4]);
    expect(filterFaqs(rows, "", "nonaktif").map((r) => r.id)).toEqual([3]);
    expect(filterFaqs(rows, "check", "semua").map((r) => r.id)).toEqual([1]);
  });

  it("counts chips from the current search", () => {
    expect(faqChipCounts(rows, "")).toEqual({ semua: 4, aktif: 3, nonaktif: 1 });
    expect(faqChipCounts(rows, "boleh")).toEqual({ semua: 1, aktif: 0, nonaktif: 1 });
  });
});

describe("home and form helpers", () => {
  it("marks the top active FAQs shown on the home page", () => {
    expect([...homeFaqIds(rows, 2)]).toEqual([2, 1]);
    expect(homeFaqIds(rows).has(3)).toBe(false);
  });

  it("next sort order is max + 1", () => {
    expect(nextFaqSortOrder(rows)).toBe(4);
    expect(nextFaqSortOrder([])).toBe(1);
  });

  it("builds a one-line answer preview without markdown stars", () => {
    expect(answerPreview("Ada, parkir *gratis*.\n\nDi **basement**.")).toBe("Ada, parkir gratis. Di basement.");
  });

  it("detects the legacy button name", () => {
    expect(mentionsLegacyButton("Klik tombol Pesan via WhatsApp di halaman unit.")).toBe(true);
    expect(mentionsLegacyButton("pesan lewat WA saja")).toBe(true);
    expect(mentionsLegacyButton("Klik Sewa sekarang lalu kirim pesan WhatsApp.")).toBe(false);
    expect(mentionsLegacyButton(null)).toBe(false);
  });
});
