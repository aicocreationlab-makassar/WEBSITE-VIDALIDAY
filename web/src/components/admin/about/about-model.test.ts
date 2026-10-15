import { describe, expect, it } from "vitest";
import { aboutToRows } from "@/lib/admin/settings-rows";
import { mapSettings } from "@/lib/data/mappers";
import { isKnownIconName } from "@/lib/icons";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { aboutSchema } from "@/lib/validation/admin";
import {
  ABOUT_ICON_CHOICES,
  ABOUT_SECTIONS,
  aboutIssueMessage,
  isAboutFieldPath,
  newReason,
  reasonIcon,
  toAboutFormValues,
} from "./about-model";

describe("about form values", () => {
  it("resolves legacy reason icons so saving keeps them", () => {
    const settings = mapSettings([
      {
        key: "about_reasons",
        value: JSON.stringify([
          { title: "Terpercaya", desc: "PT", icon: "shield" },
          { title: "Nyaman", desc: "", icon: "home" },
          { title: "Chat", desc: "", icon: "chat" },
          { title: "Aneh", desc: "", icon: "tidak-ada" },
        ]),
      },
    ]);
    const values = toAboutFormValues(settings.about);
    expect(values.reasons.map((r) => r.icon)).toEqual(["shield-check", "house", "message-circle", "shield-check"]);

    const parsed = aboutSchema.parse(values);
    const row = aboutToRows(parsed).find((r) => r.key === "about_reasons");
    expect(JSON.parse(row?.value ?? "[]").map((r: { icon: string }) => r.icon)).toEqual([
      "shield-check",
      "house",
      "message-circle",
      "shield-check",
    ]);
  });

  it("default content passes the schema", () => {
    expect(aboutSchema.safeParse(toAboutFormValues(DEFAULT_SETTINGS.about)).success).toBe(true);
  });

  it("icon choices cover every default reason icon, without duplicates", () => {
    const names = ABOUT_ICON_CHOICES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const reason of DEFAULT_SETTINGS.about.reasons) expect(names).toContain(reason.icon);
    for (const name of names) expect(isKnownIconName(name)).toBe(true);
    expect(reasonIcon(null)).toBe("shield-check");
    expect(isKnownIconName(newReason().icon)).toBe(true);
  });
});

describe("about validation messages", () => {
  it("uses Indonesian messages where the schema has none, and keeps schema messages", () => {
    const values = { ...toAboutFormValues(DEFAULT_SETTINGS.about), tagline: "a", heroTitle: "abc", introP1: "pendek" };
    const result = aboutSchema.safeParse(values, { error: aboutIssueMessage });
    expect(result.success).toBe(false);
    const byPath = Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]));
    expect(byPath.tagline).toBe("Tagline minimal 2 karakter.");
    expect(byPath.heroTitle).toBe("Judul halaman minimal 5 karakter.");
    expect(byPath.introP1).toBe("Paragraf 1 wajib diisi.");
  });

  it("caps reasons at 12 with a clear message", () => {
    const values = {
      ...toAboutFormValues(DEFAULT_SETTINGS.about),
      reasons: Array.from({ length: 13 }, (_, i) => ({ title: `Alasan ${i + 1}`, desc: "", icon: "tag" })),
    };
    const result = aboutSchema.safeParse(values, { error: aboutIssueMessage });
    expect(result.error?.issues[0]?.message).toBe("Maksimal 12 alasan.");
  });

  it("accepts only known server error paths", () => {
    expect(isAboutFieldPath("introP1")).toBe(true);
    expect(isAboutFieldPath("reasons")).toBe(true);
    expect(isAboutFieldPath("reasons.3.icon")).toBe(true);
    expect(isAboutFieldPath("reasons.3.other")).toBe(false);
    expect(isAboutFieldPath("_form")).toBe(false);
    expect(ABOUT_SECTIONS.flatMap((s) => s.fields)).toHaveLength(10);
  });
});
