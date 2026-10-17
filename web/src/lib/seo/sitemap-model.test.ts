import { describe, expect, it } from "vitest";
import { makeLocations, SAMPLE_FACILITIES } from "@/lib/chat/test-knowledge";
import { sampleCatalog } from "@/lib/test-fixtures";
import { buildSitemap, latest } from "./sitemap-model";

const BASE = "https://vidaliday.com";

describe("buildSitemap", () => {
  const catalog = sampleCatalog();
  const locations = makeLocations(catalog).map((location, index) => ({
    ...location,
    imageUrl: index === 0 ? "/images/locations/vida-view.jpg" : null,
  }));
  const entries = buildSitemap({ base: `${BASE}/`, catalog, locations, facilities: SAMPLE_FACILITIES, settingsUpdatedAt: "2026-10-17T00:00:00Z" });
  const urls = entries.map((entry) => entry.url);

  it("memuat beranda, sewa, apartemen, landing tipe, unit, about, privasi", () => {
    expect(urls[0]).toBe(`${BASE}/`);
    expect(urls).toContain(`${BASE}/sewa`);
    expect(urls).toContain(`${BASE}/apartemen/vida-view`);
    expect(urls).toContain(`${BASE}/apartemen/vida-view/studio`);
    expect(urls).toContain(`${BASE}/apartemen/delft-cpi/studio-corner`);
    expect(urls).toContain(`${BASE}/unit/unit-7`);
    expect(urls).toContain(`${BASE}/about`);
    expect(urls).toContain(`${BASE}/kebijakan-privasi`);
    // 2 + 2 apartemen + 6 tipe + 7 unit + 2
    expect(entries).toHaveLength(19);
  });

  it("membawa gambar tanpa foto stok dan tanggal perubahan", () => {
    const home = entries[0];
    expect(home.images).toEqual([`${BASE}/images/locations/vida-view.jpg`]);
    const unit = entries.find((entry) => entry.url === `${BASE}/unit/unit-1`)!;
    expect(unit.images).toEqual(["https://abc.supabase.co/storage/v1/object/public/media/units/a.jpg"]);
    expect(unit.lastModified).toBe("2026-10-01T00:00:00Z");
    const noPhoto = entries.find((entry) => entry.url === `${BASE}/unit/unit-7`)!;
    expect(noPhoto.images).toBeUndefined();
    const about = entries.find((entry) => entry.url === `${BASE}/about`)!;
    expect(about.lastModified).toBe("2026-10-17T00:00:00Z");
    const privacy = entries.find((entry) => entry.url === `${BASE}/kebijakan-privasi`)!;
    expect(privacy.lastModified).toBe("2026-10-18");
    const landing = entries.find((entry) => entry.url === `${BASE}/apartemen/delft-cpi/studio`)!;
    expect(landing.lastModified).toBe("2026-10-01T00:00:00Z");
    expect(landing.priority).toBe(0.8);
    expect(landing.images).toEqual(["https://abc.supabase.co/storage/v1/object/public/media/units/a.jpg"]);
  });

  it("latest mengabaikan tanggal kosong dan rusak", () => {
    expect(latest(["2026-10-01T00:00:00Z", null, "bukan", "2026-10-05T00:00:00Z"])).toBe("2026-10-05T00:00:00Z");
    expect(latest([])).toBeUndefined();
  });
});
