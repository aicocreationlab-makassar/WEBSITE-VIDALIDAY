import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { buildAboutJsonLd } from "./about-jsonld";

describe("buildAboutJsonLd", () => {
  const nodes = buildAboutJsonLd({
    siteUrl: "https://vidaliday.com/",
    title: "Tentang VIDALIDAY",
    description: "  Pengelola sewa apartemen\n resmi di Makassar. ",
    legalName: "PT PERDANA MEGA TRANS",
    whatsappNumber: "0857 1169 6970",
    email: "halo@example.com",
    officeHours: "10.00-23.00 WITA",
    sameAs: ["https://instagram.com/vidaliday", "", null],
  });

  it("Organization, AboutPage, BreadcrumbList dengan @id yang saling menunjuk", () => {
    expect(nodes.map((node) => node["@type"])).toEqual(["Organization", "AboutPage", "BreadcrumbList"]);
    expect(nodes[0]["@id"]).toBe("https://vidaliday.com/#organization");
    expect(nodes[1]).toMatchObject({
      url: "https://vidaliday.com/about",
      name: "Tentang VIDALIDAY",
      description: "Pengelola sewa apartemen resmi di Makassar.",
      about: { "@id": "https://vidaliday.com/#organization" },
      mainEntity: { "@id": "https://vidaliday.com/#organization" },
      isPartOf: { "@id": "https://vidaliday.com/#website" },
    });
    expect(nodes[2]).toMatchObject({
      itemListElement: [
        { position: 1, item: "https://vidaliday.com/" },
        { position: 2, name: "Tentang kami", item: "https://vidaliday.com/about" },
      ],
    });
  });

  it("aman diserialisasi dan tanpa deskripsi kosong", () => {
    const empty = buildAboutJsonLd({ siteUrl: "https://vidaliday.com", title: "", whatsappNumber: "" });
    expect(empty[1]).not.toHaveProperty("description");
    expect(empty[1].name).toBe("Tentang VIDALIDAY");
    expect(serializeJsonLd(nodes)).not.toContain("</script>");
  });
});
