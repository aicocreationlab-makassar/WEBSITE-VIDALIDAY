import { describe, expect, it } from "vitest";
import { buildBookingMessage, FULL_UNIT_NOTE } from "./booking-message";
import { DEFAULT_SETTINGS } from "./settings-defaults";

const unit = {
  name: "Studio AT 26X",
  slug: "studio-at-26x",
  locationShortName: "Vida View",
  tower: "Ashton",
  floorNumber: 26,
  effectivePrice: 280000,
  weeklyPrice: null,
  monthlyPrice: null,
  isAvailable: true,
};

const input = {
  fullName: "Budi Santoso",
  originCity: "Jakarta",
  whatsapp: "0812 3456 7890",
  checkIn: "2026-10-17",
  checkOut: "2026-10-19",
  nights: 2,
  guests: 2,
  purpose: "Liburan",
  notes: "",
  code: "VDL-5A1EAE",
};

describe("buildBookingMessage", () => {
  it("matches the PRD example format with the default template", () => {
    expect(buildBookingMessage(DEFAULT_SETTINGS.bookingWhatsappTemplate, unit, input, "https://vidaliday.com/")).toBe(
      `Halo Admin VIDALIDAY, saya mau sewa unit ini:

Unit: Studio AT 26X
Apartemen: Vida View
Lokasi unit: Tower Ashton lt. 26
Harga: Rp280.000/malam

Nama: Budi Santoso
Kota asal: Jakarta
No. WhatsApp: 0812-3456-7890
Check-in: Sab, 17 Okt 2026
Check-out: Sen, 19 Okt 2026 (2 malam)
Jumlah tamu: 2 orang
Keperluan: Liburan

Estimasi: Rp560.000
Kode permintaan: VDL-5A1EAE
https://vidaliday.com/unit/studio-at-26x`,
    );
  });

  it("drops the code line when saving failed and the location line when unknown", () => {
    const message = buildBookingMessage(
      DEFAULT_SETTINGS.bookingWhatsappTemplate,
      { ...unit, tower: null, floorNumber: null },
      { ...input, code: null },
      "https://vidaliday.com",
    );
    expect(message).not.toContain("Kode permintaan");
    expect(message).not.toContain("Lokasi unit");
  });

  it("drops the city line for guests saved before the field existed", () => {
    const message = buildBookingMessage(
      DEFAULT_SETTINGS.bookingWhatsappTemplate,
      unit,
      { ...input, originCity: undefined },
      "https://vidaliday.com",
    );
    expect(message).not.toContain("Kota asal");
    expect(message).toContain("Nama: Budi Santoso\nNo. WhatsApp");
  });

  it("uses weekly rates in the estimate and adds a note for full units", () => {
    const message = buildBookingMessage(
      DEFAULT_SETTINGS.bookingWhatsappTemplate,
      { ...unit, weeklyPrice: 1750000, isAvailable: false },
      { ...input, checkOut: "2026-10-24", nights: 7 },
      "https://vidaliday.com",
    );
    expect(message).toContain("Estimasi: Rp1.750.000");
    expect(message.endsWith(FULL_UNIT_NOTE)).toBe(true);
  });
});
