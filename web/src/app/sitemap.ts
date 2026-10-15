import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/data/catalog";
import { getListedLocations } from "@/lib/data/locations";
import { getSiteUrl } from "@/lib/env";
import { apartmentPath } from "@/lib/seo/apartment-jsonld";
import { unitHref } from "@/lib/unit-display";

/** Tanggal ISO terbaru dari data; tanggal kosong atau tidak valid diabaikan (tanpa jam sistem). */
function latest(dates: (string | null | undefined)[]): string | undefined {
  let best: { iso: string; time: number } | undefined;
  for (const iso of dates) {
    if (!iso) continue;
    const time = Date.parse(iso);
    if (Number.isNaN(time)) continue;
    if (!best || time > best.time) best = { iso, time };
  }
  return best?.iso;
}

/**
 * sitemap.xml (PRD 6.9): beranda, /sewa, /about, /kebijakan-privasi, apartemen terdaftar
 * (aktif dan punya unit), dan semua unit published. URL absolut dari getSiteUrl().
 * lastModified hanya dari kolom updated_at unit, supaya hasilnya statis dan ikut kedaluwarsa
 * bersama tag cache units/locations.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [catalog, locations] = await Promise.all([getCatalog(), getListedLocations()]);
  const catalogUpdated = latest(catalog.map((unit) => unit.updatedAt));

  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: catalogUpdated, changeFrequency: "daily", priority: 1 },
    { url: `${base}/sewa`, lastModified: catalogUpdated, changeFrequency: "daily", priority: 0.9 },
  ];

  const apartments: MetadataRoute.Sitemap = locations.map((location) => ({
    url: `${base}${apartmentPath(location.slug)}`,
    lastModified: latest(catalog.filter((unit) => unit.locationId === location.id).map((unit) => unit.updatedAt)),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const units: MetadataRoute.Sitemap = catalog.map((unit) => ({
    url: `${base}${unitHref(unit.slug)}`,
    lastModified: latest([unit.updatedAt]),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const info: MetadataRoute.Sitemap = [
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/kebijakan-privasi`, changeFrequency: "yearly", priority: 0.3 },
  ];

  return [...pages, ...apartments, ...units, ...info];
}
