import { describe, expect, it } from "vitest";
import { makeLocations, SAMPLE_FACILITIES, SAMPLE_FAQS, SAMPLE_LANDMARKS } from "@/lib/chat/test-knowledge";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { sampleCatalog } from "@/lib/test-fixtures";
import { buildLlmsFullTxt, buildLlmsTxt, type LlmsInput } from "./llms";

const catalog = sampleCatalog();
const input: LlmsInput = {
  siteUrl: "https://vidaliday.com/",
  settings: DEFAULT_SETTINGS,
  locations: makeLocations(catalog),
  catalog,
  facilities: SAMPLE_FACILITIES,
  landmarks: SAMPLE_LANDMARKS,
  faqs: SAMPLE_FAQS,
};

describe("llms.txt", () => {
  const text = buildLlmsTxt(input);

  it("berjudul VIDALIDAY dengan bagian apartemen, tipe, kebijakan, FAQ, kontak", () => {
    expect(text.startsWith("# VIDALIDAY\n\n> ")).toBe(true);
    for (const heading of ["## Apartemen", "## Tipe kamar dan harga", "## Kebijakan menginap", "## Pertanyaan umum", "## Kontak", "## Halaman penting"]) {
      expect(text).toContain(heading);
    }
    expect(text).toContain("[Apartemen Vida View](https://vidaliday.com/apartemen/vida-view)");
    expect(text).toContain("[Studio di Vida View](https://vidaliday.com/apartemen/vida-view/studio): 2 unit tersedia, mulai Rp250.000/malam, maks. 3 tamu.");
    expect(text).toContain("Check-in mulai 14.00 WITA, check-out sampai 12.00 WITA.");
    expect(text).toContain("WhatsApp admin: 0857-1169-6970");
    expect(text).toContain("Fasilitas gedung: Infinity Pool, Fitness Center, Parkir Luas.");
    expect(text).toContain("Dekat: Mall Panakkukang (5 menit), Bandara Sultan Hasanuddin (30 menit).");
  });

  it("tanpa markdown dari DB, tanpa undefined, tanpa emoji", () => {
    expect(text).toContain("membawa KTP atau identitas lain");
    expect(text).not.toContain("**");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("null");
    expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false);
  });

  it("versi lengkap memuat semua unit dengan URL-nya", () => {
    const full = buildLlmsFullTxt(input);
    expect(full).toContain("## Semua unit");
    for (const unit of catalog) expect(full).toContain(`https://vidaliday.com/unit/${unit.slug}`);
    expect(full).toContain("[Studio AT 26X](https://vidaliday.com/unit/unit-1): Studio di Vida View, Tower Ashton lt. 26, maks. 3 tamu, Rp280.000/malam, tersedia. Fasilitas: AC, WiFi, Smart TV.");
    expect(full).toContain("[Studio Plus BV 10](https://vidaliday.com/unit/unit-4): Studio Plus di Vida View, maks. 5 tamu, Rp400.000/malam, penuh.");
    expect(full.endsWith("\n")).toBe(true);
  });
});
