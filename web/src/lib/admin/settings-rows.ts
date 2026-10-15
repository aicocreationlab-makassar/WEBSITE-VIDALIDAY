// Form Pengaturan/About → baris tabel `settings` (key, value). Fungsi murni (ada test).

import { ABOUT_KEYS, SETTING_KEYS, type AboutReason, type SiteSettings } from "@/types/settings";

export type SettingRow = { key: string; value: string | null };

type SettingsFields = Omit<SiteSettings, "about">;

/** Field camelCase → baris snake_case. Nilai kosong disimpan "" (kecuali gambar → null). */
export function settingsToRows(values: Partial<SettingsFields>): SettingRow[] {
  const rows: SettingRow[] = [];
  for (const [key, field] of Object.entries(SETTING_KEYS)) {
    if (!(field in values)) continue;
    const value = values[field as keyof SettingsFields];
    if (field === "heroImage" || field === "siteLogo") {
      rows.push({ key, value: typeof value === "string" && value.trim() ? value.trim() : null });
    } else {
      rows.push({ key, value: typeof value === "string" ? value.trim() : "" });
    }
  }
  return rows;
}

export function aboutToRows(about: Omit<SiteSettings["about"], "reasons"> & { reasons: AboutReason[] }): SettingRow[] {
  const rows: SettingRow[] = Object.entries(ABOUT_KEYS).map(([key, field]) => ({
    key,
    value: String(about[field] ?? "").trim(),
  }));
  rows.push({
    key: "about_reasons",
    value: JSON.stringify(
      about.reasons
        .filter((r) => r.title.trim())
        .map((r) => ({ title: r.title.trim(), desc: r.desc.trim(), icon: r.icon })),
    ),
  });
  return rows;
}

/** Path gambar lama yang perlu dihapus dari Storage setelah diganti/dihapus. */
export function replacedImages(before: Partial<SettingsFields>, after: Partial<SettingsFields>): string[] {
  const out: string[] = [];
  for (const field of ["heroImage", "siteLogo"] as const) {
    const old = before[field];
    if (typeof old === "string" && old && old !== after[field]) out.push(old);
  }
  return out;
}
