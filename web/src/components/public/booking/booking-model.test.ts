import { describe, expect, it } from "vitest";
import {
  activeLead,
  adjustCheckOut,
  clampGuests,
  dateBounds,
  defaultDates,
  defaultGuests,
  ESTIMATE_EMPTY_TEXT,
  estimateView,
  exceedsCapacity,
  firstEmptyField,
  firstInvalidField,
  initialBookingState,
  isOutsideOfficeHours,
  largerUnitsLink,
  LEAD_FRESH_MS,
  leadSnapshotKey,
  makassarMinutes,
  parseLeadSnapshot,
  parseOfficeHours,
  serverFieldErrors,
  stayNights,
  staySummary,
  successMessage,
} from "./booking-model";

// "Hari ini" palsu: Sabtu, 17 Oktober 2026 (WITA).
const TODAY = "2026-10-17";

const unit = { effectivePrice: 280_000, weeklyPrice: 1_750_000, monthlyPrice: 6_000_000 };

/** Timestamp untuk jam WITA tertentu pada hari TODAY. */
function witaAt(hour: number, minute = 0): number {
  return Date.UTC(2026, 9, 17, hour - 8, minute);
}

describe("stayNights / staySummary", () => {
  it("menghitung malam dan menolak tanggal terbalik atau kosong", () => {
    expect(stayNights("2026-10-17", "2026-10-19")).toBe(2);
    expect(stayNights("2026-10-19", "2026-10-19")).toBeNull();
    expect(stayNights("2026-10-19", "2026-10-17")).toBeNull();
    expect(stayNights("", "2026-10-17")).toBeNull();
    expect(stayNights("2026-10-17", "2027-10-18")).toBeNull();
  });

  it("ringkasan tanggal format Indonesia", () => {
    expect(staySummary("2026-10-17", "2026-10-19")).toBe("Sab, 17 Okt → Sen, 19 Okt · 2 malam");
    expect(staySummary("2026-10-17", "")).toBeNull();
  });
});

describe("defaultDates", () => {
  it("tanpa isian: hari ini dan besok", () => {
    expect(defaultDates(TODAY)).toEqual({ checkIn: "2026-10-17", checkOut: "2026-10-18" });
  });

  it("memakai isian kartu sewa yang masuk akal", () => {
    expect(defaultDates(TODAY, { checkIn: "2026-10-20", checkOut: "2026-10-23" })).toEqual({
      checkIn: "2026-10-20",
      checkOut: "2026-10-23",
    });
  });

  it("check-in lewat atau rusak diganti hari ini, check-out terbalik diganti besoknya", () => {
    expect(defaultDates(TODAY, { checkIn: "2026-10-10", checkOut: "2026-10-12" })).toEqual({
      checkIn: "2026-10-17",
      checkOut: "2026-10-18",
    });
    expect(defaultDates(TODAY, { checkIn: "2026-10-20", checkOut: "2026-10-19" })).toEqual({
      checkIn: "2026-10-20",
      checkOut: "2026-10-21",
    });
    expect(defaultDates(TODAY, { checkIn: "abc" })).toEqual({ checkIn: "2026-10-17", checkOut: "2026-10-18" });
    expect(defaultDates(TODAY, { checkIn: "2027-12-01" }).checkIn).toBe(TODAY);
  });
});

describe("adjustCheckOut", () => {
  const previous = { checkIn: "2026-10-17", checkOut: "2026-10-19" };

  it("check-in masih sebelum check-out: tidak berubah", () => {
    expect(adjustCheckOut(previous, "2026-10-18")).toBe("2026-10-19");
  });

  it("check-in menyentuh/melewati check-out: jumlah malam dipertahankan", () => {
    expect(adjustCheckOut(previous, "2026-10-19")).toBe("2026-10-21");
    expect(adjustCheckOut(previous, "2026-10-25")).toBe("2026-10-27");
  });

  it("tanpa malam sebelumnya: minimal 1 malam", () => {
    expect(adjustCheckOut({ checkIn: "", checkOut: "" }, "2026-10-20")).toBe("2026-10-21");
    expect(adjustCheckOut({ checkIn: "2026-10-22", checkOut: "2026-10-20" }, "2026-10-25")).toBe("2026-10-26");
  });

  it("check-in dikosongkan: check-out tetap", () => {
    expect(adjustCheckOut(previous, "")).toBe("2026-10-19");
  });
});

describe("dateBounds", () => {
  it("check-in hari ini sampai +365, check-out setelah check-in", () => {
    expect(dateBounds(TODAY, "2026-10-20")).toEqual({
      checkInMin: "2026-10-17",
      checkInMax: "2027-10-17",
      checkOutMin: "2026-10-21",
      checkOutMax: "2027-10-20",
    });
    expect(dateBounds(TODAY, "").checkOutMin).toBe("2026-10-18");
  });
});

