import type { MetadataRoute } from "next";

/**
 * Perayap AI yang diberi izin eksplisit (PRD 6.9, AI Overview/answer engine). Grup terpisah supaya
 * aturannya tidak bergantung pada "*" dan mudah dipantau; semuanya tetap dilarang masuk /admin dan data chat.
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "Amazonbot",
  "CCBot",
  "Meta-ExternalAgent",
  "DuckAssistBot",
];

export const DISALLOWED_PATHS = ["/admin", "/chat-data"];

/** robots.txt: semua halaman publik boleh dirayapi; panel /admin dan data chat tidak. */
export function buildRobots(base: string): MetadataRoute.Robots {
  const host = base.replace(/\/+$/, "");
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOWED_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOWED_PATHS },
    ],
    sitemap: `${host}/sitemap.xml`,
    host,
  };
}
