import { describe, expect, it } from "vitest";
import { AI_CRAWLERS, buildRobots } from "./robots-model";

describe("robots", () => {
  it("mengizinkan semua perayap termasuk AI, melarang admin dan data chat", () => {
    const robots = buildRobots("https://vidaliday.com/");
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    expect(rules[0]).toEqual({ userAgent: "*", allow: "/", disallow: ["/admin", "/chat-data"] });
    expect(rules[1].userAgent).toEqual(AI_CRAWLERS);
    expect(AI_CRAWLERS).toContain("GPTBot");
    expect(AI_CRAWLERS).toContain("ClaudeBot");
    expect(AI_CRAWLERS).toContain("PerplexityBot");
    expect(AI_CRAWLERS).toContain("Google-Extended");
    expect(new Set(AI_CRAWLERS).size).toBe(AI_CRAWLERS.length);
    expect(robots.sitemap).toBe("https://vidaliday.com/sitemap.xml");
    expect(robots.host).toBe("https://vidaliday.com");
  });
});
