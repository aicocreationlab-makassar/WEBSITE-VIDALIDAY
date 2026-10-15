import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./settings-defaults";
import { fillTemplate, waLink } from "./whatsapp";

describe("fillTemplate", () => {
  it("fills the default template and matches the PRD example", () => {
    const message = fillTemplate(DEFAULT_SETTINGS.bookingWhatsappTemplate, {
      unit: "Studio AT 26X",
      apartemen: "Vida View",
      lokasi_unit: "Tower Ashton lt. 26",
      harga: "Rp280.000",
      nama: "Budi Santoso",
      whatsapp: "0812-3456-7890",
      checkin: "Sab, 18 Okt 2026",
      checkout: "Sen, 20 Okt 2026",
      malam: 2,
      tamu: 2,
      keperluan: "Liburan",
      catatan: "",
      estimasi: "Rp560.000",
      kode: "VDL-5A1EAE",
      link: "https://vidaliday.com/unit/studio-at-26x",
    });
    expect(message).toBe(`Halo Admin VIDALIDAY, saya mau sewa unit ini:

Unit: Studio AT 26X
Apartemen: Vida View
Lokasi unit: Tower Ashton lt. 26
Harga: Rp280.000/malam

Nama: Budi Santoso
No. WhatsApp: 0812-3456-7890
Check-in: Sab, 18 Okt 2026
Check-out: Sen, 20 Okt 2026 (2 malam)
Jumlah tamu: 2 orang
Keperluan: Liburan

Estimasi: Rp560.000
Kode permintaan: VDL-5A1EAE
https://vidaliday.com/unit/studio-at-26x`);
  });

  it("drops every line whose placeholder is empty and collapses blank lines", () => {
    const message = fillTemplate("A {unit}\n\n{catatan}\n\n\nB {kode}\nC", { unit: "x", catatan: null });
    expect(message).toBe("A x\n\nC");
  });

  it("keeps unknown braces untouched", () => {
    expect(fillTemplate("Halo {admin} {unit}", { unit: "x" })).toBe("Halo {admin} x");
  });
});

describe("waLink", () => {
  it("builds an encoded wa.me URL", () => {
    expect(waLink("+62 857-1169-6970", "Halo admin & tim")).toBe(
      "https://wa.me/6285711696970?text=Halo%20admin%20%26%20tim",
    );
    expect(waLink("6285711696970")).toBe("https://wa.me/6285711696970");
  });
});
