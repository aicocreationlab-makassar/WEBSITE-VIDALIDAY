import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import {
  EMPTY_LEAD_FILTER,
  guestChatLink,
  LEAD_CSV_HEADER,
  leadCsvRow,
  leadFilterParams,
  leadSearchOr,
  parseLeadFilter,
  witaDayEndExclusive,
  witaDayStart,
} from "./lead-query";

describe("lead filters", () => {
  it("parses and serializes URL state, ignoring invalid values", () => {
    const filter = parseLeadFilter(
      new URLSearchParams("q=Budi&status=baru&apartemen=Vida+View&masuk_dari=2026-10-01&masuk_sampai=2026-10-31&checkin_dari=2026-11-01&hal=2"),
    );
    expect(filter).toEqual({
      q: "Budi",
      status: "baru",
      apartemen: "Vida View",
      masukDari: "2026-10-01",
      masukSampai: "2026-10-31",
      checkinDari: "2026-11-01",
      checkinSampai: null,
      hal: 2,
    });
    expect(parseLeadFilter(leadFilterParams(filter))).toEqual(filter);
    expect(parseLeadFilter({ status: "x", masuk_dari: "2026-02-30", hal: "0" })).toEqual(EMPTY_LEAD_FILTER);
  });

  it("uses WITA day boundaries", () => {
    expect(witaDayStart("2026-10-31")).toBe("2026-10-31T00:00:00+08:00");
    expect(witaDayEndExclusive("2026-10-31")).toBe("2026-11-01T00:00:00+08:00");
  });

  it("builds a safe search filter for name, code and number", () => {
    expect(leadSearchOr("Budi, (drop)")).toBe("full_name.ilike.*Budi drop*,code.ilike.*Budi drop*");
    expect(leadSearchOr("0812-3456")).toBe("full_name.ilike.*0812-3456*,code.ilike.*0812-3456*,whatsapp.ilike.*8123456*");
    expect(leadSearchOr("  ")).toBeNull();
  });
});

describe("lead export and chat", () => {
  const lead = {
    id: "1",
    code: "VDL-5A1EAE",
    created_at: "2026-10-16T02:00:00Z",
    full_name: "Budi Santoso",
    whatsapp: "6281234567890",
    unit_id: 1,
    unit_name: "Studio AT 26X",
    location_name: "Vida View",
    nightly_price: 280000,
    check_in: "2026-10-17",
    check_out: "2026-10-19",
    nights: 2,
    guests: 2,
    purpose: "Liburan",
    notes: "=1+1",
    estimated_total: 560000,
    status: "baru",
    admin_notes: null,
  };

  it("exports a CSV row that Excel opens safely", () => {
    const csv = toCsv(LEAD_CSV_HEADER, [leadCsvRow(lead)]);
    expect(csv.startsWith("﻿Waktu masuk,Kode,Nama")).toBe(true);
    expect(csv).toContain('"16 Okt 2026, 10.00 WITA",VDL-5A1EAE,Budi Santoso,0812-3456-7890,Studio AT 26X,Vida View,"Sab, 17 Okt 2026"');
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("Rp560.000,Baru");
  });

  it("opens a WhatsApp chat with a friendly greeting", () => {
    const link = guestChatLink(lead);
    expect(link.startsWith("https://wa.me/6281234567890?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toBe(
      "Halo Budi, terima kasih sudah mengirim permintaan sewa untuk unit Studio AT 26X di VIDALIDAY (kode VDL-5A1EAE, check-in Sab, 17 Okt 2026). Kami bantu cek ketersediaannya ya.",
    );
  });
});
