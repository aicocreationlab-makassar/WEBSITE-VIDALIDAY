import { describe, expect, it } from "vitest";
import { buildLanding, findLandingType } from "@/components/public/landing/landing-model";
import { makeLocations } from "@/lib/chat/test-knowledge";
import { sampleCatalog } from "@/lib/test-fixtures";
import { buildLandingJsonLd, buildLandingOffersJsonLd, landingPageUrl } from "./landing-jsonld";
import { serializeJsonLd } from "./json-ld";

const catalog = sampleCatalog();
const [vida] = makeLocations(catalog);
const SITE = "https://vidaliday.com/";

describe("landing JSON-LD", () => {
  const data = buildLanding(vida, findLandingType(vida, "studio")!, catalog);

  it("breadcrumb, daftar unit, rentang harga, FAQ", () => {
    const all = buildLandingJsonLd({ data, siteUrl: SITE, faqs: [{ question: "Bisa harian?", answer: "Bisa." }] });
    expect(all.map((node) => node["@type"])).toEqual(["BreadcrumbList", "ItemList", "AggregateOffer", "FAQPage"]);
    expect(landingPageUrl(SITE, data)).toBe("https://vidaliday.com/apartemen/vida-view/studio");
    expect(all[0].itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Beranda", item: "https://vidaliday.com/" },
      { "@type": "ListItem", position: 2, name: "Vida View", item: "https://vidaliday.com/apartemen/vida-view" },
      { "@type": "ListItem", position: 3, name: "Studio", item: "https://vidaliday.com/apartemen/vida-view/studio" },
    ]);
    expect(all[1]).toMatchObject({ "@id": "https://vidaliday.com/apartemen/vida-view/studio#units", numberOfItems: 2 });
    expect(all[2]).toMatchObject({ lowPrice: 250000, highPrice: 280000, offerCount: 2, priceCurrency: "IDR" });
    expect(serializeJsonLd(all)).not.toContain("<");
  });

  it("semua penuh → tanpa AggregateOffer", () => {
    const full = buildLanding(vida, findLandingType(vida, "studio-plus")!, catalog);
    expect(buildLandingOffersJsonLd({ data: full, siteUrl: SITE })).toBeNull();
    expect(buildLandingJsonLd({ data: full, siteUrl: SITE }).map((node) => node["@type"])).toEqual(["BreadcrumbList", "ItemList"]);
  });
});
