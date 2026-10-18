import { describe, expect, it } from "vitest";
import { createState, greet, respond, type ChatState } from "./engine";
import type { BotReply, ReplyBlock } from "./respond";
import { sampleIndex, sampleKnowledge } from "./test-knowledge";

const k = sampleKnowledge();
const idx = sampleIndex(k);

/** Semua harga unit di fixture, untuk memastikan bot tidak mengarang angka. */
const KNOWN_PRICES = new Set<number>(k.units.flatMap((unit) => [unit.p, unit.np, unit.w ?? 0, unit.m ?? 0]));

function textOf(reply: BotReply): string {
  return reply.blocks
    .map((block) => {
      if (block.type === "text") return block.text;
      if (block.type === "list") return block.items.join("\n");
      if (block.type === "link") return block.label;
      return "";
    })
    .join("\n");
}

function unitSlugs(reply: BotReply): string[] {
  return reply.blocks.flatMap((block) => (block.type === "units" ? block.slugs : []));
}

function links(reply: BotReply): ReplyBlock[] {
  return reply.blocks.filter((block) => block.type === "link" || (block.type === "units" && block.moreHref));
}

function ask(input: string, state: ChatState = createState()) {
  return respond(input, state, k, idx);
}

/** Setiap "Rp…" di jawaban harus harga yang ada di data, atau hasil estimasi/minimal yang dihitung dari data. */
function expectPricesKnown(reply: BotReply, extra: number[] = []) {
  const allowed = new Set([...KNOWN_PRICES, ...extra]);
  for (const match of textOf(reply).matchAll(/Rp(\d+(?:[.,]\d+)*)(rb|jt)?/g)) {
    const digits = match[2] ? Number(match[1].replace(",", ".")) * (match[2] === "jt" ? 1_000_000 : 1_000) : Number(match[1].replace(/\./g, ""));
    expect(allowed.has(digits), `harga ${digits} tidak ada di data`).toBe(true);
  }
}

