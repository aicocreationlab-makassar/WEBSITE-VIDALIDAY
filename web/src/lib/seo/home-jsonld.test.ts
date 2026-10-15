import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  buildFaqPageJsonLd,
  buildHomeJsonLd,
  buildLodgingBusinessJsonLd,
  priceRangeOf,
} from "@/lib/seo/home-jsonld";
import { serializeJsonLd } from "@/lib/seo/json-ld";

const SITE = "https://vidaliday.com";

describe("absoluteUrl", () => {
  it("menggabungkan path situs dengan URL kanonik", () => {
    expect(absoluteUrl(SITE, "/images/logo-vidaliday.jpg")).toBe("https://vidaliday.com/images/logo-vidaliday.jpg");
    expect(absoluteUrl(`${SITE}/`, "images/a.jpg")).toBe("https://vidaliday.com/images/a.jpg");
  });

  it("membiarkan URL penuh apa adanya", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/media/locations/a.jpg";
    expect(absoluteUrl(SITE, url)).toBe(url);
  });
});

describe("priceRangeOf", () => {
  it("membentuk rentang termurah sampai termahal", () => {
    expect(priceRangeOf([500000, 250000, 1500000, 300000])).toBe("Rp250.000 - Rp1.500.000");
  });

  it("satu harga saja tanpa rentang", () => {
    expect(priceRangeOf([280000, 280000])).toBe("Rp280.000");
  });

  it("tanpa harga valid → null", () => {
    expect(priceRangeOf([])).toBeNull();
    expect(priceRangeOf([0, Number.NaN])).toBeNull();
  });
});

describe("buildLodgingBusinessJsonLd", () => {
  it("berisi data bisnis lengkap dengan URL absolut", () => {
    const ld = buildLodgingBusinessJsonLd({
      siteUrl: `${SITE}/`,
      whatsappNumber: "0857-1169-6970",
      prices: [250000, 1500000, 400000],
      description: "Sewa apartemen resmi di Makassar.",
      email: " info@vidaliday.com ",
      images: ["/images/locations/vida-view.jpg", null, "/images/locations/vida-view.jpg", ""],
    });

    expect(ld).toEqual({
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      "@id": "https://vidaliday.com/#lodging",
      name: "VIDALIDAY",
      url: "https://vidaliday.com",
      logo: "https://vidaliday.com/images/logo-vidaliday.jpg",
      image: ["https://vidaliday.com/images/locations/vida-view.jpg"],
      description: "Sewa apartemen resmi di Makassar.",
      telephone: "+6285711696970",
      email: "info@vidaliday.com",
      priceRange: "Rp250.000 - Rp1.500.000",
      currenciesAccepted: "IDR",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Makassar",
        addressRegion: "Sulawesi Selatan",
        addressCountry: "ID",
      },
      areaServed: { "@type": "City", name: "Makassar" },
    });
  });

  it("melewati field kosong dan memakai logo sebagai gambar", () => {
    const ld = buildLodgingBusinessJsonLd({ siteUrl: SITE, whatsappNumber: "", prices: [] });
    expect(ld.image).toEqual(["https://vidaliday.com/images/logo-vidaliday.jpg"]);
    expect(ld).not.toHaveProperty("telephone");
    expect(ld).not.toHaveProperty("priceRange");
    expect(ld).not.toHaveProperty("description");
    expect(ld).not.toHaveProperty("email");
  });
});

describe("buildFaqPageJsonLd", () => {
  it("membuang penanda markdown dan pertanyaan kosong", () => {
    const ld = buildFaqPageJsonLd([
      { question: "Apakah bisa *sewa harian*?", answer: "Bisa, **minimal 1 malam**." },
      { question: "  ", answer: "Tidak tampil." },
    ]);
    expect(ld).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Apakah bisa sewa harian?",
          acceptedAnswer: { "@type": "Answer", text: "Bisa, minimal 1 malam." },
        },
      ],
    });
  });

  it("tanpa FAQ → null", () => {
    expect(buildFaqPageJsonLd([])).toBeNull();
  });
});

describe("buildHomeJsonLd", () => {
  const base = { siteUrl: SITE, whatsappNumber: "6285711696970", prices: [250000] };

  it("LodgingBusiness dulu, lalu FAQPage", () => {
    const list = buildHomeJsonLd({ ...base, faqs: [{ question: "Jam check-in?", answer: "14.00 WITA." }] });
    expect(list.map((item) => item["@type"])).toEqual(["LodgingBusiness", "FAQPage"]);
  });

  it("tanpa FAQ hanya LodgingBusiness", () => {
    expect(buildHomeJsonLd({ ...base, faqs: [] }).map((item) => item["@type"])).toEqual(["LodgingBusiness"]);
  });
});

describe("serializeJsonLd", () => {
  it("meng-escape < supaya tag script tidak bisa ditutup dari data", () => {
    const json = serializeJsonLd({ "@type": "Thing", name: "</script><script>alert(1)</script>" });
    expect(json).not.toContain("<");
    expect(json).toContain("\\u003c/script>");
    expect(JSON.parse(json)).toEqual({ "@type": "Thing", name: "</script><script>alert(1)</script>" });
  });
});
