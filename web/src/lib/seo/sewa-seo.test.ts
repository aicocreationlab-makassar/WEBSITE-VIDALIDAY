import { describe, expect, it } from "vitest";
import { makeLocations } from "@/lib/chat/test-knowledge";
import { EMPTY_FILTER, type SewaFilter } from "@/lib/validation/filters";
import { SEWA_TITLE, sewaSeo } from "./sewa-seo";

const locations = makeLocations();
const f = (overrides: Partial<SewaFilter> = {}): SewaFilter => ({ ...EMPTY_FILTER, ...overrides });

describe("sewaSeo", () => {
  it("tanpa filter: diindeks, canonical /sewa", () => {
    expect(sewaSeo(f(), locations)).toEqual({ title: SEWA_TITLE, canonical: "/sewa", index: true });
  });

  it("apartemen saja: diindeks dengan canonical sendiri", () => {
    expect(sewaSeo(f({ lokasi: "vida-view" }), locations)).toEqual({
      title: "Sewa Apartemen Vida View Makassar: Semua Unit",
      canonical: "/sewa?lokasi=vida-view",
      index: true,
    });
  });

  it("apartemen + tipe: canonical ke landing tipe, tidak diindeks", () => {
    expect(sewaSeo(f({ lokasi: "vida-view", tipe: "studio" }), locations)).toEqual({
      title: "Unit Studio di Vida View",
      canonical: "/apartemen/vida-view/studio",
      index: false,
    });
    // Tipe tanpa unit → bukan landing; kembali ke canonical apartemen.
    expect(sewaSeo(f({ lokasi: "vida-view", tipe: "tidak-ada" }), locations).canonical).toBe("/sewa?lokasi=vida-view");
  });

  it("filter lain: noindex, canonical ke versi tanpa filter", () => {
    expect(sewaSeo(f({ urut: "termurah" }), locations)).toMatchObject({ canonical: "/sewa", index: false });
    expect(sewaSeo(f({ lokasi: "delft-cpi", tamu: 4 }), locations)).toMatchObject({ canonical: "/sewa?lokasi=delft-cpi", index: false });
    expect(sewaSeo(f({ hal: 2 }), locations).index).toBe(false);
    expect(sewaSeo(f({ lokasi: "tidak-ada" }), locations)).toMatchObject({ canonical: "/sewa", index: false });
  });
});
