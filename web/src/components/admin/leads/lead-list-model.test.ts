import { describe, expect, it } from "vitest";
import { EMPTY_LEAD_FILTER, type LeadRow } from "@/lib/admin/lead-query";
import {
  applyLeadPatch,
  apartmentOptions,
  checkinChanges,
  chipCount,
  datePresets,
  EMPTY_LEAD_PANEL,
  exportHref,
  firstName,
  hasActiveLeadFilters,
  masukChanges,
  matchingPreset,
  notePreview,
  notesChanged,
  orderRange,
  panelChanges,
  panelFilterCount,
  panelFromFilter,
  rangeLabel,
  stayNights,
  stayRangeLabel,
  toStatus,
} from "./lead-list-model";

const lead = (over: Partial<LeadRow> = {}): LeadRow => ({
  id: "6f1c9a4e-0000-4000-8000-000000000001",
  code: "VDL-ABC123",
  created_at: "2026-10-16T06:05:00Z",
  full_name: "Budi Santoso",
  whatsapp: "6281234567890",
  unit_id: 1,
  unit_name: "Studio AT 26X",
  location_name: "Vida View",
  nightly_price: 280000,
  check_in: "2026-10-18",
  check_out: "2026-10-20",
  nights: 2,
  guests: 2,
  purpose: "Liburan",
  notes: null,
  estimated_total: 560000,
  status: "baru",
  admin_notes: null,
  ...over,
});

describe("filter panel", () => {
  it("reads the panel part of the filter", () => {
    const panel = panelFromFilter({ ...EMPTY_LEAD_FILTER, q: "budi", status: "deal", apartemen: "Vida View", hal: 3 });
    expect(panel).toEqual({ ...EMPTY_LEAD_PANEL, status: "deal", apartemen: "Vida View" });
  });

  it("swaps reversed ranges", () => {
    expect(orderRange("2026-10-20", "2026-10-01")).toEqual(["2026-10-01", "2026-10-20"]);
    expect(orderRange("2026-10-01", null)).toEqual(["2026-10-01", null]);
    expect(masukChanges("2026-10-20", "2026-10-01")).toEqual({ masuk_dari: "2026-10-01", masuk_sampai: "2026-10-20" });
    expect(checkinChanges("", null)).toEqual({ checkin_dari: null, checkin_sampai: null });
  });

  it("maps the whole panel to URL changes", () => {
    expect(
      panelChanges({ ...EMPTY_LEAD_PANEL, status: "baru", apartemen: "", checkinDari: "2026-11-02", checkinSampai: "2026-11-01" }),
    ).toEqual({
      status: "baru",
      apartemen: null,
      masuk_dari: null,
      masuk_sampai: null,
      checkin_dari: "2026-11-01",
      checkin_sampai: "2026-11-02",
    });
  });

  it("counts active panel filters (a date range counts once)", () => {
    expect(panelFilterCount(EMPTY_LEAD_PANEL)).toBe(0);
    expect(
      panelFilterCount({ ...EMPTY_LEAD_PANEL, status: "baru", masukDari: "2026-10-01", masukSampai: "2026-10-10", checkinSampai: "2026-12-01" }),
    ).toBe(3);
  });

  it("detects active filters including search", () => {
    expect(hasActiveLeadFilters(EMPTY_LEAD_FILTER)).toBe(false);
    expect(hasActiveLeadFilters({ ...EMPTY_LEAD_FILTER, hal: 4 })).toBe(false);
    expect(hasActiveLeadFilters({ ...EMPTY_LEAD_FILTER, q: "0812" })).toBe(true);
    expect(hasActiveLeadFilters({ ...EMPTY_LEAD_FILTER, apartemen: "Vida View" })).toBe(true);
  });

  it("accepts only known statuses", () => {
    expect(toStatus("dihubungi")).toBe("dihubungi");
    expect(toStatus("")).toBeNull();
    expect(toStatus("hapus")).toBeNull();
  });

  it("keeps an apartment from the URL that is no longer in the list", () => {
    expect(apartmentOptions(["Vida View", "Delft CPI", "Vida View", " "], null)).toEqual(["Vida View", "Delft CPI"]);
    expect(apartmentOptions(["Vida View"], "Apartemen Lama")).toEqual(["Vida View", "Apartemen Lama"]);
  });
});

describe("exportHref", () => {
  it("uses the same filter without the page number", () => {
    expect(exportHref(EMPTY_LEAD_FILTER)).toBe("/admin/leads/export");
    const href = exportHref({ ...EMPTY_LEAD_FILTER, q: "budi", status: "baru", masukDari: "2026-10-01", hal: 3 });
    const url = new URL(href, "https://vidaliday.com");
    expect(url.pathname).toBe("/admin/leads/export");
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: "budi", status: "baru", masuk_dari: "2026-10-01" });
  });
});

