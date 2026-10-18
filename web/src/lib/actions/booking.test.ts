import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type RpcResponse = { data: unknown; error: { message: string; name?: string } | null };

const rpcMock = vi.fn<(name: string, args: Record<string, unknown>) => Promise<RpcResponse>>();

vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => ({
    rpc: (name: string, args: Record<string, unknown>) => ({
      abortSignal: () => rpcMock(name, args),
    }),
  }),
}));

const { submitLead } = await import("./booking");
const { BOOKING_MESSAGES } = await import("@/lib/validation/booking-constants");

const valid = {
  unitId: 12,
  fullName: "  Budi Santoso ",
  originCity: " Jakarta ",
  whatsapp: "0812-3456-7890",
  checkIn: "2026-10-17",
  checkOut: "2026-10-19",
  guests: 2,
  purpose: "Liburan" as const,
  notes: "Minta early check-in",
  website: "",
  sourcePath: "/unit/studio-at-26x",
};

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-15T02:00:00Z"), toFake: ["Date"] });
  rpcMock.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("submitLead", () => {
  it("sends normalized values to submit_lead and returns the code", async () => {
    rpcMock.mockResolvedValue({ data: { code: "VDL-5A1EAE", estimated_total: 560000, nights: 2 }, error: null });
    const result = await submitLead(valid);
    expect(result).toEqual({ ok: true, code: "VDL-5A1EAE", estimatedTotal: 560000, nights: 2 });
    expect(rpcMock).toHaveBeenCalledWith("submit_lead", {
      p_unit_id: 12,
      p_full_name: "Budi Santoso",
      p_whatsapp: "6281234567890",
      p_check_in: "2026-10-17",
      p_check_out: "2026-10-19",
      p_guests: 2,
      p_purpose: "Liburan",
      p_notes: "Minta early check-in",
      p_source_path: "/unit/studio-at-26x",
      p_origin_city: "Jakarta",
    });
  });

  it("blocks when the origin city is missing", async () => {
    const result = await submitLead({ ...valid, originCity: " " });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.blocking).toBe(true);
    expect(result.fieldErrors?.originCity).toBeTruthy();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("empty WhatsApp asks to fill it in, not 'belum benar'", async () => {
    const result = await submitLead({ ...valid, whatsapp: "  " });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors?.whatsapp).toBe(BOOKING_MESSAGES.phoneEmpty);
    // Contoh nomor memakai spasi tak terputus supaya tidak terpotong di HP.
    expect(BOOKING_MESSAGES.phone).toContain("0812 3456 7890");
  });

  it("blocks on invalid fields without calling the database", async () => {
    const result = await submitLead({ ...valid, whatsapp: "12345", checkOut: "2026-10-17", guests: 0 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.blocking).toBe(true);
    expect(result.fieldErrors).toMatchObject({
      whatsapp: BOOKING_MESSAGES.phone,
      checkOut: "Tanggal check-out harus setelah check-in.",
      guests: "Jumlah tamu 1 sampai 30 orang.",
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects a check-in before today (WITA)", async () => {
    const result = await submitLead({ ...valid, checkIn: "2026-10-14", checkOut: "2026-10-16" });
    expect(result.ok === false && result.fieldErrors?.checkIn).toBe("Check-in tidak boleh sebelum hari ini.");
  });

  it("skips saving when the honeypot is filled", async () => {
    const result = await submitLead({ ...valid, website: "http://spam" });
    expect(result).toMatchObject({ ok: false, reason: "HONEYPOT", blocking: false });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it.each([
    ["INVALID_PHONE", true, "whatsapp"],
    ["INVALID_NAME", true, "fullName"],
    ["INVALID_DATES", true, "checkIn"],
    ["INVALID_GUESTS", true, "guests"],
    ["TEXT_TOO_LONG", true, "notes"],
  ] as const)("maps %s to a field error", async (code, blocking, field) => {
    rpcMock.mockResolvedValue({ data: null, error: { message: code } });
    const result = await submitLead(valid);
    expect(result).toMatchObject({ ok: false, reason: code, blocking });
    expect(result.ok === false && result.fieldErrors?.[field]).toBeTruthy();
  });

  it("maps UNIT_NOT_FOUND to a blocking message", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "UNIT_NOT_FOUND" } });
    expect(await submitLead(valid)).toMatchObject({
      ok: false,
      blocking: true,
      message: "Unit ini sudah tidak tersedia. Coba unit serupa di bawah.",
    });
  });

  it("never blocks WhatsApp on rate limits, unknown errors, timeouts or thrown errors", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "TOO_MANY_REQUESTS" } });
    expect(await submitLead(valid)).toMatchObject({ ok: false, reason: "TOO_MANY_REQUESTS", blocking: false, message: null });

    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "something exploded" } });
    expect(await submitLead(valid)).toMatchObject({ ok: false, reason: "UNAVAILABLE", blocking: false });

    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "AbortError: The operation was aborted" } });
    expect(await submitLead(valid)).toMatchObject({ ok: false, reason: "TIMEOUT", blocking: false });

    rpcMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await submitLead(valid)).toMatchObject({ ok: false, reason: "UNAVAILABLE", blocking: false });

    rpcMock.mockResolvedValueOnce({ data: { unexpected: true }, error: null });
    expect(await submitLead(valid)).toMatchObject({ ok: false, reason: "UNAVAILABLE", blocking: false });
  });
});
