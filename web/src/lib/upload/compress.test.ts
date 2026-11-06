import { describe, expect, it } from "vitest";
import { checkFile, isAlreadySmall, MAX_SIDE, SKIP_COMPRESS_BYTES, UploadRejected } from "./compress";

describe("isAlreadySmall", () => {
  it("skips compression for small WebP/JPEG within the size limit", () => {
    expect(isAlreadySmall({ type: "image/webp", size: 120_000 }, { width: 1600, height: 1200 })).toBe(true);
    expect(isAlreadySmall({ type: "image/jpeg", size: SKIP_COMPRESS_BYTES }, { width: MAX_SIDE, height: 1080 })).toBe(true);
  });

  it("compresses PNG, large files, and oversized dimensions", () => {
    expect(isAlreadySmall({ type: "image/png", size: 50_000 }, { width: 800, height: 600 })).toBe(false);
    expect(isAlreadySmall({ type: "image/webp", size: SKIP_COMPRESS_BYTES + 1 }, { width: 800, height: 600 })).toBe(false);
    expect(isAlreadySmall({ type: "image/jpeg", size: 100_000 }, { width: MAX_SIDE + 1, height: 600 })).toBe(false);
    expect(isAlreadySmall({ type: "image/jpeg", size: 100_000 }, { width: 600, height: MAX_SIDE + 1 })).toBe(false);
  });
});

describe("checkFile", () => {
  const make = (name: string, type: string, size = 1000) => {
    const file = new File([new Uint8Array(size)], name, { type });
    return file;
  };

  it("rejects HEIC, SVG, GIF, and oversized files with Indonesian messages", () => {
    expect(() => checkFile(make("a.heic", "image/heic"))).toThrow(UploadRejected);
    expect(() => checkFile(make("a.svg", "image/svg+xml"))).toThrow(/bukan foto JPG, PNG, atau WebP/);
    expect(() => checkFile(make("a.gif", "image/gif"))).toThrow(UploadRejected);
    expect(() => checkFile(make("a.jpg", "image/jpeg", 10 * 1024 * 1024 + 1))).toThrow(/lebih dari 10 MB/);
  });

  it("accepts JPG, PNG, and WebP", () => {
    expect(() => checkFile(make("a.jpg", "image/jpeg"))).not.toThrow();
    expect(() => checkFile(make("a.png", "image/png"))).not.toThrow();
    expect(() => checkFile(make("a.webp", "image/webp"))).not.toThrow();
  });
});
