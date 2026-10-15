// Slug URL: huruf kecil, angka, dan tanda hubung.

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slug unik: tambah -2, -3, … kalau sudah dipakai. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = slugify(base) || "unit";
  if (!used.has(root)) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${root}-${used.size + 1}`;
}

/** Slug otomatis unit dari nama + apartemen (PRD 7.4), mis. "studio-at-26x-vida-view". */
export function unitSlug(name: string, locationSlug: string | null): string {
  const base = slugify(name);
  if (!locationSlug || base.includes(locationSlug)) return base;
  return slugify(`${name} ${locationSlug}`);
}
