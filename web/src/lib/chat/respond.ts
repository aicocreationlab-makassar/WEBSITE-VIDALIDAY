// Penyusunan jawaban bot (Bahasa Indonesia, sapaan "kamu", tanpa emoji). Semua angka berasal dari
// knowledge; pemilihan unit memakai matchesRow yang sama dengan /sewa supaya hitungannya sama.
// Fungsi murni, ada test (engine.test.ts).

import { formatOfficeHours, formatRupiah, formatRupiahShort, formatWhatsappDisplay } from "@/lib/format";
import { mapExternalUrl } from "@/lib/gmaps";
import { discountPercent, estimateTotal, type RateKind } from "@/lib/pricing";
import { matchesRow, type FilterKey } from "@/lib/search-index";
import { formatUnitPlace, unitHref } from "@/lib/unit-display";
import { sewaHref, type SewaFilter } from "@/lib/validation/filters";
import type { SearchIndexRow } from "@/types/domain";
import type { Analysis, Slots } from "./engine";
import { CATEGORY_LABEL, type IntentName } from "./lexicon";
import type { ChatKnowledge, ChatLocation, ChatUnit, KnowledgeIndex } from "./types";

export type ReplyBlock =
  | { type: "text"; text: string }
  | { type: "list"; items: string[] }
  | { type: "units"; slugs: string[]; moreHref?: { href: string; label: string } }
  | { type: "link"; href: string; label: string; external?: boolean };

export type Chip = { label: string; send: string };

export type BotReply = {
  blocks: ReplyBlock[];
  chips: Chip[];
  /** Tombol WhatsApp ke admin dengan pertanyaan yang sudah diisi. */
  handoff?: { text: string };
};

export const BOT_NAME = "Asisten VIDALIDAY";
const MAX_CARDS = 3;
const MAX_LIST = 6;
const HANDOFF_PREFIX = "Halo Admin VIDALIDAY, saya mau tanya";
const RATE_LABEL: Record<RateKind, string> = { harian: "tarif harian", mingguan: "tarif mingguan", bulanan: "tarif bulanan" };

// ---------------------------------------------------------------------------
// Pemilihan unit
// ---------------------------------------------------------------------------

type Selection = {
  units: ChatUnit[];
  available: ChatUnit[];
  /** Filter dilonggarkan (tidak ada yang persis cocok). */
  relaxed: boolean;
  /** Grup filter yang diabaikan supaya ada hasil. */
  relaxedKeys: FilterKey[];
  filter: SearchFilter;
};

type SearchFilter = Pick<SewaFilter, "lokasi" | "tipe" | "kategori" | "min" | "max" | "tamu" | "fasilitas" | "penuh">;

const RELAX_STEPS: FilterKey[][] = [[], ["harga"], ["harga", "tipe", "kategori"], ["harga", "tipe", "kategori", "tamu"]];

function toRow(unit: ChatUnit): SearchIndexRow {
  return { id: unit.id, l: unit.l, t: unit.t, c: unit.c, p: unit.p, g: unit.g, a: unit.a, av: unit.av };
}

function byAvailabilityThenPrice(a: ChatUnit, b: ChatUnit): number {
  return Number(b.av) - Number(a.av) || a.p - b.p || a.sort - b.sort || a.id - b.id;
}

function toFilter(slots: Slots, amenities: number[] = []): SearchFilter {
  return {
    lokasi: slots.apartment,
    tipe: slots.apartment ? slots.roomType : null,
    kategori: slots.category && slots.category !== "other" ? slots.category : null,
    min: slots.budget?.min ?? null,
    max: slots.budget?.max ?? null,
    tamu: slots.guests,
    fasilitas: amenities,
    penuh: true,
  };
}

/** Unit yang cocok dengan slot (longgarkan bertahap kalau kosong), urut tersedia → termurah. */
export function selectUnits(k: ChatKnowledge, slots: Slots, amenities: number[] = []): Selection {
  const filter = toFilter(slots, amenities);
  for (const ignore of RELAX_STEPS) {
    const units = k.units.filter((unit) => matchesRow(toRow(unit), filter, ignore)).sort(byAvailabilityThenPrice);
    if (units.length) {
      return { units, available: units.filter((unit) => unit.av), relaxed: ignore.length > 0, relaxedKeys: ignore, filter };
    }
  }
  return { units: [], available: [], relaxed: true, relaxedKeys: RELAX_STEPS[RELAX_STEPS.length - 1], filter };
}

/** Tipe/kategori yang diminta tidak ada sama sekali di apartemen itu (bukan sekadar harga/tamu tidak pas). */
function typeMissing(selection: Selection, slots: Slots): boolean {
  return Boolean((slots.category || slots.roomType) && (selection.relaxedKeys.includes("kategori") || !selection.units.length));
}

function unitsBlock(selection: Selection): ReplyBlock | null {
  const pool = selection.available.length ? selection.available : selection.units;
  if (!pool.length) return null;
  const block: ReplyBlock = { type: "units", slugs: pool.slice(0, MAX_CARDS).map((unit) => unit.slug) };
  if (pool.length > MAX_CARDS) {
    block.moreHref = {
      href: sewaHref({ ...selection.filter, penuh: !selection.available.length }),
      label: `Lihat semua ${pool.length} unit`,
    };
  }
  return block;
}

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