describe("14 contoh pertanyaan", () => {
  it("1. brp hrg studio di vida? → harga studio Vida View", () => {
    const { reply, analysis, state } = ask("brp hrg studio di vida?");
    expect(analysis.intent).toBe("price");
    expect(state.slots).toMatchObject({ apartment: "vida-view", category: "studio" });
    expect(textOf(reply)).toContain("Studio di Vida View mulai Rp250.000/malam");
    expect(textOf(reply)).toContain("2 unit ditandai tersedia");
    expect(unitSlugs(reply)).toEqual(["unit-2", "unit-1"]);
    expectPricesKnown(reply);
  });

  it("2. ada kamar kosong buat 4 org? → ketersediaan untuk 4 tamu", () => {
    const { reply, analysis, state } = ask("ada kamar kosong buat 4 org?");
    expect(analysis.intent).toBe("availability");
    expect(state.slots.guests).toBe(4);
    expect(textOf(reply)).toContain("untuk 4 orang");
    expect(textOf(reply)).toContain("3 unit saat ini ditandai tersedia");
    expect(unitSlugs(reply)).toEqual(["unit-6", "unit-3", "unit-7"]);
  });

  it("3. delft 2br berapa → tipe tidak ada, tawarkan tipe lain dan apartemen lain", () => {
    const { reply, analysis } = ask("delft 2br berapa");
    expect(analysis.intent).toBe("price");
    const text = textOf(reply);
    expect(text).toContain("Belum ada 2 bedroom di Delft CPI");
    expect(text).toContain("Tipe yang ada di Delft CPI");
    expect(text).toContain("Studio Corner");
    expect(text).toContain("2 Bedroom ada di Vida View mulai Rp750.000/malam");
    expect(unitSlugs(reply)).toEqual(["unit-3"]);
  });

  it("4. cek in jam brp → jam check-in dan syarat", () => {
    const { reply, analysis } = ask("cek in jam brp");
    expect(analysis.intent).toBe("checkin");
    expect(textOf(reply)).toContain("Check-in mulai 14.00 WITA, check-out sampai 12.00 WITA.");
    expect(textOf(reply)).toContain("Usia minimal 18 tahun");
  });

  it("5. bisa bulanan? (setelah #1) → harga bulanan belum tercantum + WA", () => {
    const first = ask("brp hrg studio di vida?");
    const { reply, analysis } = ask("bisa bulanan?", first.state);
    expect(analysis.intent).toBe("monthly");
    expect(textOf(reply)).toContain("harga bulanan studio di Vida View belum tercantum");
    expect(reply.handoff?.text).toContain("Halo Admin VIDALIDAY, saya mau tanya soal Studio di Vida View");
  });

  it("6. yang di delft? (setelah #1) → lanjutan intent harga dengan apartemen baru", () => {
    const first = ask("brp hrg studio di vida?");
    const { reply, analysis, state } = ask("yang di delft?", first.state);
    expect(analysis.intent).toBe("price");
    expect(state.slots).toMatchObject({ apartment: "delft-cpi", category: "studio" });
    expect(textOf(reply)).toContain("Studio di Delft CPI mulai Rp290.000/malam");
    // Kategori studio di Delft: Studio dan Studio Corner, termurah dulu.
    expect(unitSlugs(reply)).toEqual(["unit-5", "unit-6"]);
  });

  it("7. AT 26X msh ada? → detail unit", () => {
    const { reply, analysis, state } = ask("AT 26X msh ada?");
    expect(analysis.intent).toBe("unit_detail");
    expect(state.slots.unit).toBe("unit-1");
    const text = textOf(reply);
    expect(text).toContain("Studio AT 26X:");
    expect(text).toContain("Rp280.000/malam (normal Rp300.000, hemat 7%)");
    expect(text).toContain("Vida View · Tower Ashton lt. 26");
    expect(text).toContain("Maks. 3 tamu");
    expect(text).toContain("AC, WiFi, Smart TV");
    expect(text).toContain("Saat ini ditandai tersedia");
    expect(links(reply).some((block) => block.type === "link" && block.href === "/unit/unit-1")).toBe(true);
  });

  it("8. ada wifi sama dapur ga? → hitungan per fasilitas + unit yang punya semuanya", () => {
    const { reply, analysis } = ask("ada wifi sama dapur ga?");
    expect(analysis.intent).toBe("amenities");
    const text = textOf(reply);
    expect(text).toContain("WiFi ada di 7 dari 7 unit");
    expect(text).toContain("Kitchen Set ada di 1 dari 7 unit");
    expect(unitSlugs(reply)).toEqual(["unit-3"]);
  });

  it("9. dleft deket mall ga? → landmark Delft, mall dulu", () => {
    const { reply, analysis, state } = ask("dleft deket mall ga?");
    expect(analysis.intent).toBe("landmarks");
    expect(state.slots.apartment).toBe("delft-cpi");
    const list = reply.blocks.find((block) => block.type === "list");
    expect(list?.type === "list" && list.items[0]).toContain("Trans Studio Mall: 7 menit");
    expect(textOf(reply)).not.toContain("Mall Panakkukang");
  });

  it("10. alamat vida view dmn → alamat + tautan peta", () => {
    const { reply, analysis } = ask("alamat vida view dmn");
    expect(analysis.intent).toBe("location");
    expect(textOf(reply)).toContain("Apartemen Vida View, Panakkukang: Jl. Topaz Raya");
    const map = reply.blocks.find((block) => block.type === "link" && block.external);
    expect(map?.type === "link" && map.href).toContain("google.com/maps");
    expect(links(reply).some((block) => block.type === "link" && block.href === "/apartemen/vida-view")).toBe(true);
  });

  it("11. 3 malam studio delft total brp → estimasi", () => {
    const { reply, analysis } = ask("3 malam studio delft total brp");
    expect(analysis.intent).toBe("stay_estimate");
    expect(textOf(reply)).toContain("Studio Delft 0812: 3 malam sekitar Rp870.000 (tarif harian)");
    expect(textOf(reply)).toContain("estimasi");
    expectPricesKnown(reply, [870_000, 1_140_000]);
  });

  it("12. boleh bawa kucing? → peraturan + topik belum tercantum + WA", () => {
    const { reply, analysis } = ask("boleh bawa kucing?");
    expect(analysis.intent).toBe("house_rules");
    expect(textOf(reply)).toContain("Dilarang merokok di dalam unit");
    expect(textOf(reply)).toContain("Soal hewan peliharaan belum tercantum");
    expect(reply.handoff?.text).toContain("hewan peliharaan");
  });

  it("13. studoi buat berdua tgl 20 okt → ketersediaan + pengaman tanggal", () => {
    const { reply, analysis, state } = ask("studoi buat berdua tgl 20 okt");
    expect(analysis.intent).toBe("availability");
    expect(state.slots).toMatchObject({ category: "studio", guests: 2 });
    expect(unitSlugs(reply).length).toBeGreaterThan(0);
    expect(textOf(reply)).toContain("konfirmasi dulu ke admin");
    expect(reply.chips[0].label).toBe("Tanya tanggal ke admin");
    expect(reply.handoff?.text).toContain("studoi buat berdua tgl 20 okt");
  });

  it("14. xyzzy qwerty → fallback dengan tombol WhatsApp berisi pertanyaan", () => {
    const { reply, analysis } = ask("xyzzy qwerty");
    expect(analysis.intent).toBe("fallback");
    expect(analysis.matched).toBe(false);
    expect(textOf(reply)).toContain("belum paham");
    expect(reply.handoff?.text).toBe("Halo Admin VIDALIDAY, saya mau tanya: xyzzy qwerty");
  });
});

