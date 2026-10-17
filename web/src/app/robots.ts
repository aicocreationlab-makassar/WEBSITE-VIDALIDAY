import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { buildRobots } from "@/lib/seo/robots-model";

/** robots.txt (PRD 6.9): semua halaman publik boleh dirayapi (termasuk perayap AI); /admin dan data chat tidak. */
export default function robots(): MetadataRoute.Robots {
  return buildRobots(getSiteUrl());
}
