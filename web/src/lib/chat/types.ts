// Kontrak data bot chat "Asisten VIDALIDAY" (PRD 6.11): irisan kecil katalog + konten situs yang
// dikirim ke klien lewat GET /chat-data dan dipakai mesin jawaban di browser. Tanpa API eksternal.

import type { IconName } from "@/lib/icons";
import type { RoomCategory } from "@/types/domain";

/** Unit published di apartemen aktif, dipadatkan (nama field pendek seperti SearchIndexRow). */
export type ChatUnit = {
  id: number;
  slug: string;
  name: string;
  /** slug apartemen */
  l: string;
  /** slug tipe kamar */
  t: string | null;
  c: RoomCategory;
  /** harga efektif per malam */
  p: number;
  /** harga normal (dicoret kalau promo) */
  np: number;
  promo: boolean;
  /** harga mingguan / bulanan */
  w: number | null;
  m: number | null;
  /** kapasitas tamu */
  g: number;
  /** tersedia */
  av: boolean;
  /** id fasilitas kamar */
  a: number[];
  tower: string | null;
  floor: number | null;
  view: string | null;
  size: number | null;
  /** URL foto sampul */
  photo: string | null;
  featured: boolean;
  sort: number;
};

export type ChatRoomType = {
  slug: string;
  name: string;
  category: RoomCategory;
  unitCount: number;
  availableCount: number;
  minPrice: number | null;
  defaultMaxGuests: number | null;
};

export type ChatLocation = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  area: string | null;
  address: string | null;
  gmapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  unitCount: number;
  availableCount: number;
  minPrice: number | null;
  roomTypes: ChatRoomType[];
};

export type ChatAmenity = { id: number; name: string; icon: IconName };
export type ChatFacility = { id: number; locationId: number; name: string; icon: IconName; desc: string | null };
export type ChatLandmark = {
  id: number;
  locationId: number;
  name: string;
  distanceTime: string;
  notes: string | null;
  icon: IconName;
};
export type ChatFaq = { id: number; q: string; a: string };

export type ChatSettings = {
  whatsappNumber: string;
  contactPhone: string;
  contactEmail: string;
  officeHours: string;
  checkinTime: string;
  checkoutTime: string;
  checkinRequirements: string;
  houseRules: string[];
};

export type ChatKnowledge = {
  v: 1;
  units: ChatUnit[];
  locations: ChatLocation[];
  amenities: ChatAmenity[];
  facilities: ChatFacility[];
  landmarks: ChatLandmark[];
  faqs: ChatFaq[];
  settings: ChatSettings;
};

/** Indeks pencarian cepat, dihitung sekali per muatan di klien. */
export type KnowledgeIndex = {
  unitBySlug: Map<string, ChatUnit>;
  unitById: Map<number, ChatUnit>;
  locationBySlug: Map<string, ChatLocation>;
  locationById: Map<number, ChatLocation>;
  amenityById: Map<number, ChatAmenity>;
};

export function indexKnowledge(k: ChatKnowledge): KnowledgeIndex {
  return {
    unitBySlug: new Map(k.units.map((unit) => [unit.slug, unit])),
    unitById: new Map(k.units.map((unit) => [unit.id, unit])),
    locationBySlug: new Map(k.locations.map((location) => [location.slug, location])),
    locationById: new Map(k.locations.map((location) => [location.id, location])),
    amenityById: new Map(k.amenities.map((amenity) => [amenity.id, amenity])),
  };
}

export const EMPTY_SETTINGS: ChatSettings = {
  whatsappNumber: "",
  contactPhone: "",
  contactEmail: "",
  officeHours: "",
  checkinTime: "",
  checkoutTime: "",
  checkinRequirements: "",
  houseRules: [],
};

export const EMPTY_KNOWLEDGE: ChatKnowledge = {
  v: 1,
  units: [],
  locations: [],
  amenities: [],
  facilities: [],
  landmarks: [],
  faqs: [],
  settings: EMPTY_SETTINGS,
};
