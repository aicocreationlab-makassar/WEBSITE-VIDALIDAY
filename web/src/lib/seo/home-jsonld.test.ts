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
      parentOrganization: { "@id": "https://vidaliday.com/#organization" },
    });
  });

  it("menambah badan hukum, jam layanan, tautan sosial, dan gedung yang dikelola", () => {
    const ld = buildLodgingBusinessJsonLd({
      siteUrl: SITE,
      whatsappNumber: "6285711696970",
      prices: [250000],
      legalName: "PT PERDANA MEGA TRANS",
      officeHours: "10.00–23.00 WITA",
      sameAs: ["https://www.instagram.com/vidaliday", "", "bukan url", "https://www.instagram.com/vidaliday"],
      locations: [
        { name: "Apartemen Vida View", url: `${SITE}/apartemen/vida-view`, address: "Jl. Topaz Raya", latitude: -5.15, longitude: 119.44 },
        { name: "Apartemen Delft CPI", url: `${SITE}/apartemen/delft-cpi`, address: null, latitude: null, longitude: null },
      ],
    });
    expect(ld.legalName).toBe("PT Perdana Mega Trans");
    expect(ld.openingHoursSpecification).toHaveLength(1);
    expect(ld.sameAs).toEqual(["https://www.instagram.com/vidaliday"]);
    expect(ld.address).toMatchObject({ streetAddress: "Jl. Topaz Raya" });
    expect(ld.geo).toEqual({ "@type": "GeoCoordinates", latitude: -5.15, longitude: 119.44 });
    const locations = ld.location as Record<string, unknown>[];
    expect(locations).toHaveLength(2);
    expect(locations[0]).toMatchObject({ "@type": "ApartmentComplex", "@id": `${SITE}/apartemen/vida-view#apartemen` });
    expect(locations[1]).not.toHaveProperty("geo");
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
  const base = { siteUrl: SITE, whatsappNumber: "6285711696970", prices: [250000], officeHours: "08.00–23.00 WITA", email: "info@vidaliday.com" };

  it("Organization, WebSite, LodgingBusiness, lalu FAQPage", () => {
    const list = buildHomeJsonLd({ ...base, faqs: [{ question: "Jam check-in?", answer: "14.00 WITA." }] });
    expect(list.map((item) => item["@type"])).toEqual(["Organization", "WebSite", "LodgingBusiness", "FAQPage"]);
    expect(list[0]).toMatchObject({
      "@id": "https://vidaliday.com/#organization",
      name: "VIDALIDAY",
      logo: { "@type": "ImageObject", url: "https://vidaliday.com/images/logo-vidaliday.jpg" },
      email: "info@vidaliday.com",
    });
    const contact = (list[0].contactPoint as Record<string, unknown>[])[0];
    expect(contact).toMatchObject({ "@type": "ContactPoint", telephone: "+6285711696970", contactType: "customer service" });
    expect(contact.hoursAvailable).toHaveLength(1);
    expect(list[1]).toMatchObject({ "@id": "https://vidaliday.com/#website", inLanguage: "id", publisher: { "@id": "https://vidaliday.com/#organization" } });
  });

  it("tanpa FAQ tiga node", () => {
    expect(buildHomeJsonLd({ ...base, faqs: [] }).map((item) => item["@type"])).toEqual(["Organization", "WebSite", "LodgingBusiness"]);
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