function locationOf(slug: string | null, idx: KnowledgeIndex): ChatLocation | null {
  return slug ? (idx.locationBySlug.get(slug) ?? null) : null;
}

function roomTypeName(slots: Slots, k: ChatKnowledge): string | null {
  if (!slots.roomType) return null;
  for (const location of k.locations) {
    if (slots.apartment && location.slug !== slots.apartment) continue;
    const type = location.roomTypes.find((item) => item.slug === slots.roomType);
    if (type) return type.name;
  }
  return null;
}

function typeLabel(slots: Slots, k: ChatKnowledge): string {
  return roomTypeName(slots, k) ?? (slots.category ? CATEGORY_LABEL[slots.category] : "Unit");
}

function placeLabel(slots: Slots, idx: KnowledgeIndex): string {
  const location = locationOf(slots.apartment, idx);
  return location ? `di ${location.shortName}` : "di VIDALIDAY";
}

function unitPlace(unit: ChatUnit, idx: KnowledgeIndex): string {
  const location = idx.locationBySlug.get(unit.l);
  return formatUnitPlace({
    locationShortName: location?.shortName ?? unit.l,
    locationArea: location?.area ?? null,
    tower: unit.tower,
    floorNumber: unit.floor,
  });
}

function countSentence(selection: Selection): string {
  const total = selection.units.length;
  const available = selection.available.length;
  if (!total) return "Belum ada unit yang cocok di data situs saat ini.";
  if (!available) return `Saat ini ${total} unit yang cocok semuanya ditandai penuh.`;
  const full = total - available;
  return `Saat ini ${available} unit ditandai tersedia${full ? `, ${full} lagi penuh` : ""}.`;
}

function minPrice(units: ChatUnit[]): number | null {
  return units.length ? Math.min(...units.map((unit) => unit.p)) : null;
}

function text(value: string): ReplyBlock {
  return { type: "text", text: value };
}

function list(items: string[]): ReplyBlock {
  return { type: "list", items };
}

function link(href: string, label: string, external = false): ReplyBlock {
  return { type: "link", href, label, external };
}

function apartmentPath(slug: string): string {
  return `/apartemen/${encodeURIComponent(slug)}`;
}

// ---------------------------------------------------------------------------
// Chip lanjutan
// ---------------------------------------------------------------------------

function otherApartment(slots: Slots, k: ChatKnowledge): ChatLocation | null {
  return k.locations.find((location) => location.slug !== slots.apartment) ?? null;
}

function helpChips(k: ChatKnowledge): Chip[] {
  const first = k.locations[0];
  const second = k.locations[1] ?? first;
  const chips: Chip[] = [{ label: "Harga studio", send: "Harga studio berapa?" }, { label: "Unit untuk 4 orang", send: "Ada unit untuk 4 orang?" }];
  if (first) chips.push({ label: `Tipe di ${first.shortName}`, send: `Tipe kamar apa saja di ${first.shortName}?` });
  chips.push({ label: "Jam check-in", send: "Check-in jam berapa?" });
  if (second) chips.push({ label: `Lokasi ${second.shortName}`, send: `Alamat ${second.shortName} di mana?` });
  return chips;
}

function searchChips(slots: Slots, k: ChatKnowledge, idx: KnowledgeIndex): Chip[] {
  const chips: Chip[] = [];
  const type = typeLabel(slots, k);
  const other = otherApartment(slots, k);
  chips.push({ label: "Yang bulanan?", send: `Ada harga bulanan untuk ${type.toLowerCase()} ${placeLabel(slots, idx)}?` });
  chips.push({ label: "Muat berapa orang?", send: `${type} ${placeLabel(slots, idx)} muat berapa orang?` });
  if (other) chips.push({ label: `Cek di ${other.shortName}`, send: `Yang di ${other.shortName}?` });
  chips.push({ label: "Ada promo?", send: "Ada promo apa saja?" });
  return chips;
}

function handoffChip(question: string): Chip {
  return { label: "Tanya admin", send: question };
}

// ---------------------------------------------------------------------------
// Pesan WhatsApp ke admin
// ---------------------------------------------------------------------------

/** "Halo Admin VIDALIDAY, saya mau tanya soal Studio di Vida View: <pertanyaan>" (maks. 300 karakter). */
export function handoffMessage(question: string, slots: Slots, k: ChatKnowledge, idx: KnowledgeIndex): string {
  const unit = slots.unit ? idx.unitBySlug.get(slots.unit) : null;
  const location = locationOf(slots.apartment, idx);
  let subject = "";
  if (unit) subject = ` soal unit ${unit.name}`;
  else if (slots.category || slots.roomType) subject = ` soal ${typeLabel(slots, k)}${location ? ` di ${location.shortName}` : ""}`;
  else if (location) subject = ` soal ${location.shortName}`;
  const clean = question.replace(/\s+/g, " ").trim().slice(0, 300);
  return `${HANDOFF_PREFIX}${subject}: ${clean}`;
}

// ---------------------------------------------------------------------------
// Jawaban per intent
// ---------------------------------------------------------------------------

type Ctx = { analysis: Analysis; slots: Slots; input: string; k: ChatKnowledge; idx: KnowledgeIndex };

