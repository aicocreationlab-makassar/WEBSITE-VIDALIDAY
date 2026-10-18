// Katalog + konten situs → ChatKnowledge (fungsi murni, ada test). Dipanggil di server oleh
// lib/data/chat.ts; hasilnya di-cache dengan tag yang sama dengan halaman publik.

import { stripMarkdown } from "@/lib/format";
import { strikePrice } from "@/lib/pricing";
import { parseHouseRules } from "@/lib/unit-detail";
import type { Amenity, CatalogUnit, Facility, Faq, Landmark, LocationWithTypes } from "@/types/domain";
import type { SiteSettings } from "@/types/settings";
import type { ChatKnowledge, ChatLocation, ChatSettings, ChatUnit } from "./types";

export type KnowledgeInput = {
  catalog: CatalogUnit[];
  locations: LocationWithTypes[];
  amenities: Amenity[];
  facilities: Facility[];
  landmarks: Landmark[];
  faqs: Faq[];
  settings: SiteSettings;
};

export function toChatUnit(unit: CatalogUnit): ChatUnit {
  const prices = { normal_price: unit.normalPrice, promo_price: unit.promoPrice, is_promo_active: unit.isPromoActive };
  return {
    id: unit.id,
    slug: unit.slug,
    name: unit.name,
    l: unit.locationSlug,
    t: unit.roomTypeSlug,
    c: unit.category,
    p: unit.effectivePrice,
    np: unit.normalPrice,
    promo: strikePrice(prices) !== null,
    w: unit.weeklyPrice,
    m: unit.monthlyPrice,
    g: unit.maxGuests,
    av: unit.isAvailable,
    a: unit.amenities.map((amenity) => amenity.id),
    tower: unit.tower,
    floor: unit.floorNumber,
    view: unit.viewType,
    size: unit.sizeSqm,
    photo: unit.photos[0] ?? null,
    featured: unit.isFeatured,
    sort: unit.sortOrder,
  };
}

export function toChatLocation(location: LocationWithTypes): ChatLocation {
  return {
    id: location.id,
    slug: location.slug,
    name: location.name,
    shortName: location.shortName,
    area: location.area,
    address: location.address,
    gmapsUrl: location.gmapsUrl,
    lat: location.latitude,
    lng: location.longitude,
    unitCount: location.unitCount,
    availableCount: location.availableCount,
    minPrice: location.minPrice,
    roomTypes: location.roomTypes.map((type) => ({
      slug: type.slug,
      name: type.name,
      category: type.category,
      unitCount: type.unitCount,
      availableCount: type.availableCount,
      minPrice: type.minPrice,
      defaultMaxGuests: type.defaultMaxGuests,
    })),
  };
}

export function settingsSubset(settings: SiteSettings): ChatSettings {
  return {
    whatsappNumber: settings.whatsappNumber,
    contactPhone: settings.contactPhone,
    contactEmail: settings.contactEmail,
    officeHours: settings.officeHours,
    checkinTime: settings.checkinTime,
    checkoutTime: settings.checkoutTime,
    checkinRequirements: stripMarkdown(settings.checkinRequirements).trim(),
    houseRules: parseHouseRules(settings.houseRules).map((rule) => rule.text),
  };
}

export function toChatKnowledge(input: KnowledgeInput): ChatKnowledge {
  const listed = new Set(input.locations.map((location) => location.slug));
  return {
    v: 1,
    units: input.catalog.filter((unit) => listed.has(unit.locationSlug)).map(toChatUnit),
    locations: input.locations.map(toChatLocation),
    amenities: input.amenities.map((amenity) => ({ id: amenity.id, name: amenity.name, icon: amenity.icon })),
    facilities: input.facilities.map((facility) => ({
      id: facility.id,
      locationId: facility.locationId,
      name: facility.name,
      icon: facility.icon,
      desc: facility.description ? stripMarkdown(facility.description).trim() || null : null,
    })),
    landmarks: input.landmarks.map((landmark) => ({
      id: landmark.id,
      locationId: landmark.locationId,
      name: landmark.name,
      distanceTime: landmark.distanceTime,
      notes: landmark.notes,
      icon: landmark.icon,
    })),
    faqs: input.faqs.map((faq) => ({ id: faq.id, q: faq.question, a: stripMarkdown(faq.answer).trim() })),
    settings: settingsSubset(input.settings),
  };
}
