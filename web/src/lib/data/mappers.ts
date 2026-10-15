// Pemetaan baris Supabase → tipe domain. Fungsi murni (tanpa jaringan), ada unit test.

import { resolveAmenityIcon, resolveFacilityIcon, resolveIconName, resolveLandmarkIcon } from "@/lib/icons";
import { locationImageUrl, mediaUrl, unitPhotoUrls } from "@/lib/media";
import { effectivePrice } from "@/lib/pricing";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { ABOUT_KEYS, SETTING_KEYS, type AboutReason, type SiteSettings } from "@/types/settings";
import type {
  Amenity,
  CatalogUnit,
  Facility,
  Faq,
  Landmark,
  LocationWithTypes,
  Popularity,
  RoomCategory,
  RoomTypeSummary,
  UnitDetail,
} from "@/types/domain";

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

type SettingRow = { key: string; value: string | null };

function parseReasons(raw: string | null | undefined): AboutReason[] | null {
  if (!raw) return null;
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return null;
    const reasons = list
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        title: typeof item.title === "string" ? item.title.trim() : "",
        desc: typeof item.desc === "string" ? item.desc.trim() : "",
        icon: resolveIconName(typeof item.icon === "string" ? item.icon : null, "shield-check"),
      }))
      .filter((item) => item.title);
    return reasons.length ? reasons : null;
  } catch {
    return null;
  }
}

/** Baris tabel `settings` → objek bertipe. Nilai kosong memakai default, kecuali teks pengumuman (kosong = disembunyikan). */
export function mapSettings(rows: SettingRow[]): SiteSettings {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const text = (key: string, fallback: string) => {
    const value = byKey.get(key);
    return value && value.trim() ? value.trim() : fallback;
  };

  const settings: SiteSettings = structuredClone(DEFAULT_SETTINGS);
  for (const [dbKey, field] of Object.entries(SETTING_KEYS)) {
    if (field === "heroImage" || field === "siteLogo") {
      const value = byKey.get(dbKey);
      settings[field] = value && value.trim() ? value.trim() : null;
    } else if (field === "promoBannerText") {
      settings.promoBannerText = (byKey.get(dbKey) ?? DEFAULT_SETTINGS.promoBannerText ?? "").trim();
    } else {
      settings[field] = text(dbKey, DEFAULT_SETTINGS[field]);
    }
  }
  for (const [dbKey, field] of Object.entries(ABOUT_KEYS)) {
    settings.about[field] = text(dbKey, DEFAULT_SETTINGS.about[field]);
  }
  settings.about.reasons = parseReasons(byKey.get("about_reasons")) ?? DEFAULT_SETTINGS.about.reasons;
  return settings;
}

// ---------------------------------------------------------------------------
// Unit
// ---------------------------------------------------------------------------

const CATEGORIES: RoomCategory[] = ["studio", "1br", "2br", "3br", "other"];

function category(value: string | null | undefined): RoomCategory {
  return CATEGORIES.includes(value as RoomCategory) ? (value as RoomCategory) : "other";
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: string | null | undefined): string | null {
  return value && value.trim() ? value.trim() : null;
}

export type UnitRow = {
  id: number;
  slug: string;
  name: string;
  location_id: number;
  room_type_id: number | null;
  tower: string | null;
  floor_number: number | null;
  view_type: string | null;
  size_sqm: number | null;
  max_guests: number;
  normal_price: number;
  promo_price: number;
  is_promo_active: boolean;
  promo_badge: string | null;
  effective_price: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  is_featured: boolean;
  is_available: boolean;
  sort_order: number;
  main_image: string | null;
  gallery_images: unknown;
  created_at: string;
  updated_at: string;
  location: {
    id: number;
    slug: string;
    name: string;
    short_name: string | null;
    area: string | null;
    is_active?: boolean;
  } | null;
  room_type: { id: number; slug: string; name: string; category: string; is_active?: boolean } | null;
  unit_amenities: { amenity: AmenityRow | null }[] | null;
};

export type AmenityRow = { id: number; name: string; icon: string | null; sort_order: number; is_active: boolean };