function replyPrice({ slots, k, idx, analysis }: Ctx): BotReply {
  const blocks: ReplyBlock[] = [];
  const selection = selectUnits(k, slots);
  const type = typeLabel(slots, k);
  const location = locationOf(slots.apartment, idx);

  if (typeMissing(selection, slots)) {
    blocks.push(text(`Belum ada ${type.toLowerCase()} ${placeLabel(slots, idx)} yang tercantum di situs saat ini.`));
    return withAlternatives(blocks, slots, k, idx);
  }
  if (!selection.units.length) {
    blocks.push(text(`Belum ada unit ${placeLabel(slots, idx)} yang tercantum di situs saat ini.`));
    return withAlternatives(blocks, slots, k, idx);
  }

  const exact = !selection.relaxed;
  const cheapest = minPrice(selection.available.length ? selection.available : selection.units);
  if (exact) {
    blocks.push(
      text(
        `${type} ${placeLabel(slots, idx)} mulai ${formatRupiah(cheapest ?? 0)}/malam. ${countSentence(selection)}`,
      ),
    );
  } else {
    blocks.push(text(`${type} ${placeLabel(slots, idx)} belum ada yang persis cocok. Yang paling mendekati, mulai ${formatRupiah(cheapest ?? 0)}/malam:`));
  }
  if (slots.budget?.max && selection.relaxed) {
    blocks.push(text(`Budget sampai ${formatRupiahShort(slots.budget.max)} belum cukup untuk pilihan ini; harga di bawahnya belum ada.`));
  }
  const cards = unitsBlock(selection);
  if (cards) blocks.push(cards);
  if (analysis.entities.compare && location) {
    const other = otherApartment(slots, k);
    if (other) {
      const otherSel = selectUnits(k, { ...slots, apartment: other.slug, roomType: null, unit: null });
      const otherMin = minPrice(otherSel.available.length ? otherSel.available : otherSel.units);
      if (otherMin !== null) blocks.push(text(`Di ${other.shortName}: ${type.toLowerCase()} mulai ${formatRupiah(otherMin)}/malam (${otherSel.available.length} tersedia).`));
    }
  }
  return { blocks, chips: searchChips(slots, k, idx) };
}

/** Saat tipe tidak ada di apartemen itu: sebut tipe yang ada, lalu tawarkan apartemen lain. */
function withAlternatives(blocks: ReplyBlock[], slots: Slots, k: ChatKnowledge, idx: KnowledgeIndex): BotReply {
  const location = locationOf(slots.apartment, idx);
  if (location) {
    const types = location.roomTypes.filter((type) => type.unitCount > 0);
    if (types.length) {
      blocks.push(
        text(
          `Tipe yang ada di ${location.shortName}: ${types
            .map((type) => `${type.name} (${type.availableCount} tersedia${type.minPrice ? `, mulai ${formatRupiahShort(type.minPrice)}` : ""})`)
            .join(", ")}.`,
        ),
      );
    }
  }
  const other = otherApartment(slots, k);
  if (other && (slots.category || slots.roomType)) {
    const otherSel = selectUnits(k, { ...slots, apartment: other.slug, roomType: null, unit: null });
    if (!otherSel.relaxed && otherSel.units.length) {
      const cheapest = minPrice(otherSel.available.length ? otherSel.available : otherSel.units);
      blocks.push(text(`${typeLabel(slots, k)} ada di ${other.shortName} mulai ${formatRupiah(cheapest ?? 0)}/malam.`));
      const cards = unitsBlock(otherSel);
      if (cards) blocks.push(cards);
    }
  }
  return { blocks, chips: searchChips(slots, k, idx) };
}

function dateGuard(analysis: Analysis, input: string, slots: Slots, k: ChatKnowledge, idx: KnowledgeIndex): { block: ReplyBlock; chip: Chip; handoff: { text: string } } | null {
  if (!analysis.entities.dateMentioned) return null;
  return {
    block: text("Status tersedia mengikuti data situs saat ini. Untuk tanggal yang kamu mau, konfirmasi dulu ke admin ya."),
    chip: { label: "Tanya tanggal ke admin", send: input },
    handoff: { text: handoffMessage(input, slots, k, idx) },
  };
}

function replyAvailability(ctx: Ctx): BotReply {
  const { slots, k, idx, analysis, input } = ctx;
  const selection = selectUnits(k, slots, analysis.entities.amenities);
  const blocks: ReplyBlock[] = [];
  const parts: string[] = [];
  if (slots.guests) parts.push(`untuk ${slots.guests} orang`);
  if (slots.budget?.max) parts.push(`dengan budget sampai ${formatRupiahShort(slots.budget.max)}`);
  if (slots.budget?.min && !slots.budget.max) parts.push(`mulai ${formatRupiahShort(slots.budget.min)}`);
  const type = slots.category || slots.roomType ? typeLabel(slots, k) : "Unit";
  const scope = `${type} ${placeLabel(slots, idx)}${parts.length ? ` ${parts.join(" ")}` : ""}`;

  if (typeMissing(selection, slots)) {
    blocks.push(text(`Belum ada ${type.toLowerCase()} ${placeLabel(slots, idx)} yang tercantum di situs saat ini.`));
    return withAlternatives(blocks, slots, k, idx);
  }
  if (!selection.units.length) {
    blocks.push(text(`${scope} belum ada di data situs saat ini.`));
  } else if (selection.relaxed) {
    blocks.push(text(`${scope} belum ada yang persis cocok. Yang paling mendekati:`));
  } else if (!selection.available.length) {
    blocks.push(text(`${scope}: ${countSentence(selection)} Admin biasanya punya info unit yang akan kosong.`));
  } else {
    blocks.push(
      text(`${scope}: ${selection.available.length} unit saat ini ditandai tersedia, mulai ${formatRupiah(minPrice(selection.available) ?? 0)}/malam.`),
    );
  }
  const cards = unitsBlock(selection);
  if (cards) blocks.push(cards);

  const guard = dateGuard(analysis, input, slots, k, idx);
  const chips = searchChips(slots, k, idx);
  if (guard) {
    blocks.push(guard.block);
    return { blocks, chips: [guard.chip, ...chips], handoff: guard.handoff };
  }
  if (!selection.available.length) {
    const question = `Apakah ada ${type.toLowerCase()} ${placeLabel(slots, idx)} yang tersedia${parts.length ? ` ${parts.join(" ")}` : ""}?`;
    return { blocks, chips: [handoffChip(question), ...chips], handoff: { text: handoffMessage(question, slots, k, idx) } };
  }
  return { blocks, chips };
}

