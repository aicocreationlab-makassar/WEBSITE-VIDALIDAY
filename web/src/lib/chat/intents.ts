// Penentuan maksud (intent) dari token + entitas: tiap kata pemicu menyumbang bobotnya (cocok fuzzy),
// pola kalimat menambah bobot, entitas memberi bonus. Pemenang = skor tertinggi, seri diputus
// INTENT_PRIORITY. Fungsi murni, ada test (lewat engine.test.ts).

import type { Entities } from "./entities";
import { tokenMatches } from "./fuzzy";
import { INTENT_CUES, INTENT_PRIORITY, type IntentName } from "./lexicon";
import type { Token } from "./normalize";

export type IntentScore = { intent: IntentName; score: number };

const MIN_SCORE = 2;
const ESTIMATE_CUE = /\b(total|totalnya|berapa|harga|biaya|habis|kena|estimasi)\b/;

function cueScore(intent: IntentName, tokens: readonly Token[], text: string): number {
  const cue = INTENT_CUES[intent];
  if (!cue) return 0;
  let score = 0;
  for (const [word, weight] of Object.entries(cue.tokens)) {
    if (tokens.some((token) => tokenMatches(token.norm, word))) score += weight;
  }
  for (const [pattern, weight] of cue.phrases ?? []) {
    if (pattern.test(text)) score += weight;
  }
  return score;
}

/** Skor semua intent (urut turun). */
export function scoreIntents(tokens: readonly Token[], text: string, entities: Entities): IntentScore[] {
  const scores = new Map<IntentName, number>();
  for (const intent of INTENT_PRIORITY) scores.set(intent, cueScore(intent, tokens, text));
  const bump = (intent: IntentName, by: number) => scores.set(intent, (scores.get(intent) ?? 0) + by);

  if (entities.unit) bump("unit_detail", 4);
  if (entities.nights && ESTIMATE_CUE.test(text)) bump("stay_estimate", 3);
  if (entities.nights && entities.nights >= 30) bump("monthly", 1);
  if (entities.guests) {
    bump("availability", 1);
    bump("capacity", 1);
  }
  if (entities.budget) bump("price", 1);
  if (entities.amenities.length) bump("amenities", 3);
  if (entities.facilities.length) bump("facilities", 2);
  if (entities.landmarks.length) bump("landmarks", 2);
  if (entities.dateMentioned) bump("availability", 2);
  if (entities.faq) bump("faq", Math.round(entities.faq.score * 4 * 10) / 10);

  // Sapaan hanya menang untuk pesan pendek atau tanpa maksud lain.
  const others = [...scores.entries()].filter(([intent]) => intent !== "greeting" && intent !== "thanks");
  const strongest = Math.max(0, ...others.map(([, score]) => score));
  if (tokens.length > 3 && strongest >= MIN_SCORE) {
    scores.set("greeting", 0);
    scores.set("thanks", 0);
  }

  return [...scores.entries()]
    .map(([intent, score]) => ({ intent, score }))
    .sort((a, b) => b.score - a.score || INTENT_PRIORITY.indexOf(a.intent) - INTENT_PRIORITY.indexOf(b.intent));
}

function hasSearchEntity(entities: Entities): boolean {
  return Boolean(
    entities.apartment || entities.category || entities.roomType || entities.guests || entities.budget || entities.nights,
  );
}

/** Intent terpilih: pemenang bila skornya cukup; hanya entitas → followup; selain itu fallback. */
export function pickIntent(ranked: IntentScore[], entities: Entities): IntentScore {
  const [best, second] = ranked;
  if (best && best.score >= MIN_SCORE) {
    // Harga vs ketersediaan seri: angka budget menandakan harga.
    if (second && second.score === best.score) {
      const pair = new Set([best.intent, second.intent]);
      if (pair.has("price") && pair.has("availability")) {
        return { intent: entities.budget ? "price" : "availability", score: best.score };
      }
    }
    return best;
  }
  if (hasSearchEntity(entities)) return { intent: "followup", score: 0 };
  return { intent: "fallback", score: 0 };
}
