import { describe, expect, it } from "vitest";
import { createState } from "./engine";
import { CHAT_MAX, CHAT_TTL_MS, parseSession, serializeSession, type StoredMessage } from "./session";

const NOW = 1_800_000_000_000;

function user(i: number): StoredMessage {
  return { id: `u${i}`, role: "user", text: `pesan ${i}`, at: NOW - 1000 + i };
}

describe("session", () => {
  it("serialize lalu parse mengembalikan pesan dan state", () => {
    const state = { ...createState(), lastIntent: "price" as const, turns: 2 };
    const raw = serializeSession([user(1), { id: "b1", role: "bot", reply: { blocks: [{ type: "text", text: "halo" }], chips: [] }, at: NOW }], state, NOW);
    const parsed = parseSession(raw, NOW + 60_000);
    expect(parsed?.messages).toHaveLength(2);
    expect(parsed?.state.lastIntent).toBe("price");
    expect(parsed?.state.turns).toBe(2);
  });

  it("data rusak, versi lain, atau kedaluwarsa → null", () => {
    expect(parseSession(null, NOW)).toBeNull();
    expect(parseSession("{bukan json", NOW)).toBeNull();
    expect(parseSession(JSON.stringify({ v: 2, at: NOW, messages: [], state: createState() }), NOW)).toBeNull();
    const raw = serializeSession([user(1)], createState(), NOW);
    expect(parseSession(raw, NOW + CHAT_TTL_MS + 1)).toBeNull();
    expect(parseSession(raw, NOW - 1)).toBeNull();
  });

  it("memotong ke 30 pesan terakhir dan membuang pesan tak dikenal", () => {
    const messages = Array.from({ length: 40 }, (_, i) => user(i));
    const raw = serializeSession(messages, createState(), NOW);
    const parsed = parseSession(raw, NOW);
    expect(parsed?.messages).toHaveLength(CHAT_MAX);
    expect(parsed?.messages[0]).toMatchObject({ id: "u10" });

    const tampered = JSON.stringify({ v: 1, at: NOW, messages: [user(1), { id: "x", role: "alien", at: NOW }, { role: "bot" }], state: createState() });
    expect(parseSession(tampered, NOW)?.messages).toHaveLength(1);
  });
});