function replyTypeList({ slots, k }: Ctx): BotReply {
  const blocks: ReplyBlock[] = [];
  const locations = slots.apartment ? k.locations.filter((location) => location.slug === slots.apartment) : k.locations;
  for (const location of locations) {
    const types = location.roomTypes.filter((type) => type.unitCount > 0);
    if (!types.length) continue;
    blocks.push(text(`Tipe di ${location.shortName}:`));
    blocks.push(
      list(
        types.map(
          (type) =>
            `${type.name}: ${type.availableCount} dari ${type.unitCount} unit tersedia${type.minPrice ? `, mulai ${formatRupiahShort(type.minPrice)}/malam` : ""}`,
        ),
      ),
    );
    blocks.push(link(apartmentPath(location.slug), `Profil ${location.shortName}`));
  }
  if (!blocks.length) blocks.push(text("Belum ada tipe kamar yang tercantum di situs saat ini."));
  const chips: Chip[] = k.locations
    .slice(0, 2)
    .map((location) => ({ label: `Harga studio ${location.shortName}`, send: `Harga studio di ${location.shortName}?` }));
  chips.push({ label: "Unit untuk 4 orang", send: "Ada unit untuk 4 orang?" });
  return { blocks, chips };
}

function replyUnitDetail(ctx: Ctx): BotReply {
  const { slots, k, idx } = ctx;
  const unit = slots.unit ? idx.unitBySlug.get(slots.unit) : null;
  if (!unit) return replyAvailability(ctx);
  const prices = { normal_price: unit.np, promo_price: unit.promo ? unit.p : 0, is_promo_active: unit.promo };
  const discount = unit.promo ? discountPercent(prices) : 0;
  const facts: string[] = [];
  facts.push(`${formatRupiah(unit.p)}/malam${unit.promo ? ` (normal ${formatRupiah(unit.np)}${discount ? `, hemat ${discount}%` : ""})` : ""}`);
  facts.push(unitPlace(unit, idx));
  facts.push(`Maks. ${unit.g} tamu`);
  if (unit.size) facts.push(`${unit.size} m²`);
  if (unit.view) facts.push(`View ${unit.view}`);
  const amenityNames = unit.a.map((id) => idx.amenityById.get(id)?.name).filter((name): name is string => Boolean(name));
  if (amenityNames.length) facts.push(`${amenityNames.slice(0, 5).join(", ")}${amenityNames.length > 5 ? `, +${amenityNames.length - 5} lainnya` : ""}`);
  if (unit.w) facts.push(`Mingguan ${formatRupiah(unit.w)}`);
  if (unit.m) facts.push(`Bulanan ${formatRupiah(unit.m)}`);
  facts.push(unit.av ? "Saat ini ditandai tersedia" : "Saat ini ditandai penuh");
  const blocks: ReplyBlock[] = [text(`${unit.name}:`), list(facts), { type: "units", slugs: [unit.slug] }, link(unitHref(unit.slug), "Lihat unit dan sewa")];
  const guard = dateGuard(ctx.analysis, ctx.input, slots, k, idx);
  if (guard) {
    blocks.push(guard.block);
    return { blocks, chips: [guard.chip, { label: "Unit serupa", send: `${typeLabel(slots, k)} lain ${placeLabel(slots, idx)}?` }], handoff: guard.handoff };
  }
  const chips: Chip[] = [
    { label: "Unit serupa", send: `${typeLabel(slots, k)} lain ${placeLabel(slots, idx)}?` },
    { label: "Fasilitas gedung", send: `Fasilitas gedung ${placeLabel(slots, idx)} apa saja?` },
    handoffChip(`Apakah unit ${unit.name} bisa disewa?`),
  ];
  return { blocks, chips, handoff: { text: handoffMessage(`Apakah unit ${unit.name} bisa disewa?`, slots, k, idx) } };
}

