import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl, youtubeId } from "./youtube";

describe("youtubeId", () => {
  it.each([
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://youtube.com/shorts/dQw4w9WgXcQ?feature=share",
  ])("reads the id from %s", (url) => {
    expect(youtubeId(url)).toBe("dQw4w9WgXcQ");
  });

  it("returns null for non-YouTube or malformed URLs", () => {
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId("https://youtube.com/watch?v=short")).toBeNull();
    expect(youtubeId("")).toBeNull();
  });

  it("builds a privacy-friendly embed URL", () => {
    expect(youtubeEmbedUrl("dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&autoplay=1",
    );
  });
});
