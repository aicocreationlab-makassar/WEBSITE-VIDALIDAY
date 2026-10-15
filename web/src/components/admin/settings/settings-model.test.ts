import { describe, expect, it } from "vitest";
import { settingsToRows } from "@/lib/admin/settings-rows";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { settingsSchema } from "@/lib/validation/admin";
import {
  SETTINGS_FIELDS,
  SETTINGS_MAX,
  SETTINGS_SECTIONS,
  adminIssueMessage,
  checkTemplate,
  countFilledLines,
  dirtyKeys,
  fieldsUsingDefault,
  insertToken,
  isAcceptableSettingsImage,
  isSettingsUploadPath,
  legalNameSuggestion,
  matchSettingsSections,
  normalizedWhatsapp,
  officeHoursSuggestion,
  ownedSettingsImage,
  parseChangedFields,
  pickFields,
  previewMessage,
  sectionStatus,
  toSettingsFormValues,
  truthyKeys,
} from "./settings-model";

const UPLOAD = "settings/0b9c2f4e-1a2b-4c3d-8e9f-0123456789ab.webp";

describe("settings form values", () => {
  it("shows the WhatsApp number like a phone number and keeps the rest", () => {
    const values = toSettingsFormValues(DEFAULT_SETTINGS);
    expect(values.whatsappNumber).toBe("0857-1169-6970");
    expect(values.heroImage).toBeNull();
    expect(values.bookingWhatsappTemplate).toBe(DEFAULT_SETTINGS.bookingWhatsappTemplate);
    expect(Object.keys(values).sort()).toEqual([...SETTINGS_FIELDS].sort());
  });

  it("default values pass the shared schema and normalise the number back", () => {
    const parsed = settingsSchema.safeParse(toSettingsFormValues(DEFAULT_SETTINGS));
    expect(parsed.success).toBe(true);
    expect(parsed.data?.whatsappNumber).toBe("6285711696970");
  });

  it("every section field exists once and limits match the schema", () => {
    const all = SETTINGS_SECTIONS.flatMap((s) => s.fields);
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...SETTINGS_FIELDS].sort());
    const tooLong = settingsSchema.safeParse({
      ...toSettingsFormValues(DEFAULT_SETTINGS),
      seoTitle: "x".repeat(SETTINGS_MAX.seoTitle + 1),
    });
    expect(tooLong.success).toBe(false);
  });

  it("lists fields that still use the built-in value (images and banner excluded)", () => {
    const fields = fieldsUsingDefault(["whatsapp_number", "hero_title"]);
    expect(fields).not.toContain("whatsappNumber");
    expect(fields).not.toContain("heroTitle");
    expect(fields).toContain("contactEmail");
    expect(fields).not.toContain("heroImage");
    expect(fields).not.toContain("siteLogo");
    expect(fields).not.toContain("promoBannerText");
  });
});

describe("search and status", () => {
  it("matches sections by title, label or keyword", () => {
    expect(matchSettingsSections("")).toHaveLength(SETTINGS_SECTIONS.length);
    expect(matchSettingsSections("whatsapp")).toEqual(["kontak", "pemesanan"]);
    expect(matchSettingsSections("logo")).toEqual(["brand"]);
    expect(matchSettingsSections("check-in")).toEqual(["pemesanan"]);
    expect(matchSettingsSections("jam")).toEqual(["kontak", "pemesanan"]);
    expect(matchSettingsSections("google judul")).toEqual(["seo"]);
    expect(matchSettingsSections("zzz")).toEqual([]);
  });

  it("reports error before dirty", () => {
    expect(sectionStatus(["a", "b"], ["b"], ["a"])).toBe("error");
    expect(sectionStatus(["a", "b"], [], ["a"])).toBe("dirty");
    expect(sectionStatus(["a"], ["x"], ["y"])).toBeNull();
    expect(truthyKeys({ a: true, b: false, c: undefined, d: { message: "x" } })).toEqual(["a", "d"]);
    expect(dirtyKeys({ a: true, b: false, reasons: [], list: [undefined, { title: true }], gone: [{ title: false }] })).toEqual([
      "a",
      "list",
    ]);
  });
});

describe("changed fields", () => {
  it("writes only known changed fields; anything else means all", () => {
    expect(parseChangedFields(["officeHours", "nope", "seoTitle"])).toEqual(["officeHours", "seoTitle"]);
    expect(parseChangedFields([])).toEqual([]);
    expect(parseChangedFields("officeHours")).toEqual([...SETTINGS_FIELDS]);
    expect(parseChangedFields(undefined)).toEqual([...SETTINGS_FIELDS]);
  });

  it("only produces rows for picked fields (other keys are never touched)", () => {
    const values = settingsSchema.parse(toSettingsFormValues(DEFAULT_SETTINGS));
    const rows = settingsToRows(pickFields(values, parseChangedFields(["contactPhone"])));
    expect(rows).toEqual([{ key: "contact_phone", value: DEFAULT_SETTINGS.contactPhone }]);
  });
});

