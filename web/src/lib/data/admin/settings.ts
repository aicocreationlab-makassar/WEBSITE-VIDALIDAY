import "server-only";
import type { AdminSession } from "@/lib/auth/require-admin";
import { mapSettings } from "@/lib/data/mappers";
import type { SiteSettings } from "@/types/settings";

// Data admin Pengaturan & About (PRD 7.9): TIDAK di-cache (selalu terbaru), dibaca dengan sesi admin.

type Supabase = AdminSession["supabase"];

export type AdminSettingsData = {
  /** Setting bertipe; kunci yang belum ada atau kosong memakai nilai bawaan (sama dengan situs publik). */
  settings: SiteSettings;
  /** Kunci DB yang punya baris (nilai apa pun). */
  presentKeys: string[];
  /** Kunci DB yang barisnya berisi nilai (tidak kosong). */
  filledKeys: string[];
  /**
   * updated_at terbaru baris pengaturan (selain about_*) dan baris About (about_*). Dipakai sebagai
   * "terakhir disimpan" dan versi form (form dipasang ulang setelah simpan).
   */
  settingsUpdatedAt: string | null;
  aboutUpdatedAt: string | null;
};

type Row = { key: string; value: string | null; updated_at: string | null };

function latest(rows: Row[]): string | null {
  let out: string | null = null;
  for (const row of rows) {
    if (row.updated_at && (!out || row.updated_at > out)) out = row.updated_at;
  }
  return out;
}

/** Semua baris `settings` → objek bertipe + daftar kunci mentah yang ada. */
export async function getAdminSettings(supabase: Supabase): Promise<AdminSettingsData> {
  const { data, error } = await supabase.from("settings").select("key, value, updated_at");
  if (error) throw new Error(`getAdminSettings: ${error.code ?? error.message}`);

  const rows: Row[] = data ?? [];
  const isAbout = (row: Row) => row.key.startsWith("about_");

  return {
    settings: mapSettings(rows),
    presentKeys: rows.map((row) => row.key),
    filledKeys: rows.filter((row) => typeof row.value === "string" && row.value.trim() !== "").map((row) => row.key),
    settingsUpdatedAt: latest(rows.filter((row) => !isAbout(row))),
    aboutUpdatedAt: latest(rows.filter(isAbout)),
  };
}
