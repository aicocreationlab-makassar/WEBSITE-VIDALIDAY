// Pengenalan entitas dari teks tamu: apartemen, kategori/tipe kamar, kode unit, budget, tamu, malam,
// fasilitas kamar/gedung, landmark, dan FAQ. Alias apartemen digabung dari kamus statis dan nama di
// knowledge, jadi apartemen baru ikut dikenali. Fungsi murni, ada test.

import { AMENITY_RULES, FACILITY_RULES, LANDMARK_RULES } from "@/lib/icon-rules";
import type { IconName } from "@/lib/icons";
import type { RoomCategory } from "@/types/domain";
import { bestMatch, damerau, phraseSimilarity, tokenMatches } from "./fuzzy";
import { APARTMENT_ALIASES, CATEGORY_ALIASES, GENERIC_NAME_WORDS, SERVICE_TOPICS } from "./lexicon";
import {
  contentTokens,
  mentionsDate,
  normalizeText,
  parseGuests,
  parseNights,
  parseRupiah,
  squash,
  tokenize,
  type Budget,
  type Token,
} from "./normalize";
import type { ChatKnowledge, ChatLocation, ChatUnit, KnowledgeIndex } from "./types";

export type Entities = {
  /** slug apartemen */
  apartment: string | null;
  /** Dua apartemen disebut sekaligus. */
  compare: boolean;
  category: RoomCategory | null;
  /** slug tipe kamar */
  roomType: string | null;
  /** slug unit */
  unit: string | null;
  budget: Budget | null;
  guests: number | null;
  nights: number | null;
  /** id fasilitas kamar yang disebut */
  amenities: number[];
  facilities: number[];
  landmarks: number[];
  faq: { id: number; score: number } | null;
  /** Ada kata kategori tempat (bandara, mall, rumah sakit, ...) walau tempatnya tidak terdaftar. */
  landmarkAsked: boolean;
  /** Layanan di luar data situs yang ditanyakan (label), atau null. */
  service: string | null;
  dateMentioned: boolean;
  /** Kata "semua apartemen"/"keduanya": kosongkan slot apartemen. */
  allApartments: boolean;
  /** Kata "tanpa budget"/"semua harga": kosongkan slot budget. */
  anyBudget: boolean;
};

/** Ikon aturan amenity yang bukan fasilitas (kapasitas, pemandangan). */
const NOT_AMENITY_ICONS = new Set<IconName>(["users", "eye"]);

function aliasesFor(location: ChatLocation): string[] {
  const aliases = new Set<string>(APARTMENT_ALIASES[location.slug] ?? []);
  const words = location.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const meaningful = words.filter((word) => !GENERIC_NAME_WORDS.has(word));
  if (meaningful.length) aliases.add(meaningful[0]);
  aliases.add(squash(location.shortName));
  aliases.add(squash(meaningful.join(" ")));
  aliases.add(location.slug.replace(/-/g, ""));
  if (location.area) {
    const areaWords = location.area.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 5);
    for (const word of areaWords) aliases.add(word);
  }
  return [...aliases].filter((alias) => alias.length >= 2);
}

/** Apartemen yang disebut (urut kemunculan). */
export function detectApartments(tokens: readonly Token[], k: ChatKnowledge): string[] {
  const found: { slug: string; at: number }[] = [];
  const aliasTable = k.locations.map((location) => ({ slug: location.slug, aliases: aliasesFor(location) }));
  tokens.forEach((token, at) => {
    if (token.isNumber) return;
    for (const entry of aliasTable) {
      if (found.some((f) => f.slug === entry.slug)) continue;
      if (bestMatch(token.norm, entry.aliases)) found.push({ slug: entry.slug, at });
    }
  });
  return found.sort((a, b) => a.at - b.at).map((f) => f.slug);
}

function detectCategory(tokens: readonly Token[]): RoomCategory | null {
  for (const token of tokens) {
    for (const [category, aliases] of Object.entries(CATEGORY_ALIASES) as [RoomCategory, string[]][]) {
      if (aliases.some((alias) => token.norm === alias || (alias.length >= 5 && tokenMatches(token.norm, alias)))) return category;
    }
  }
  return null;
}

