import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isBucketPath,
  isStockPhoto,
  locationImageUrl,
  mediaUrl,
  normalizeStoragePath,
  parseGallery,
  unitPhotoUrls,
} from "./media";

const ORIGINAL = process.env.NEXT_PUBLIC_SUPABASE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co/";
});
afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL;
});

describe("media", () => {
  it("normalizes legacy storage prefixes", () => {
    expect(normalizeStoragePath("/storage/units/a.jpg")).toBe("units/a.jpg");
    expect(normalizeStoragePath("public/units/a.jpg")).toBe("units/a.jpg");
    expect(normalizeStoragePath("units/a.jpg")).toBe("units/a.jpg");
  });

  it("builds public Storage URLs and passes full URLs through", () => {
    expect(mediaUrl("units/a b.webp")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/media/units/a%20b.webp",
    );
    expect(mediaUrl("https://cdn.example.com/x.jpg")).toBe("https://cdn.example.com/x.jpg");
    expect(mediaUrl("")).toBeNull();
    expect(mediaUrl(null)).toBeNull();
  });

  it("detects stock photos and bucket paths", () => {
    expect(isStockPhoto("https://images.unsplash.com/photo-1522771739844?w=800")).toBe(true);
    expect(isStockPhoto("units/a.jpg")).toBe(false);
    expect(isBucketPath("units/a.jpg")).toBe(true);
    expect(isBucketPath("https://images.unsplash.com/x")).toBe(false);
  });

  it("parses gallery JSON in both shapes", () => {
    expect(parseGallery(["units/a.jpg", "", 3])).toEqual(["units/a.jpg"]);
    expect(parseGallery('["units/b.jpg"]')).toEqual(["units/b.jpg"]);
    expect(parseGallery("bukan json")).toEqual([]);
  });

  it("lists unit photos: cover first, no duplicates, no stock photos", () => {
    const urls = unitPhotoUrls({
      main_image: "units/a.jpg",
      gallery_images: ["units/a.jpg", "https://images.unsplash.com/photo-1", "units/b.jpg"],
    });
    expect(urls).toEqual([
      "https://abc.supabase.co/storage/v1/object/public/media/units/a.jpg",
      "https://abc.supabase.co/storage/v1/object/public/media/units/b.jpg",
    ]);
  });

  it("falls back to the bundled building photo", () => {
    expect(locationImageUrl({ slug: "vida-view", hero_image: "https://images.unsplash.com/photo-1545" })).toBe(
      "/images/locations/vida-view.jpg",
    );
    expect(locationImageUrl({ slug: "baru", hero_image: null })).toBeNull();
  });
});