describe("estimateView", () => {
  it("tarif harian", () => {
    const view = estimateView(unit, "2026-10-17", "2026-10-19");
    expect(view.text).toBe("Estimasi Rp560.000 untuk 2 malam");
    expect(view.kind === "estimate" && view.amount).toBe("Rp560.000");
  });

  it("tarif mingguan dan bulanan diberi keterangan", () => {
    expect(estimateView(unit, "2026-10-17", "2026-10-24").text).toBe(
      "Estimasi Rp1.750.000 untuk 7 malam (tarif mingguan)",
    );
    expect(estimateView(unit, "2026-10-17", "2026-11-16").text).toBe(
      "Estimasi Rp6.000.000 untuk 30 malam (tarif bulanan)",
    );
  });

  it("tanpa harga mingguan tetap harian", () => {
    expect(estimateView({ ...unit, weeklyPrice: null }, "2026-10-17", "2026-10-24").text).toBe(
      "Estimasi Rp1.960.000 untuk 7 malam",
    );
  });

  it("tanggal belum lengkap", () => {
    expect(estimateView(unit, "2026-10-17", "")).toEqual({ kind: "empty", text: ESTIMATE_EMPTY_TEXT });
    expect(estimateView(unit, "2026-10-19", "2026-10-18").text).toBe(ESTIMATE_EMPTY_TEXT);
  });

  it("harga nol tidak menampilkan Rp0", () => {
    expect(estimateView({ effectivePrice: 0, weeklyPrice: null, monthlyPrice: null }, TODAY, "2026-10-18").text).toBe(
      "1 malam, harga dikonfirmasi admin",
    );
  });
});

describe("tamu", () => {
  it("clampGuests membatasi 1-30", () => {
    expect(clampGuests(0)).toBe(1);
    expect(clampGuests(31)).toBe(30);
    expect(clampGuests(2.6)).toBe(3);
    expect(clampGuests(Number.NaN)).toBe(1);
  });

  it("defaultGuests: isian kartu, atau 2 dibatasi kapasitas", () => {
    expect(defaultGuests(undefined, 4)).toBe(2);
    expect(defaultGuests(undefined, 1)).toBe(1);
    expect(defaultGuests(undefined, 0)).toBe(2);
    expect(defaultGuests(5, 3)).toBe(5);
    expect(defaultGuests(40, 3)).toBe(30);
  });

  it("exceedsCapacity", () => {
    expect(exceedsCapacity(4, 3)).toBe(true);
    expect(exceedsCapacity(3, 3)).toBe(false);
    expect(exceedsCapacity(4, 0)).toBe(false);
  });

  it("largerUnitsLink mengganti parameter tamu", () => {
    expect(largerUnitsLink("/sewa?lokasi=vida-view&tamu=4", 6)).toBe("/sewa?lokasi=vida-view&tamu=6");
    expect(largerUnitsLink("/sewa", 5)).toBe("/sewa?tamu=5");
    expect(largerUnitsLink("/sewa?lokasi=delft#hasil", 5)).toBe("/sewa?lokasi=delft&tamu=5#hasil");
  });
});

describe("initialBookingState", () => {
  const bookingUnit = { id: 7, slug: "studio-at-26x", maxGuests: 3 };

  it("tanpa data tersimpan", () => {
    const state = initialBookingState({ today: TODAY, unit: bookingUnit, sourcePath: "/unit/studio-at-26x" });
    expect(state.identityCollapsed).toBe(false);
    expect(state.remember).toBe(false);
    expect(state.values).toEqual({
      unitId: 7,
      fullName: "",
      whatsapp: "",
      checkIn: "2026-10-17",
      checkOut: "2026-10-18",
      guests: 2,
      purpose: null,
      notes: "",
      website: "",
      sourcePath: "/unit/studio-at-26x",
    });
  });

  it("data tersimpan: nama dan nomor terisi, diringkas, checkbox tercentang", () => {
    const state = initialBookingState({
      today: TODAY,
      unit: bookingUnit,
      prefill: { checkIn: "2026-10-20", checkOut: "2026-10-22", guests: 4 },
      saved: { fullName: "Budi Santoso", whatsapp: "6281234567890" },
      sourcePath: "/unit/studio-at-26x",
    });
    expect(state.identityCollapsed).toBe(true);
    expect(state.remember).toBe(true);
    expect(state.values.fullName).toBe("Budi Santoso");
    expect(state.values.checkOut).toBe("2026-10-22");
    expect(state.values.guests).toBe(4);
  });

  it("data tersimpan kosong diabaikan", () => {
    const state = initialBookingState({
      today: TODAY,
      unit: bookingUnit,
      saved: { fullName: " ", whatsapp: "" },
      sourcePath: "/unit/x",
    });
    expect(state.identityCollapsed).toBe(false);
  });
});

