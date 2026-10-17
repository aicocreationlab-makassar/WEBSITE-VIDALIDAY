import { afterEach, describe, expect, it, vi } from "vitest";
import { indexNowKey, indexNowUrls, submitIndexNow } from "./indexnow";

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
