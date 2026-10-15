import { describe, expect, it } from "vitest";
import { mapSettings } from "@/lib/data/mappers";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { aboutToRows, replacedImages, settingsToRows } from "./settings-rows";

describe("settings rows", () => {
  it("maps fields to snake_case keys and round-trips through mapSettings", () => {
    const { about, ...fields } = DEFAULT_SETTINGS;
    const rows = settingsToRows({ ...fields, whatsappNumber: "6285711696970", heroImage: "settings/hero.webp", siteLogo: "" });
    expect(rows).toContainEqual({ key: "whatsapp_number", value: "6285711696970" });
    expect(rows).toContainEqual({ key: "hero_image", value: "settings/hero.webp" });
    expect(rows).toContainEqual({ key: "site_logo", value: null });
    const restored = mapSettings([...rows, ...aboutToRows(about)]);
    expect(restored.whatsappNumber).toBe("6285711696970");
    expect(restored.heroImage).toBe("settings/hero.webp");
    expect(restored.about.reasons).toEqual(about.reasons);
  });

  it("only writes provided fields", () => {
    expect(settingsToRows({ officeHours: " 10.00–23.00 WITA " })).toEqual([{ key: "office_hours", value: "10.00–23.00 WITA" }]);
  });

  it("drops reasons without a title", () => {
    const rows = aboutToRows({ ...DEFAULT_SETTINGS.about, reasons: [{ title: " ", desc: "x", icon: "tag" }, { title: "A", desc: "", icon: "tag" }] });
    expect(rows.find((r) => r.key === "about_reasons")?.value).toBe('[{"title":"A","desc":"","icon":"tag"}]');
  });

  it("lists replaced images for storage cleanup", () => {
    expect(replacedImages({ heroImage: "settings/a.webp", siteLogo: null }, { heroImage: "settings/b.webp", siteLogo: null })).toEqual([
      "settings/a.webp",
    ]);
  });
});
