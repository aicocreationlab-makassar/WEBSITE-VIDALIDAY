import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apartmentPaths,
  indexNowKey,
  indexNowUrls,
  publicUnitSlugs,
  shouldNotifyIndexNow,
  submitIndexNow,
} from "./indexnow";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("IndexNow", () => {
  it("menyusun URL yang berubah (beranda dan /sewa selalu ikut)", () => {
    expect(indexNowUrls([{ kind: "unit", slugs: ["lama", "baru", null] }], "https://vidaliday.com/")).toEqual([
      "https://vidaliday.com/",
      "https://vidaliday.com/sewa",
      "https://vidaliday.com/unit/lama",
      "https://vidaliday.com/unit/baru",
    ]);
    expect(indexNowUrls([{ kind: "settings" }], "https://vidaliday.com")).toContain("https://vidaliday.com/about");
  });

  it("unit draf tidak dilaporkan", async () => {
    const targets = [{ kind: "unit" as const, slugs: ["tampil", "draf", null] }];
    const publicSlugs = await publicUnitSlugs(targets, async (slugs) => slugs.filter((slug) => slug === "tampil"));
    expect(indexNowUrls(targets, "https://vidaliday.com", { publicSlugs })).toEqual([
      "https://vidaliday.com/",
      "https://vidaliday.com/sewa",
      "https://vidaliday.com/unit/tampil",
    ]);
    // Lookup gagal → tidak ada URL unit yang dilaporkan.
    const none = await publicUnitSlugs(targets, async () => {
      throw new Error("offline");
    });
    expect(indexNowUrls(targets, "https://vidaliday.com", { publicSlugs: none })).toHaveLength(2);
  });

  it("profil apartemen dan landing tipe ikut dilaporkan; hapus permintaan sewa saja tidak", () => {
    const sitePaths = apartmentPaths([
      {
        slug: "vida-view",
        roomTypes: [
          { slug: "studio", unitCount: 3 },
          { slug: "2br", unitCount: 0 },
        ],
      },
    ]);
    expect(sitePaths).toEqual(["/apartemen/vida-view", "/apartemen/vida-view/studio"]);
    expect(indexNowUrls([{ kind: "facility" }], "https://vidaliday.com", { sitePaths })).toEqual([
      "https://vidaliday.com/",
      "https://vidaliday.com/sewa",
      "https://vidaliday.com/apartemen/vida-view",
      "https://vidaliday.com/apartemen/vida-view/studio",
    ]);
    expect(shouldNotifyIndexNow([{ kind: "lead" }])).toBe(false);
    expect(indexNowUrls([{ kind: "lead" }], "https://vidaliday.com", { sitePaths })).toEqual([]);
    expect(shouldNotifyIndexNow([{ kind: "lead" }, { kind: "units" }])).toBe(true);
  });

  it("tanpa kunci tidak mengirim apa pun", async () => {
    vi.stubEnv("INDEXNOW_KEY", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(indexNowKey()).toBeNull();
    expect(await submitIndexNow(["https://vidaliday.com/"], "https://vidaliday.com")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mengirim ke api.indexnow.org dan tidak melempar saat gagal", async () => {
    vi.stubEnv("INDEXNOW_KEY", "abcdef1234567890");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 202 }));
    expect(await submitIndexNow(["https://vidaliday.com/"], "https://vidaliday.com")).toBe(true);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ host: "vidaliday.com", key: "abcdef1234567890", keyLocation: "https://vidaliday.com/indexnow.txt" });
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await submitIndexNow(["https://vidaliday.com/"], "https://vidaliday.com")).toBe(false);
  });
});