function replyCapacity(ctx: Ctx): BotReply {
  const { slots, k, idx } = ctx;
  const unit = slots.unit ? idx.unitBySlug.get(slots.unit) : null;
  if (unit) {
    return {
      blocks: [text(`${unit.name} untuk maksimal ${unit.g} tamu.`), { type: "units", slugs: [unit.slug] }],
      chips: [{ label: "Unit lebih besar", send: `Ada unit untuk ${unit.g + 1} orang ${placeLabel(slots, idx)}?` }],
    };
  }
  const selection = selectUnits(k, { ...slots, guests: null });
  if (!selection.units.length) return replyAvailability(ctx);
  const max = Math.max(...selection.units.map((item) => item.g));
  const min = Math.min(...selection.units.map((item) => item.g));
  const type = typeLabel(slots, k);
  const blocks: ReplyBlock[] = [
    text(min === max ? `${type} ${placeLabel(slots, idx)} muat maksimal ${max} tamu.` : `${type} ${placeLabel(slots, idx)} muat ${min} sampai ${max} tamu, tergantung unitnya.`),
  ];
  if (slots.guests) {
    const fit = selectUnits(k, slots);
    blocks.push(text(fit.relaxed || !fit.units.length ? `Untuk ${slots.guests} orang belum ada yang pas; yang paling mendekati:` : `Untuk ${slots.guests} orang, ${fit.available.length} unit tersedia:`));
    const cards = unitsBlock(fit);
    if (cards) blocks.push(cards);
  } else {
    const cards = unitsBlock(selection);
    if (cards) blocks.push(cards);
  }
  return { blocks, chips: searchChips(slots, k, idx) };
}

function replyLongStay(ctx: Ctx, kind: "monthly" | "weekly"): BotReply {
  const { slots, k, idx } = ctx;
  const selection = selectUnits(k, slots);
  const priced = selection.units.filter((unit) => (kind === "monthly" ? unit.m : unit.w)).sort(byAvailabilityThenPrice);
  const label = kind === "monthly" ? "bulanan" : "mingguan";
  const type = typeLabel(slots, k);
  if (priced.length) {
    const blocks: ReplyBlock[] = [
      text(`Harga ${label} ${type.toLowerCase()} ${placeLabel(slots, idx)}:`),
      list(priced.slice(0, MAX_LIST).map((unit) => `${unit.name}: ${formatRupiah(kind === "monthly" ? (unit.m ?? 0) : (unit.w ?? 0))}/${kind === "monthly" ? "bulan" : "minggu"}${unit.av ? "" : " (saat ini penuh)"}`)),
      { type: "units", slugs: priced.slice(0, MAX_CARDS).map((unit) => unit.slug) },
    ];
    const question = `Saya mau sewa ${label} ${type.toLowerCase()} ${placeLabel(slots, idx)}, bagaimana prosesnya?`;
    return { blocks, chips: [handoffChip(question), { label: "Cara pesan", send: "Bagaimana cara pesan?" }], handoff: { text: handoffMessage(question, slots, k, idx) } };
  }
  const question = `Berapa harga sewa ${label} ${type.toLowerCase()} ${placeLabel(slots, idx)}?`;
  return {
    blocks: [
      text(`Sewa ${label} bisa, tapi harga ${label} ${type.toLowerCase()} ${placeLabel(slots, idx)} belum tercantum di situs. Admin bisa kasih penawaran langsung.`),
    ],
    chips: [handoffChip(question), { label: "Harga per malam", send: `Harga ${type.toLowerCase()} ${placeLabel(slots, idx)} per malam?` }],
    handoff: { text: handoffMessage(question, slots, k, idx) },
  };
}

function replyEstimate(ctx: Ctx): BotReply {
  const { slots, k, idx } = ctx;
  const nights = slots.nights ?? 1;
  const unit = slots.unit ? idx.unitBySlug.get(slots.unit) : null;
  const pool = unit ? [unit] : (() => {
    const selection = selectUnits(k, slots);
    return (selection.available.length ? selection.available : selection.units).slice(0, MAX_CARDS);
  })();
  if (!pool.length) return replyAvailability(ctx);
  const items = pool.map((item) => {
    const estimate = estimateTotal({ effective_price: item.p, weekly_price: item.w, monthly_price: item.m }, nights);
    return `${item.name}: ${nights} malam sekitar ${formatRupiah(estimate.total)} (${RATE_LABEL[estimate.rate]})`;
  });
  const blocks: ReplyBlock[] = [list(items), text("Ini estimasi dari harga di situs; total pasti dikonfirmasi admin lewat WhatsApp."), { type: "units", slugs: pool.map((item) => item.slug) }];
  const guard = dateGuard(ctx.analysis, ctx.input, slots, k, idx);
  if (guard) {
    blocks.push(guard.block);
    return { blocks, chips: [guard.chip], handoff: guard.handoff };
  }
  return { blocks, chips: [{ label: "Cara pesan", send: "Bagaimana cara pesan?" }, ...searchChips(slots, k, idx).slice(0, 2)] };
}

