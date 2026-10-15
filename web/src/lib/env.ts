// Env dibaca secara lazy (di dalam fungsi), supaya build tetap jalan sebelum .env.local diisi.
// Akses harus berbentuk `process.env.NEXT_PUBLIC_X` literal agar Next bisa menyisipkannya ke bundle klien.

export class MissingEnvError extends Error {
  constructor(names: string[]) {
    super(`Env belum diisi: ${names.join(", ")}. Lihat docs/SETUP.md bagian 4.`);
    this.name = "MissingEnvError";
  }
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getSupabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    const missing: string[] = [];
    if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!key) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    throw new MissingEnvError(missing);
  }
  return { url, key };
}

/** URL kanonik situs tanpa garis miring di akhir. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://vidaliday.com";
  return raw.replace(/\/+$/, "");
}