export function mapAmenity(row: AmenityRow): Amenity {
  return {
    id: row.id,
    name: row.name.trim(),
    icon: resolveAmenityIcon(row.name, row.icon),
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export function mapCatalogUnit(row: UnitRow): CatalogUnit | null {
  if (!row.location) return null;
  const prices = {
    normal_price: num(row.normal_price),
    promo_price: num(row.promo_price),
    is_promo_active: Boolean(row.is_promo_active),
  };
  const amenities = (row.unit_amenities ?? [])
    .map((link) => link.amenity)
    .filter((a): a is AmenityRow => Boolean(a && a.is_active !== false))
    .map(mapAmenity)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const roomType = row.room_type && row.room_type.is_active !== false ? row.room_type : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name.trim(),
    locationId: row.location.id,
    locationSlug: row.location.slug,
    locationName: row.location.name,
    locationShortName: str(row.location.short_name) ?? row.location.name,
    locationArea: str(row.location.area),
    roomTypeId: roomType?.id ?? null,
    roomTypeSlug: roomType?.slug ?? null,
    roomTypeName: roomType?.name ?? null,
    category: category(roomType?.category),
    tower: str(row.tower),
    floorNumber: numOrNull(row.floor_number),
    viewType: str(row.view_type),
    sizeSqm: numOrNull(row.size_sqm),
    maxGuests: Math.max(1, num(row.max_guests)),
    normalPrice: prices.normal_price,
    promoPrice: prices.promo_price,
    isPromoActive: prices.is_promo_active,
    promoBadge: str(row.promo_badge),
    effectivePrice: numOrNull(row.effective_price) ?? effectivePrice(prices),
    weeklyPrice: numOrNull(row.weekly_price),
    monthlyPrice: numOrNull(row.monthly_price),
    isFeatured: Boolean(row.is_featured),
    isAvailable: Boolean(row.is_available),
    sortOrder: num(row.sort_order),
    photos: unitPhotoUrls({ main_image: row.main_image, gallery_images: row.gallery_images }),
    amenities,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type UnitDetailRow = Omit<UnitRow, "location"> & {
  description: string | null;
  youtube_video_url: string | null;
  location: {
    id: number;
    slug: string;
    name: string;
    short_name: string | null;
    area: string | null;
    address: string | null;
    gmaps_url: string | null;
    latitude: number | null;
    longitude: number | null;
    tagline: string | null;
    is_active?: boolean;
  } | null;
};

export function mapUnitDetail(row: UnitDetailRow): UnitDetail | null {
  const base = mapCatalogUnit(row);
  if (!base || !row.location) return null;
  return {
    ...base,
    description: str(row.description),
    youtubeUrl: str(row.youtube_video_url),
    location: {
      id: row.location.id,
      slug: row.location.slug,
      name: row.location.name,
      shortName: base.locationShortName,
      area: str(row.location.area),
      address: str(row.location.address),
      gmapsUrl: str(row.location.gmaps_url),
      latitude: numOrNull(row.location.latitude),
      longitude: numOrNull(row.location.longitude),
      tagline: str(row.location.tagline),
    },
  };
}

// ---------------------------------------------------------------------------
// Apartemen + tipe kamar
// ---------------------------------------------------------------------------

export type LocationRow = {
  id: number;
  slug: string;
  name: string;
  short_name: string | null;
  area: string | null;
  tagline: string | null;
  description: string | null;
  address: string | null;
  gmaps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  hero_image: string | null;
  sort_order: number;
  is_active: boolean;
  room_types: {
    id: number;
    slug: string;
    name: string;
    category: string;
    default_max_guests: number | null;
    sort_order: number;
    is_active: boolean;
  }[] | null;
};

function minOf(values: number[]): number | null {
  return values.length ? Math.min(...values) : null;
}

export function mapLocations(rows: LocationRow[], catalog: CatalogUnit[]): LocationWithTypes[] {
  return rows
    .filter((row) => row.is_active !== false)
    .map((row) => {
      const units = catalog.filter((u) => u.locationId === row.id);
      const available = units.filter((u) => u.isAvailable);
      const roomTypes: RoomTypeSummary[] = (row.room_types ?? [])
        .filter((t) => t.is_active !== false)
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
        .map((t) => {
          const typeUnits = units.filter((u) => u.roomTypeId === t.id);
          const typeAvailable = typeUnits.filter((u) => u.isAvailable);
          return {
            id: t.id,
            slug: t.slug,
            name: t.name,
            category: category(t.category),
            defaultMaxGuests: t.default_max_guests,
            sortOrder: t.sort_order,
            unitCount: typeUnits.length,
            availableCount: typeAvailable.length,
            minPrice: minOf(typeAvailable.map((u) => u.effectivePrice)),
          };
        });
      const prices = available.map((u) => u.effectivePrice);
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        shortName: str(row.short_name) ?? row.name,
        area: str(row.area),
        tagline: str(row.tagline),
        description: str(row.description),
        address: str(row.address),
        gmapsUrl: str(row.gmaps_url),
        latitude: numOrNull(row.latitude),
        longitude: numOrNull(row.longitude),
        imageUrl: locationImageUrl({ slug: row.slug, hero_image: row.hero_image }),
        sortOrder: row.sort_order,
        unitCount: units.length,
        availableCount: available.length,
        minPrice: minOf(prices),
        maxPrice: prices.length ? Math.max(...prices) : null,
        roomTypes,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

// ---------------------------------------------------------------------------
// Konten
// ---------------------------------------------------------------------------

export function mapFaq(row: { id: number; question: string; answer: string; sort_order: number }): Faq {
  return { id: row.id, question: row.question.trim(), answer: row.answer.trim(), sortOrder: row.sort_order };
}

export function mapLandmark(row: {
  id: number;
  location_id: number;
  name: string;
  distance_time: string;
  notes: string | null;
  icon: string | null;
  sort_order: number;
}): Landmark {
  return {
    id: row.id,
    locationId: row.location_id,
    name: row.name.trim(),
    distanceTime: row.distance_time.trim(),
    notes: str(row.notes),
    icon: resolveLandmarkIcon(row.name, row.icon),
    sortOrder: row.sort_order,
  };
}

export function mapFacility(row: {
  id: number;
  location_id: number;
  name: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  sort_order?: number | null;
}): Facility {
  return {
    id: row.id,
    locationId: row.location_id,
    name: row.name.trim(),
    description: str(row.description),
    icon: resolveFacilityIcon(row.name, row.icon),
    imageUrl: mediaUrl(row.image),
    sortOrder: num(row.sort_order ?? 0),
  };
}

export function mapPopularity(rows: { unit_id: number; lead_count: number | string }[] | null): Popularity {
  const result: Popularity = {};
  for (const row of rows ?? []) result[row.unit_id] = num(row.lead_count);
  return result;
}