describe("settings images", () => {
  it("recognises fresh uploads", () => {
    expect(isSettingsUploadPath(UPLOAD)).toBe(true);
    expect(isSettingsUploadPath("settings/logo.png")).toBe(false);
    expect(isSettingsUploadPath("units/0b9c2f4e-1a2b-4c3d-8e9f-0123456789ab.webp")).toBe(false);
  });

  it("accepts empty, unchanged legacy values, and settings/ uploads only", () => {
    expect(isAcceptableSettingsImage(null, "settings/old.jpg")).toBe(true);
    expect(isAcceptableSettingsImage("/storage/settings/old.jpg", "settings/old.jpg")).toBe(true);
    expect(isAcceptableSettingsImage("https://example.com/a.jpg", "https://example.com/a.jpg")).toBe(true);
    expect(isAcceptableSettingsImage(UPLOAD, null)).toBe(true);
    expect(isAcceptableSettingsImage(`/storage/${UPLOAD}`, null)).toBe(true);
    expect(isAcceptableSettingsImage("settings/old-logo.png", "settings/hero.jpg")).toBe(false);
    expect(isAcceptableSettingsImage("units/a.webp", null)).toBe(false);
    expect(isAcceptableSettingsImage("https://example.com/b.jpg", null)).toBe(false);
    expect(isAcceptableSettingsImage("settings/../units/a.webp", null)).toBe(false);
  });

  it("only deletes files inside settings/", () => {
    expect(ownedSettingsImage("/storage/settings/hero.jpg")).toBe("settings/hero.jpg");
    expect(ownedSettingsImage("units/a.webp")).toBeNull();
    expect(ownedSettingsImage("images/bg.jpg")).toBeNull();
    expect(ownedSettingsImage("https://x.supabase.co/storage/v1/object/public/media/settings/a.webp")).toBeNull();
    expect(ownedSettingsImage(null)).toBeNull();
  });
});

describe("input helpers", () => {
  it("normalises WhatsApp like the server", () => {
    expect(normalizedWhatsapp("0857 1169 6970")).toBe("6285711696970");
    expect(normalizedWhatsapp("+62 857-1169-6970")).toBe("6285711696970");
    expect(normalizedWhatsapp("12345")).toBeNull();
  });

  it("suggests tidy office hours and legal name", () => {
    expect(officeHoursSuggestion("Setiap Hari: 08.00 - 23.00 WITA")).toBe("08.00–23.00 WITA");
    expect(officeHoursSuggestion("08.00–23.00 WITA")).toBeNull();
    expect(legalNameSuggestion("PT PERDANA MEGA TRANS")).toBe("PT Perdana Mega Trans");
    expect(legalNameSuggestion("PT Perdana Mega Trans")).toBeNull();
    expect(countFilledLines("a\n\n b \r\nc")).toBe(3);
  });

  it("falls back to Indonesian messages for issues without their own", () => {
    expect(adminIssueMessage({ code: "too_small" })).toBe("Isian terlalu pendek.");
    expect(adminIssueMessage({ code: "invalid_type" })).toBe("Isian belum benar.");
  });
});

describe("WhatsApp template", () => {
  it("renders the default template with sample data and drops empty lines", () => {
    const message = previewMessage(DEFAULT_SETTINGS.bookingWhatsappTemplate);
    expect(message).toContain("Unit: Studio AT 26X");
    expect(message).toContain("Check-out: Sen, 19 Okt 2026 (2 malam)");
    expect(message).toContain("Kode permintaan: VDL-5A1EAE");
    expect(message).not.toContain("Catatan:");
    expect(message.endsWith("https://vidaliday.com/unit/studio-at-26x")).toBe(true);
    expect(previewMessage(DEFAULT_SETTINGS.bookingWhatsappTemplate, true)).toContain("Catatan: Minta early check-in");
  });

  it("flags unknown placeholders and missing essentials", () => {
    const check = checkTemplate("Halo {apartment}, unit {unit_name} {unit} tgl {checkin} {Unit}");
    expect(check.unknown).toEqual(["{apartment}", "{unit_name}", "{Unit}"]);
    expect(check.missing).toEqual(["checkout"]);
    expect(check.used).toEqual(["unit", "checkin"]);
    expect(checkTemplate(DEFAULT_SETTINGS.bookingWhatsappTemplate)).toMatchObject({ unknown: [], missing: [] });
  });

  it("inserts at the cursor and replaces the selection", () => {
    expect(insertToken("Halo  admin", 5, 5, "{nama}")).toEqual({ value: "Halo {nama} admin", caret: 11 });
    expect(insertToken("Halo XX", 5, 7, "{unit}")).toEqual({ value: "Halo {unit}", caret: 11 });
    expect(insertToken("abc", 99, 120, "{kode}")).toEqual({ value: "abc{kode}", caret: 9 });
    expect(insertToken("abc", -4, -1, "{x}")).toEqual({ value: "{x}abc", caret: 3 });
  });
});