function replyPromo({ slots, k, idx }: Ctx): BotReply {
  const selection = selectUnits(k, { ...slots, budget: null });
  const promos = selection.units
    .filter((unit) => unit.promo)
    .sort((a, b) => discountPercent({ normal_price: b.np, promo_price: b.p, is_promo_active: true }) - discountPercent({ normal_price: a.np, promo_price: a.p, is_promo_active: true }) || byAvailabilityThenPrice(a, b));
  if (!promos.length) {
    return {
      blocks: [text(`Belum ada promo yang tercantum ${placeLabel(slots, idx)} saat ini. Harga di situs sudah harga terbaru.`)],
      chips: [{ label: "Unit termurah", send: `Unit termurah ${placeLabel(slots, idx)}?` }, handoffChip("Apakah ada promo saat ini?")],
      handoff: { text: handoffMessage("Apakah ada promo saat ini?", slots, k, idx) },
    };
  }
  const top = promos.slice(0, MAX_CARDS);
  const blocks: ReplyBlock[] = [
    text(`${promos.length} unit sedang promo ${placeLabel(slots, idx)}:`),
    list(top.map((unit) => `${unit.name}: ${formatRupiah(unit.p)}/malam (normal ${formatRupiah(unit.np)}, hemat ${discountPercent({ normal_price: unit.np, promo_price: unit.p, is_promo_active: true })}%)`)),
    { type: "units", slugs: top.map((unit) => unit.slug), moreHref: promos.length > MAX_CARDS ? { href: sewaHref({ lokasi: slots.apartment, urut: "diskon" }), label: `Lihat semua ${promos.length} promo` } : undefined },
  ];
  return { blocks, chips: searchChips(slots, k, idx) };
}

function replyAmenities(ctx: Ctx): BotReply {
  const { slots, k, idx, analysis } = ctx;
  const asked = analysis.entities.amenities;
  const scope = selectUnits(k, { ...slots, unit: null });
  const pool = scope.units;
  if (!asked.length) {
    const unit = slots.unit ? idx.unitBySlug.get(slots.unit) : null;
    if (unit) return replyUnitDetail(ctx);
    const names = k.amenities.map((amenity) => amenity.name).slice(0, 12);
    return {
      blocks: [text(`Fasilitas kamar yang umum di unit ${placeLabel(slots, idx)}: ${names.join(", ")}. Kelengkapan tiap unit ada di halaman unitnya.`)],
      chips: [{ label: "Unit dengan dapur", send: `Unit yang ada dapur ${placeLabel(slots, idx)}?` }, { label: "Fasilitas gedung", send: `Fasilitas gedung ${placeLabel(slots, idx)} apa saja?` }],
    };
  }
  const lines: string[] = [];
  for (const id of asked) {
    const amenity = idx.amenityById.get(id);
    if (!amenity) continue;
    const count = pool.filter((unit) => unit.a.includes(id)).length;
    lines.push(count ? `${amenity.name} ada di ${count} dari ${pool.length} unit ${placeLabel(slots, idx)}` : `${amenity.name} belum tercantum di unit ${placeLabel(slots, idx)}`);
  }
  const withAll = selectUnits(k, { ...slots, unit: null }, asked);
  const blocks: ReplyBlock[] = [list(lines)];
  if (!withAll.relaxed && withAll.units.length) {
    blocks.push(text(`Unit yang punya semuanya${withAll.available.length ? `, ${withAll.available.length} tersedia` : ""}:`));
    const cards = unitsBlock(withAll);
    if (cards) blocks.push(cards);
    return { blocks, chips: searchChips(slots, k, idx) };
  }
  const question = `Apakah ada unit dengan ${lines.length ? asked.map((id) => idx.amenityById.get(id)?.name).filter(Boolean).join(" dan ") : "fasilitas itu"} ${placeLabel(slots, idx)}?`;
  blocks.push(text("Kalau fasilitasnya belum tercantum, admin bisa cek langsung ke unitnya."));
  return { blocks, chips: [handoffChip(question), ...searchChips(slots, k, idx).slice(0, 2)], handoff: { text: handoffMessage(question, slots, k, idx) } };
}

function replyFacilities({ slots, k, idx, analysis }: Ctx): BotReply {
  const locations = slots.apartment ? k.locations.filter((location) => location.slug === slots.apartment) : k.locations;
  const blocks: ReplyBlock[] = [];
  for (const location of locations) {
    const items = k.facilities.filter((facility) => facility.locationId === location.id);
    if (!items.length) continue;
    const hits = items.filter((facility) => analysis.entities.facilities.includes(facility.id));
    const ordered = [...hits, ...items.filter((facility) => !hits.includes(facility))].slice(0, hits.length ? Math.max(hits.length, MAX_LIST) : MAX_LIST);
    blocks.push(text(`Fasilitas gedung ${location.shortName}:`));
    blocks.push(list(ordered.map((facility) => (facility.desc ? `${facility.name}: ${facility.desc}` : facility.name))));
    if (items.length > ordered.length) blocks.push(link(apartmentPath(location.slug), `Semua ${items.length} fasilitas ${location.shortName}`));
  }
  if (!blocks.length) blocks.push(text("Daftar fasilitas gedung belum tercantum di situs. Admin bisa jelaskan langsung."));
  const chips: Chip[] = [{ label: "Fasilitas kamar", send: `Fasilitas di dalam unit ${placeLabel(slots, idx)} apa saja?` }, { label: "Lokasi", send: `Alamat ${placeLabel(slots, idx).replace(/^di /, "")} di mana?` }];
  return { blocks, chips };
}

