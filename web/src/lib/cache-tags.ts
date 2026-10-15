// Satu-satunya peta tag cache. Data publik diberi tag di lib/data/*; mutasi admin
// memanggil invalidate() yang menjalankan updateTag() (read-your-writes di Server Action).
// Jangan pakai revalidateTag(tag, "max") untuk perubahan admin: halaman berikutnya masih basi.

export const TAGS = {
  units: "units",
  unit: (slug: string) => `unit:${slug}`,
  locations: "locations",
  amenities: "amenities",
  facilities: "facilities",
  landmarks: "landmarks",
  faqs: "faqs",
  settings: "settings",
  popularity: "popularity",
} as const;

export type InvalidateTarget =
  | { kind: "unit"; slugs: (string | null | undefined)[] }
  | { kind: "units" }
  | { kind: "location" }
  | { kind: "roomType" }
  | { kind: "amenity" }
  | { kind: "facility" }
  | { kind: "landmark" }
  | { kind: "faq" }
  | { kind: "settings" };

/** Daftar tag yang harus kedaluwarsa untuk sebuah perubahan (fungsi murni, ada test). */
export function tagsFor(target: InvalidateTarget): string[] {
  switch (target.kind) {
    case "unit":
      return [
        TAGS.units,
        ...target.slugs.filter((slug): slug is string => Boolean(slug)).map((slug) => TAGS.unit(slug)),
      ];
    case "units":
      return [TAGS.units];
    case "location":
    case "roomType":
      return [TAGS.locations, TAGS.units];
    case "amenity":
      return [TAGS.amenities, TAGS.units];
    case "facility":
      return [TAGS.facilities];
    case "landmark":
      return [TAGS.landmarks];
    case "faq":
      return [TAGS.faqs];
    case "settings":
      return [TAGS.settings];
  }
}
