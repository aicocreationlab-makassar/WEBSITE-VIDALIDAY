// Mesin bot chat: analisis pesan (normalisasi → entitas → intent), memori slot percakapan, dan
// penyusunan jawaban (respond.ts). Berjalan di browser, tanpa API. Fungsi murni, ada test.

import { extractEntities, type Entities } from "./entities";
import { pickIntent, scoreIntents } from "./intents";
import { NON_SEARCH_INTENTS, type IntentName } from "./lexicon";
import { normalizeText, tokenize, type Budget } from "./normalize";
import { composeReply, type BotReply } from "./respond";
import type { ChatKnowledge, KnowledgeIndex } from "./types";
import type { RoomCategory } from "@/types/domain";

export type Slots = {
  apartment: string | null;
  category: RoomCategory | null;
  roomType: string | null;
  unit: string | null;
  budget: Budget | null;
  guests: number | null;
  nights: number | null;
};

export type ChatState = {
  slots: Slots;
  lastIntent: IntentName | null;
  turns: number;
};

export type Analysis = {
  intent: IntentName;
  score: number;
  entities: Entities;
  /** Pertanyaan terjawab dari data (bukan fallback). */
  matched: boolean;
  normalized: string;
};

export const EMPTY_SLOTS: Slots = {
  apartment: null,
  category: null,
  roomType: null,
  unit: null,
  budget: null,
  guests: null,
  nights: null,
};

export function createState(): ChatState {
  return { slots: { ...EMPTY_SLOTS }, lastIntent: null, turns: 0 };
}

export function analyze(input: string, state: ChatState, k: ChatKnowledge, idx: KnowledgeIndex): Analysis {
  const normalized = normalizeText(input);
  const tokens = tokenize(normalized);
  const entities = extractEntities(normalized, tokens, k, idx);
  const ranked = scoreIntents(tokens, normalized, entities);
  let { intent, score } = pickIntent(ranked, entities);
  if (intent === "followup") {
    intent = state.lastIntent && !NON_SEARCH_INTENTS.has(state.lastIntent) ? state.lastIntent : "availability";
    score = 0;
  }
  // Layanan yang tidak ada di data (antar-jemput, sarapan, refund, ...): jangan menebak dari kata lain
  // seperti "bandara"; serahkan ke admin, kecuali FAQ menjawabnya atau tamu menanyakan unit tertentu.
  if (entities.service && intent !== "reset" && intent !== "unit_detail" && !(entities.faq && entities.faq.score >= 0.6)) {
    intent = "service";
  }
  return { intent, score, entities, matched: intent !== "fallback" && intent !== "service", normalized };
}

/** Gabungkan entitas baru ke slot: yang disebut menimpa; ganti apartemen mengosongkan unit dan tipe. */
export function mergeSlots(prev: Slots, e: Entities, intent: IntentName): Slots {
  const next: Slots = { ...prev };
  if (e.allApartments) {
    next.apartment = null;
    next.unit = null;
    next.roomType = null;
  }
  if (e.apartment && e.apartment !== prev.apartment) {
    next.apartment = e.apartment;
    next.unit = null;
    next.roomType = null;
  }
  if (NON_SEARCH_INTENTS.has(intent)) return next;

  if (e.anyBudget) next.budget = null;
  if (e.unit) {
    next.unit = e.unit;
    next.apartment = e.apartment ?? next.apartment;
    next.category = e.category ?? next.category;
    next.roomType = e.roomType ?? next.roomType;
  } else if (e.roomType) {
    next.roomType = e.roomType;
    next.category = e.category ?? next.category;
    next.unit = null;
  } else if (e.category && e.category !== prev.category) {
    next.category = e.category;
    next.roomType = null;
    next.unit = null;
  }
  if (e.budget) next.budget = e.budget;
  if (e.guests) next.guests = e.guests;
  if (e.nights) next.nights = e.nights;
  return next;
}

export type ChatTurn = { reply: BotReply; state: ChatState; analysis: Analysis };

/** Satu giliran percakapan: pesan tamu → jawaban bot + state baru. */
export function respond(input: string, state: ChatState, k: ChatKnowledge, idx: KnowledgeIndex): ChatTurn {
  const analysis = analyze(input, state, k, idx);
  if (analysis.intent === "reset") {
    const fresh = createState();
    return { reply: composeReply("reset", analysis, fresh.slots, input, k, idx), state: fresh, analysis };
  }
  const slots = mergeSlots(state.slots, analysis.entities, analysis.intent);
  const reply = composeReply(analysis.intent, analysis, slots, input, k, idx);
  const remembered = NON_SEARCH_INTENTS.has(analysis.intent) || analysis.intent === "fallback" ? state.lastIntent : analysis.intent;
  return {
    reply,
    state: { slots, lastIntent: remembered, turns: state.turns + 1 },
    analysis,
  };
}

/** Jawaban pembuka saat sesi baru dimulai. */
export function greet(k: ChatKnowledge, idx: KnowledgeIndex): BotReply {
  const analysis: Analysis = {
    intent: "greeting",
    score: 0,
    normalized: "",
    matched: true,
    entities: {
      apartment: null,
      compare: false,
      category: null,
      roomType: null,
      unit: null,
      budget: null,
      guests: null,
      nights: null,
      amenities: [],
      facilities: [],
      landmarks: [],
      faq: null,
      landmarkAsked: false,
      service: null,
      dateMentioned: false,
      allApartments: false,
      anyBudget: false,
    },
  };
  return composeReply("greeting", analysis, { ...EMPTY_SLOTS }, "", k, idx);
}