function replyLandmarks({ slots, k, idx, analysis }: Ctx): BotReply {
  const locations = slots.apartment ? k.locations.filter((location) => location.slug === slots.apartment) : k.locations;
  const blocks: ReplyBlock[] = [];
  for (const location of locations) {
    const items = k.landmarks.filter((landmark) => landmark.locationId === location.id);
    if (!items.length) continue;
    const hits = items.filter((landmark) => analysis.entities.landmarks.includes(landmark.id));
    const ordered = [...hits, ...items.filter((landmark) => !hits.includes(landmark))].slice(0, MAX_LIST);
    blocks.push(text(hits.length ? `Yang dekat ${location.shortName}:` : `Tempat dekat ${location.shortName}:`));
    blocks.push(list(ordered.map((landmark) => `${landmark.name}: ${landmark.distanceTime}${landmark.notes ? ` (${landmark.notes})` : ""}`)));
    if (items.length > ordered.length) blocks.push(link(apartmentPath(location.slug), `Semua tempat dekat ${location.shortName}`));
  }
  if (!blocks.length) blocks.push(text("Daftar tempat terdekat belum tercantum di situs. Admin bisa bantu arahkan."));
  const chips: Chip[] = [{ label: "Alamat lengkap", send: `Alamat ${placeLabel(slots, idx).replace(/^di /, "")} di mana?` }, { label: "Fasilitas gedung", send: `Fasilitas gedung ${placeLabel(slots, idx)} apa saja?` }];
  return { blocks, chips };
}

function replyLocation({ slots, k, idx }: Ctx): BotReply {
  const locations = slots.apartment ? k.locations.filter((location) => location.slug === slots.apartment) : k.locations;
  const blocks: ReplyBlock[] = [];
  for (const location of locations) {
    const where = [location.area, location.address].filter(Boolean).join(": ");
    blocks.push(text(where ? `${location.name}, ${where}.` : `${location.name}: alamat lengkap ada di halaman apartemen.`));
    if (location.address || (location.lat !== null && location.lng !== null)) {
      blocks.push(
        link(
          mapExternalUrl({ gmapsUrl: location.gmapsUrl, name: location.name, address: location.address, latitude: location.lat, longitude: location.lng }),
          `Buka ${location.shortName} di Google Maps`,
          true,
        ),
      );
    }
    blocks.push(link(apartmentPath(location.slug), `Profil ${location.shortName}`));
  }
  if (!blocks.length) blocks.push(text("Belum ada apartemen yang tercantum di situs saat ini."));
  const chips: Chip[] = [{ label: "Tempat terdekat", send: `Apa saja yang dekat ${placeLabel(slots, idx).replace(/^di /, "")}?` }, { label: "Harga mulai", send: `Harga unit ${placeLabel(slots, idx)} mulai berapa?` }];
  return { blocks, chips };
}

function replyCheckin({ k, slots, idx }: Ctx): BotReply {
  const s = k.settings;
  const lines: string[] = [];
  if (s.checkinTime || s.checkoutTime) lines.push(`Check-in mulai ${s.checkinTime || "sesuai konfirmasi admin"}, check-out sampai ${s.checkoutTime || "sesuai konfirmasi admin"}.`);
  if (s.checkinRequirements) lines.push(s.checkinRequirements);
  const blocks: ReplyBlock[] = lines.length ? [text(lines.join(" "))] : [text("Jam check-in dan syaratnya dikonfirmasi admin saat pemesanan.")];
  const question = "Apakah bisa early check-in atau late check-out?";
  return {
    blocks,
    chips: [{ label: "Early check-in?", send: question }, { label: "Peraturan menginap", send: "Apa saja peraturan menginap?" }],
    handoff: { text: handoffMessage(question, slots, k, idx) },
  };
}

const RULE_TOPICS: [RegExp, string][] = [
  [/\b(hewan|kucing|anjing|pet|peliharaan)\b/, "hewan peliharaan"],
  [/\b(pesta|party|acara|event)\b/, "pesta atau acara"],
  [/\b(merokok|rokok|vape|ngerokok)\b/, "merokok"],
  [/\b(tamu tambahan|tamu lain|bawa teman|extra|tambah orang)\b/, "tamu tambahan"],
  [/\b(berisik|musik|karaoke)\b/, "suara atau musik"],
  [/\b(anak|bayi|balita)\b/, "anak-anak"],
  [/\b(masak|memasak)\b/, "memasak"],
];

function replyHouseRules({ k, slots, idx, analysis }: Ctx): BotReply {
  const rules = k.settings.houseRules;
  const blocks: ReplyBlock[] = [];
  if (rules.length) {
    blocks.push(text("Peraturan menginap:"));
    blocks.push(list(rules.slice(0, 8)));
  } else {
    blocks.push(text("Peraturan menginap belum tercantum di situs."));
  }
  const topic = RULE_TOPICS.find(([pattern]) => pattern.test(analysis.normalized))?.[1] ?? null;
  const covered = topic ? rules.some((rule) => new RegExp(topic.split(" ")[0], "i").test(rule)) : true;
  const chips: Chip[] = [{ label: "Jam check-in", send: "Check-in jam berapa?" }];
  if (topic && !covered) {
    const question = `Apakah ${topic} diperbolehkan di unit?`;
    blocks.push(text(`Soal ${topic} belum tercantum di peraturan, tanya admin dulu ya.`));
    return { blocks, chips: [handoffChip(question), ...chips], handoff: { text: handoffMessage(question, slots, k, idx) } };
  }
  return { blocks, chips };
}