describe("date presets and labels", () => {
  it("looks back for tanggal masuk and ahead for check-in", () => {
    const masuk = datePresets("masuk", "2026-10-16");
    expect(masuk.map((p) => [p.label, p.from, p.to])).toEqual([
      ["Hari ini", "2026-10-16", "2026-10-16"],
      ["Kemarin", "2026-10-15", "2026-10-15"],
      ["7 hari terakhir", "2026-10-10", "2026-10-16"],
      ["30 hari terakhir", "2026-09-17", "2026-10-16"],
    ]);
    const checkin = datePresets("checkin", "2026-12-31");
    expect(checkin.find((p) => p.key === "besok")).toMatchObject({ from: "2027-01-01", to: "2027-01-01" });
    expect(checkin.find((p) => p.key === "7-hari")).toMatchObject({ from: "2026-12-31", to: "2027-01-06" });
  });

  it("finds the matching preset", () => {
    const presets = datePresets("masuk", "2026-10-16");
    expect(matchingPreset(presets, "2026-10-10", "2026-10-16")).toBe("7-hari");
    expect(matchingPreset(presets, "2026-10-10", null)).toBeNull();
  });

  it("formats ranges compactly", () => {
    expect(rangeLabel(null, null)).toBeNull();
    expect(rangeLabel("2026-10-16", "2026-10-16")).toBe("16 Okt 2026");
    expect(rangeLabel("2026-10-16", "2026-10-20")).toBe("16 Okt – 20 Okt 2026");
    expect(rangeLabel("2026-12-30", "2027-01-02")).toBe("30 Des 2026 – 2 Jan 2027");
    expect(rangeLabel("2026-10-16", null)).toBe("Sejak 16 Okt 2026");
    expect(rangeLabel(null, "2026-10-20")).toBe("Sampai 20 Okt 2026");
    expect(rangeLabel("bukan-tanggal", null)).toBeNull();
  });
});

describe("row helpers", () => {
  it("uses stored nights and recomputes when missing", () => {
    expect(stayNights(lead())).toBe(2);
    expect(stayNights(lead({ nights: null, check_in: "2026-10-18", check_out: "2026-10-25" }))).toBe(7);
    expect(stayNights(lead({ nights: null, check_in: "rusak", check_out: "2026-10-25" }))).toBeNull();
  });

  it("formats the stay range without the year", () => {
    expect(stayRangeLabel("2026-10-18", "2026-10-20")).toBe("18–20 Okt");
    expect(stayRangeLabel("2026-10-30", "2026-11-02")).toBe("30 Okt – 2 Nov");
    expect(stayRangeLabel("2026-12-30", "2027-01-02")).toBe("30 Des – 2 Jan");
  });

  it("previews notes on one line", () => {
    expect(notePreview(null)).toBe("");
    expect(notePreview("  Sudah\n\ntransfer  DP ")).toBe("Sudah transfer DP");
    expect(notePreview("a".repeat(80), 20)).toBe(`${"a".repeat(19)}…`);
  });

  it("takes the first name", () => {
    expect(firstName("  Budi Santoso ")).toBe("Budi");
    expect(firstName("Ayu")).toBe("Ayu");
  });

  it("compares notes like the zod schema (trimmed)", () => {
    expect(notesChanged(null, "  ")).toBe(false);
    expect(notesChanged("DP masuk", "DP masuk ")).toBe(false);
    expect(notesChanged("DP masuk", "DP lunas")).toBe(true);
  });

  it("sums chip counts", () => {
    const counts = { baru: 3, dihubungi: 4, deal: 2, batal: 1 };
    expect(chipCount(counts, "semua")).toBe(10);
    expect(chipCount(counts, "deal")).toBe(2);
    expect(chipCount(null, "baru")).toBeNull();
  });

  it("patches only the targeted row", () => {
    const rows = [lead(), lead({ id: "6f1c9a4e-0000-4000-8000-000000000002", code: "VDL-XYZ789" })];
    const next = applyLeadPatch(rows, { id: rows[1].id, status: "deal", adminNotes: "Lunas" });
    expect(next[0]).toBe(rows[0]);
    expect(next[1]).toMatchObject({ status: "deal", admin_notes: "Lunas", code: "VDL-XYZ789" });
    expect(applyLeadPatch(rows, { id: rows[0].id, status: "batal" })[0].admin_notes).toBeNull();
  });
});
