import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

/** robots.txt (PRD 6.9): semua halaman publik boleh dirayapi, panel /admin tidak. */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin",
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