function replyContact({ k, slots, idx }: Ctx): BotReply {
  const s = k.settings;
  const hours = formatOfficeHours(s.officeHours);
  const parts = [`Admin bisa dihubungi lewat WhatsApp${s.whatsappNumber ? ` (${formatWhatsappDisplay(s.whatsappNumber)})` : ""}${hours ? ` di jam layanan ${hours}` : ""}.`];
  if (s.contactEmail) parts.push(`Email: ${s.contactEmail}.`);
  const question = "Saya ingin bertanya langsung.";
  return {
    blocks: [text(parts.join(" "))],
    chips: [handoffChip(question), { label: "Cara pesan", send: "Bagaimana cara pesan?" }],
    handoff: { text: handoffMessage(question, slots, k, idx) },
  };
}

function replyBookingHow(): BotReply {
  return {
    blocks: [
      text("Cara pesan:"),
      list([
        "Pilih unit di halaman Cari unit, lalu tekan Sewa sekarang.",
        "Isi nama, kota asal, nomor WhatsApp, tanggal, dan jumlah tamu.",
        "Tekan Kirim via WhatsApp; pesanmu terbuka di WhatsApp admin, tinggal kirim.",
        "Admin mengonfirmasi ketersediaan, total, dan cara pembayaran lewat WhatsApp.",
      ]),
      link("/sewa", "Cari unit sekarang"),
    ],
    chips: [{ label: "Jam check-in", send: "Check-in jam berapa?" }, { label: "Ada promo?", send: "Ada promo apa saja?" }],
  };
}

function replyFaq(ctx: Ctx): BotReply {
  const faq = ctx.analysis.entities.faq ? ctx.k.faqs.find((item) => item.id === ctx.analysis.entities.faq?.id) : null;
  if (!faq) return replyFallback(ctx);
  return {
    blocks: [text(faq.q), text(faq.a), link("/#faq", "Pertanyaan umum lainnya")],
    chips: [{ label: "Cara pesan", send: "Bagaimana cara pesan?" }, { label: "Jam check-in", send: "Check-in jam berapa?" }],
  };
}

function replyGreeting({ k }: Ctx, help = false): BotReply {
  const intro = help
    ? `Aku ${BOT_NAME}. Aku bisa bantu cek harga, unit yang tersedia, tipe kamar, fasilitas, lokasi, jam check-in, dan cara pesan. Tulis saja pertanyaanmu, singkatan juga boleh.`
    : `Hai, aku ${BOT_NAME}. Jawabanku diambil dari data unit yang ada di situs ini. Mau cek harga, unit yang tersedia, tipe kamar, fasilitas, lokasi, atau jam check-in?`;
  return { blocks: [text(intro)], chips: helpChips(k) };
}

function replyThanks({ k }: Ctx): BotReply {
  return { blocks: [text("Sama-sama. Kalau sudah ketemu unitnya, tekan Sewa sekarang di halaman unit; admin bantu lanjutkan lewat WhatsApp.")], chips: helpChips(k).slice(0, 3) };
}

function replyReset({ k }: Ctx): BotReply {
  return { blocks: [text("Oke, kita mulai dari awal. Mau cari unit apa?")], chips: helpChips(k) };
}

function replyFallback({ input, slots, k, idx }: Ctx): BotReply {
  return {
    blocks: [text("Maaf, aku belum paham pertanyaannya. Coba tanya harga, unit yang tersedia, tipe kamar, fasilitas, lokasi, atau jam check-in. Atau tanya admin langsung:")],
    chips: helpChips(k).slice(0, 4),
    handoff: { text: handoffMessage(input, slots, k, idx) },
  };
}

export function composeReply(intent: IntentName, analysis: Analysis, slots: Slots, input: string, k: ChatKnowledge, idx: KnowledgeIndex): BotReply {
  const ctx: Ctx = { analysis, slots, input, k, idx };
  if (!k.units.length && !["greeting", "help", "thanks", "reset", "contact", "checkin", "house_rules", "booking_how", "faq", "fallback"].includes(intent)) {
    return {
      blocks: [text("Data unit belum bisa dibaca saat ini. Tanya admin langsung lewat WhatsApp ya.")],
      chips: [],
      handoff: { text: handoffMessage(input, slots, k, idx) },
    };
  }
  switch (intent) {
    case "price":
      return replyPrice(ctx);
    case "availability":
      return replyAvailability(ctx);
    case "type_list":
      return replyTypeList(ctx);
    case "unit_detail":
      return replyUnitDetail(ctx);
    case "capacity":
      return replyCapacity(ctx);
    case "monthly":
      return replyLongStay(ctx, "monthly");
    case "weekly":
      return replyLongStay(ctx, "weekly");
    case "stay_estimate":
      return replyEstimate(ctx);
    case "promo":
      return replyPromo(ctx);
    case "amenities":
      return replyAmenities(ctx);
    case "facilities":
      return replyFacilities(ctx);
    case "landmarks":
      return replyLandmarks(ctx);
    case "location":
      return replyLocation(ctx);
    case "checkin":
      return replyCheckin(ctx);
    case "house_rules":
      return replyHouseRules(ctx);
    case "contact":
      return replyContact(ctx);
    case "booking_how":
      return replyBookingHow();
    case "faq":
      return replyFaq(ctx);
    case "greeting":
      return replyGreeting(ctx);
    case "help":
      return replyGreeting(ctx, true);
    case "thanks":
      return replyThanks(ctx);
    case "reset":
      return replyReset(ctx);
    default:
      return replyFallback(ctx);
  }
}