/** Tipe kamar dari nama ("studio corner", "studioplus"): slug tipe + apartemen pemiliknya (bila unik). */
function detectRoomType(
  text: string,
  k: ChatKnowledge,
  apartment: string | null,
): { roomType: string; category: RoomCategory; apartment: string | null } | null {
  const squashed = squash(text);
  const candidates: { roomType: string; category: RoomCategory; apartment: string; length: number }[] = [];
  for (const location of k.locations) {
    if (apartment && location.slug !== apartment) continue;
    for (const type of location.roomTypes) {
      const name = squash(type.name);
      // Nama tipe satu kata ("Studio") ditangani kategori; hanya nama majemuk yang dicocokkan di sini.
      if (name.length < 8 || /^\d?(studio|bedroom|br)$/.test(name)) continue;
      const compact = name.replace(/bedroom/g, "br");
      if (squashed.includes(name) || squashed.includes(compact)) {
        candidates.push({ roomType: type.slug, category: type.category, apartment: location.slug, length: name.length });
      }
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.length - a.length);
  const best = candidates[0];
  const owners = new Set(candidates.filter((c) => c.roomType === best.roomType).map((c) => c.apartment));
  return { roomType: best.roomType, category: best.category, apartment: owners.size === 1 ? best.apartment : null };
}

const UNIT_CODE = /\b(at|bv|tower)\s?-?(\d{1,2}\s?[a-z]?)\b/g;
const UNIT_NUMBER = /\b(studio|1br|2br|3br|studiocorner|studioplus|2brcorner|unit|kamar|no|nomor)\s*(\d{3,4})\b/g;

function pickUnit(matches: ChatUnit[]): ChatUnit | null {
  if (!matches.length) return null;
  return [...matches].sort((a, b) => Number(b.av) - Number(a.av) || a.name.length - b.name.length || a.id - b.id)[0];
}

/** Unit dari kode ("AT 26X", "bv19v"), nomor ("studio 1026"), atau nama lengkap. */
export function detectUnit(text: string, k: ChatKnowledge): ChatUnit | null {
  const names = k.units.map((unit) => ({ unit, squashed: squash(unit.name) }));
  const squashedText = squash(text);

  for (const match of text.matchAll(UNIT_CODE)) {
    if (match[1] === "tower") continue;
    const code = squash(`${match[1]}${match[2]}`);
    const hits = names.filter((entry) => entry.squashed.includes(code)).map((entry) => entry.unit);
    const picked = pickUnit(hits);
    if (picked) return picked;
  }
  for (const match of text.matchAll(UNIT_NUMBER)) {
    const digits = match[2];
    const hits = names.filter((entry) => entry.squashed.endsWith(digits)).map((entry) => entry.unit);
    const picked = pickUnit(hits);
    if (picked) return picked;
  }
  const byName = names
    .filter(
      (entry) =>
        entry.squashed.length >= 6 &&
        (squashedText.includes(entry.squashed) ||
          (squashedText.length <= entry.squashed.length + 4 && damerau(squashedText, entry.squashed, 1) <= 1)),
    )
    .map((entry) => entry.unit);
  return pickUnit(byName);
}

function iconsFromRules(text: string, rules: readonly [RegExp, IconName][], skip: ReadonlySet<IconName> = new Set()): Set<IconName> {
  const icons = new Set<IconName>();
  for (const [pattern, icon] of rules) {
    if (skip.has(icon)) continue;
    if (pattern.test(text)) icons.add(icon);
  }
  return icons;
}

function nameTokens(name: string): string[] {
  return name.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 2);
}

/** Nama cocok kalau frasa mirip, atau satu kata inti nama (≥ 4 huruf) muncul di token. */
function nameMentioned(name: string, tokens: readonly string[]): boolean {
  const words = nameTokens(name);
  if (!words.length) return false;
  const { score, shared } = phraseSimilarity(words, tokens);
  if (score >= 0.5 || (shared >= 2 && shared >= words.length - 1)) return true;
  return words.length === 1 && words[0].length >= 4 && tokens.some((token) => tokenMatches(token, words[0]));
}

export function extractEntities(text: string, tokens: readonly Token[], k: ChatKnowledge, idx: KnowledgeIndex): Entities {
  const content = contentTokens(tokens);
  const apartments = detectApartments(tokens, k);
  let apartment = apartments[0] ?? null;
  const compare = apartments.length > 1;

  const unit = detectUnit(text, k);
  let category = detectCategory(tokens);
  let roomType: string | null = null;
  const typed = detectRoomType(text, k, apartment);
  if (typed) {
    roomType = typed.roomType;
    category = typed.category;
    if (!apartment && typed.apartment) apartment = typed.apartment;
  }
  if (unit) {
    apartment = unit.l;
    category = unit.c;
    roomType = unit.t;
  }

  const amenityIcons = iconsFromRules(text, AMENITY_RULES, NOT_AMENITY_ICONS);
  const amenities = k.amenities
    .filter((amenity) => amenityIcons.has(amenity.icon) || nameMentioned(amenity.name, content))
    .map((amenity) => amenity.id);

  const facilityIcons = iconsFromRules(text, FACILITY_RULES, NOT_AMENITY_ICONS);
  const facilities = k.facilities
    .filter((facility) => !apartment || facility.locationId === idx.locationBySlug.get(apartment)?.id)
    .filter((facility) => facilityIcons.has(facility.icon) || nameMentioned(facility.name, content))
    .map((facility) => facility.id);

  const landmarkIcons = iconsFromRules(text, LANDMARK_RULES);
  const landmarks = k.landmarks
    .filter((landmark) => !apartment || landmark.locationId === idx.locationBySlug.get(apartment)?.id)
    .filter((landmark) => landmarkIcons.has(landmark.icon) || nameMentioned(landmark.name, content))
    .map((landmark) => landmark.id);

  // Pertanyaan FAQ dinormalkan dengan cara yang sama (check-in → checkin, apa saja → dibuang).
  let faq: Entities["faq"] = null;
  for (const item of k.faqs) {
    const { score, shared } = phraseSimilarity(content, contentTokens(tokenize(normalizeText(item.q))));
    const accepted = score >= 0.6 || (score >= 0.34 && shared >= 2);
    if (accepted && (!faq || score > faq.score)) faq = { id: item.id, score };
  }

  return {
    apartment,
    compare,
    category,
    roomType,
    unit: unit?.slug ?? null,
    budget: parseRupiah(text),
    guests: parseGuests(text),
    nights: parseNights(text),
    amenities,
    facilities,
    landmarks,
    faq,
    landmarkAsked: landmarkIcons.size > 0,
    service: SERVICE_TOPICS.find(([pattern]) => pattern.test(text))?.[1] ?? null,
    dateMentioned: mentionsDate(text),
    allApartments: /\b(semua apartemen|dua duanya|keduanya|dua dua nya|kedua apartemen)\b/.test(text),
    anyBudget: /\b(tanpa budget|semua harga|berapa aja|berapa saja)\b/.test(text),
  };
}
