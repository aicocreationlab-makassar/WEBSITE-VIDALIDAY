// Pembentuk sitemap.xml (PRD 6.9): beranda, /sewa, profil apartemen, landing tipe per apartemen, semua
// unit published, /about, /kebijakan-privasi; tiap URL membawa gambar (foto gedung/fasilitas/unit, tanpa
// foto stok). Fungsi murni, ada test.

import type { MetadataRoute } from "next";
import { isStockPhoto } from "@/lib/media";
import { apartmentPath } from "@/lib/seo/apartment-jsonld";
import { absoluteUrl } from "@/lib/seo/home-jsonld";
import { PRIVACY_POLICY_UPDATED } from "@/lib/seo/site";
import { roomTypeHref, unitHref } from "@/lib/unit-display";
import type { CatalogUnit, Facility, LocationWithTypes } from "@/types/domain";

export type SitemapInput = {
  base: string;
  catalog: CatalogUnit[];
  locations: LocationWithTypes[];
  facilities: Facility[];
  /** updated_at terbaru tabel settings (untuk /about). */
  settingsUpdatedAt: string | null;
};

const MAX_IMAGES = 10;

/** Tanggal ISO terbaru dari data; tanggal kosong atau tidak valid diabaikan (tanpa jam sistem). */
export function latest(dates: (string | null | undefined)[]): string | undefined {
  let best: { iso: string; time: number } | undefined;
  for (const iso of dates) {
    if (!iso) continue;
    const time = Date.parse(iso);
    if (Number.isNaN(time)) continue;
    if (!best || time > best.time) best = { iso, time };
  }
  return best?.iso;
}

function images(base: string, candidates: (string | null | undefined)[], limit = MAX_IMAGES): string[] | undefined {
  const list = [
    ...new Set(
      candidates
        .filter((image): image is string => Boolean(image && image.trim()) && !isStockPhoto(image))
        .map((image) => absoluteUrl(base, image)),
    ),
  ].slice(0, limit);
  return list.length ? list : undefined;
}

export function buildSitemap({ base: rawBase, catalog, locations, facilities, settingsUpdatedAt }: SitemapInput): MetadataRoute.Sitemap {
  const base = rawBase.replace(/\/+$/, "");
  const catalogUpdated = latest(catalog.map((unit) => unit.updatedAt));
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: catalogUpdated,
      changeFrequency: "daily",
      priority: 1,
      images: images(base, locations.map((location) => location.imageUrl)),
    },
    { url: `${base}/sewa`, lastModified: catalogUpdated, changeFrequency: "daily", priority: 0.9 },
  ];

  for (const location of locations) {
    const units = catalog.filter((unit) => unit.locationId === location.id);
    const buildingFacilities = facilities.filter((facility) => facility.locationId === location.id);
    entries.push({
      url: `${base}${apartmentPath(location.slug)}`,
      lastModified: latest(units.map((unit) => unit.updatedAt)),
      changeFrequency: "weekly",
      priority: 0.8,
      images: images(base, [location.imageUrl, ...buildingFacilities.map((facility) => facility.imageUrl)]),
    });
    for (const type of location.roomTypes) {
      if (type.unitCount <= 0) continue;
      const typeUnits = units.filter((unit) => unit.roomTypeId === type.id);
      entries.push({
        url: `${base}${roomTypeHref(location.slug, type.slug)}`,
        lastModified: latest(typeUnits.map((unit) => unit.updatedAt)),
        changeFrequency: "weekly",
        priority: 0.8,
        images: images(base, typeUnits.map((unit) => unit.photos[0])),
      });
    }
  }

  for (const unit of catalog) {
    entries.push({
      url: `${base}${unitHref(unit.slug)}`,
      lastModified: latest([unit.updatedAt]),
      changeFrequency: "weekly",
      priority: 0.7,
      images: images(base, unit.photos),
    });
  }

  entries.push(
    { url: `${base}/about`, lastModified: latest([settingsUpdatedAt]), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/kebijakan-privasi`, lastModified: PRIVACY_POLICY_UPDATED, changeFrequency: "yearly", priority: 0.3 },
  );
  return entries;
}