describe("di luar data situs", () => {
  it("layanan yang tidak tercatat diserahkan ke admin, bukan ditebak dari kata lain", () => {
    const { reply, analysis } = ask("bisa antar jemput bandara jam 3 pagi?");
    expect(analysis.intent).toBe("service");
    expect(analysis.matched).toBe(false);
    expect(textOf(reply)).toContain("Soal antar-jemput atau transportasi belum tercantum");
    expect(reply.handoff?.text).toBe("Halo Admin VIDALIDAY, saya mau tanya: bisa antar jemput bandara jam 3 pagi?");
    expect(ask("ada sarapan gak?").analysis.intent).toBe("service");
    expect(ask("bisa refund kalau batal?").analysis.intent).toBe("service");
    expect(ask("harga studio bisa nego?").analysis.intent).toBe("service");
  });

  it("FAQ yang menjawab tetap didahulukan, dan pertanyaan unit tetap dijawab", () => {
    expect(ask("ada deposit?").analysis.intent).toBe("faq");
    expect(ask("AT 26X bisa nego?").analysis.intent).toBe("unit_detail");
  });

  it("landmark yang ditanya tidak ada di daftar apartemen itu → bilang belum tercantum + WA", () => {
    const { reply, analysis } = ask("jarak delft ke bandara berapa menit?");
    expect(analysis.intent).toBe("landmarks");
    expect(textOf(reply)).toContain("belum tercantum");
    expect(textOf(reply)).toContain("Trans Studio Mall");
    expect(reply.handoff).toBeTruthy();
    const ok = ask("vida dekat bandara?");
    expect(textOf(ok.reply)).toContain("Bandara Sultan Hasanuddin: 30 menit");
    expect(ok.reply.handoff).toBeUndefined();
  });
});

describe("percakapan", () => {
  it("sapaan, bantuan, terima kasih, dan reset", () => {
    expect(ask("halo").analysis.intent).toBe("greeting");
    expect(textOf(greet(k, idx))).toContain("Asisten VIDALIDAY");
    expect(ask("bisa bantu apa?").analysis.intent).toBe("help");
    expect(ask("makasih ya").analysis.intent).toBe("thanks");
    const first = ask("harga studio di vida");
    const reset = ask("mulai ulang", first.state);
    expect(reset.analysis.intent).toBe("reset");
    expect(reset.state.slots.apartment).toBeNull();
    expect(reset.state.turns).toBe(0);
  });

  it("ganti apartemen mengosongkan unit dan tipe; kata semua apartemen mengosongkan slot", () => {
    const detail = ask("AT 26X msh ada?");
    const moved = ask("yang di delft?", detail.state);
    expect(moved.state.slots).toMatchObject({ apartment: "delft-cpi", unit: null, roomType: null });
    const all = ask("kalau semua apartemen?", moved.state);
    expect(all.state.slots.apartment).toBeNull();
  });

  it("tipe daftar, promo, kapasitas, kontak, cara pesan, FAQ", () => {
    const types = ask("tipe kamar apa saja di delft?");
    expect(types.analysis.intent).toBe("type_list");
    expect(textOf(types.reply)).toContain("Studio Corner: 1 dari 1 unit tersedia, mulai Rp380rb/malam");

    const promo = ask("ada promo?");
    expect(promo.analysis.intent).toBe("promo");
    expect(textOf(promo.reply)).toContain("hemat");
    expect(unitSlugs(promo.reply)).toHaveLength(3);

    const capacity = ask("2br muat berapa orang?");
    expect(capacity.analysis.intent).toBe("capacity");
    expect(textOf(capacity.reply)).toContain("muat maksimal 7 tamu");

    const contact = ask("nomor wa admin?");
    expect(contact.analysis.intent).toBe("contact");
    expect(textOf(contact.reply)).toContain("0857-1169-6970");

    const how = ask("gimana cara pesan?");
    expect(how.analysis.intent).toBe("booking_how");
    expect(textOf(how.reply)).toContain("Sewa sekarang");

    const faq = ask("ada deposit?");
    expect(faq.analysis.intent).toBe("faq");
    expect(textOf(faq.reply)).toContain("Deposit dikonfirmasi admin");
  });

  it("budget dan unit penuh", () => {
    const cheap = ask("studio dibawah 260rb");
    expect(cheap.analysis.intent).toBe("price");
    expect(unitSlugs(cheap.reply)).toEqual(["unit-2"]);
    const none = ask("3br dibawah 300rb");
    expect(textOf(none.reply)).toContain("belum ada yang persis cocok");
    const full = ask("studio plus kosong?");
    expect(full.analysis.intent).toBe("availability");
    expect(textOf(full.reply)).toContain("semuanya ditandai penuh");
    expect(full.reply.handoff).toBeTruthy();
  });

  it("chip apartemen lain tidak menawarkan apartemen yang sama dengan kartu unit", () => {
    const { reply } = ask("harga studio berapa?");
    const first = idx.unitBySlug.get(unitSlugs(reply)[0]);
    const shownName = k.locations.find((location) => location.slug === first?.l)?.shortName;
    const other = reply.chips.find((chip) => chip.label.startsWith("Cek di "));
    expect(shownName).toBeTruthy();
    expect(other).toBeTruthy();
    expect(other?.label).not.toBe(`Cek di ${shownName}`);
  });

  it("tidak ada emoji dan semua harga dari data", () => {
    const inputs = ["brp hrg studio di vida?", "ada promo?", "tipe kamar apa saja?", "2br muat berapa orang?", "unit termurah?"];
    for (const input of inputs) {
      const { reply } = ask(input);
      const text = textOf(reply);
      expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false);
      expectPricesKnown(reply);
    }
  });
});