describe("urutan field", () => {
  it("firstInvalidField mengikuti urutan form", () => {
    expect(firstInvalidField(["notes", "checkOut", "whatsapp"])).toBe("whatsapp");
    expect(firstInvalidField(["website"])).toBeNull();
  });

  it("serverFieldErrors hanya field dikenal, urut form", () => {
    expect(serverFieldErrors({ notes: "a", fullName: "b", purpose: "c" })).toEqual([
      ["fullName", "b"],
      ["notes", "a"],
    ]);
    expect(serverFieldErrors(undefined)).toEqual([]);
  });

  it("firstEmptyField", () => {
    const empty = { fullName: "", whatsapp: "", checkIn: TODAY, checkOut: "2026-10-18" };
    expect(firstEmptyField(empty, false)).toBe("fullName");
    expect(firstEmptyField({ ...empty, fullName: "Budi" }, false)).toBe("whatsapp");
    expect(firstEmptyField({ ...empty, fullName: "Budi", whatsapp: "0812" }, false)).toBe("checkIn");
    expect(firstEmptyField({ ...empty, checkOut: "" }, true)).toBe("checkOut");
  });
});

describe("permintaan terakhir", () => {
  const now = witaAt(10);
  const lead = { unit: "studio-at-26x", code: "VDL-5A1EAE", url: "https://wa.me/62811?text=x", at: now - 60_000 };

  it("hanya unit yang sama dan belum lewat 30 menit", () => {
    const raw = JSON.stringify(lead);
    expect(activeLead(raw, "studio-at-26x", now)).toEqual(lead);
    expect(activeLead(raw, "unit-lain", now)).toBeNull();
    expect(activeLead(raw, "studio-at-26x", lead.at + LEAD_FRESH_MS + 1)).toBeNull();
    expect(activeLead("{rusak", "studio-at-26x", now)).toBeNull();
    expect(activeLead(null, "studio-at-26x", now)).toBeNull();
    expect(activeLead(JSON.stringify({ ...lead, code: undefined }), "studio-at-26x", now)?.code).toBeNull();
  });

  it("snapshot stabil dan bisa dibaca ulang", () => {
    const raw = JSON.stringify(lead);
    const key = leadSnapshotKey(raw, "studio-at-26x", "Setiap Hari: 08.00 - 23.00 WITA", now);
    expect(key).toBe(leadSnapshotKey(raw, "studio-at-26x", "Setiap Hari: 08.00 - 23.00 WITA", now));
    expect(parseLeadSnapshot(key)).toEqual({ lead, outside: false });
    expect(leadSnapshotKey(raw, "lain", "", now)).toBeNull();
  });
});

describe("jam layanan", () => {
  const raw = "Setiap Hari: 08.00 - 23.00 WITA";

  it("parseOfficeHours", () => {
    expect(parseOfficeHours(raw)).toEqual({ start: 480, end: 1380, startLabel: "08.00" });
    expect(parseOfficeHours("24 jam")).toBeNull();
  });

  it("menit WITA dari timestamp", () => {
    expect(makassarMinutes(witaAt(0, 30))).toBe(30);
    expect(makassarMinutes(witaAt(23, 59))).toBe(1439);
  });

  it("di dalam dan di luar jam layanan", () => {
    expect(isOutsideOfficeHours(raw, witaAt(10))).toBe(false);
    expect(isOutsideOfficeHours(raw, witaAt(23, 30))).toBe(true);
    expect(isOutsideOfficeHours(raw, witaAt(7, 59))).toBe(true);
    expect(isOutsideOfficeHours("20.00 - 02.00 WITA", witaAt(1))).toBe(false);
    expect(isOutsideOfficeHours("20.00 - 02.00 WITA", witaAt(12))).toBe(true);
    expect(isOutsideOfficeHours("Setiap hari", witaAt(3))).toBe(false);
  });

  it("kalimat sukses", () => {
    expect(successMessage(raw, false)).toBe(
      "Permintaan terkirim ke WhatsApp. Admin membalas di jam layanan, 08.00–23.00 WITA.",
    );
    expect(successMessage(raw, true)).toBe(
      "Permintaan terkirim ke WhatsApp. Saat ini di luar jam layanan. Admin membalas mulai 08.00 WITA.",
    );
    expect(successMessage("", false)).toBe("Permintaan terkirim ke WhatsApp. Admin membalas di jam layanan.");
  });
});
