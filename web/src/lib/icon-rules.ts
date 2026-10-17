// Aturan tebak ikon dari nama (data lama yang ikonnya "check" atau kosong).
// Modul murni tanpa React/alias supaya juga bisa dipakai skrip Node (scripts/make-backfill-v3.mjs).

import type { IconName } from "./icons";

type KeywordRule = [RegExp, IconName];

export const AMENITY_RULES: KeywordRule[] = [
  [/netflix|streaming/i, "clapperboard"],
  [/\b(smart\s*)?tv\b|televisi/i, "tv"],
  [/\bac\b|air\s*cond|pendingin/i, "air-vent"],
  [/wi-?fi|internet/i, "wifi"],
  [/water\s*heater|air\s*panas|pemanas\s*air/i, "shower-head"],
  [/kulkas|refrigerator|lemari\s*es/i, "refrigerator"],
  [/mesin\s*cuci|washing/i, "washing-machine"],
  [/microwave/i, "microwave"],
  [/dispenser|galon|air\s*minum/i, "glass-water"],
  [/teko|kettle|kopi|coffee/i, "coffee"],
  [/dapur|kitchen|kompor|rice\s*cooker|masak/i, "cooking-pot"],
  [/meja\s*makan|alat\s*makan|peralatan\s*makan/i, "utensils"],
  [/meja\s*(kerja|belajar)|work\s*desk|laptop/i, "laptop"],
  [/sofa|ruang\s*(tamu|santai|keluarga)|living/i, "sofa"],
  [/kursi|chair/i, "armchair"],
  // "Lemari es" sudah ditangkap aturan kulkas di atas; sisanya lemari pakaian.
  [/lemari|wardrobe|closet/i, "wardrobe"],
  [/gantungan|hanger/i, "hanger"],
  [/setrika|strika|\biron/i, "shirt"],
  [/balkon|balcony/i, "fence"],
  [/\bview\b|pemandangan/i, "eye"],
  [/handuk|towel|mandi|toiletries|bathtub|shampoo|sabun/i, "bath"],
  [/king\s*bed|queen\s*bed|single\s*bed|kasur|ranjang|springbed|\bbed\b|kamar\s*tidur|bedroom/i, "bed-double"],
  [/kapasitas|orang|tamu/i, "users"],
  [/parkir|parking/i, "square-parking"],
  [/kolam|pool/i, "waves"],
];

/** Fasilitas gedung: aturan fasilitas kamar dulu (kolam, parkir, dll.), lalu yang khas gedung. */
export const FACILITY_RULES: KeywordRule[] = [
  ...AMENITY_RULES,
  [/gym|fitness/i, "dumbbell"],
  [/taman|garden/i, "trees"],
  [/anak|kids|playground/i, "baby"],
  [/lobby|lobi/i, "door-open"],
  [/keamanan|security|satpam/i, "shield-check"],
  [/cctv/i, "cctv"],
  [/lift|elevator/i, "arrow-up-down"],
  [/minimarket|mart|toko/i, "store"],
  [/jogging|lari|track/i, "footprints"],
  [/sunset|sun|rooftop|deck/i, "sun"],
  [/working\s*space|co-?working|ruang\s*kerja/i, "laptop"],
];

export const LANDMARK_RULES: KeywordRule[] = [
  [/bandara|airport|bandar\s*udara/i, "plane"],
  [/rumah\s*sakit|\brs(u|ud|up|ia)?\b|hospital|siloam|primaya|hermina|klinik|awal\s*bros/i, "hospital"],
  [/mall|transmart|\btsm\b|pipo|plaza|belanja|pasar|supermarket|square/i, "shopping-bag"],
  // Kata "pantai" sebelum kuliner ("Pantai Losari & Kuliner Pisang Epe" adalah pantai), tapi "Losari"
  // saja sesudahnya ("Pisang Epe Losari" adalah tempat makan).
  [/pantai|pulau|wisata|danau|pelabuhan|dermaga/i, "tree-palm"],
  [/kuliner|cafe|kafe|resto|restoran|topaz|pisang\s*epe|seafood|coto|konro|pallubasa|\bmie\b|bakso|makan|kopi/i, "utensils-crossed"],
  [/losari/i, "tree-palm"],
  [/kampus|universitas|university|unhas|\bumi\b|unm|sekolah|school|college|politeknik|stikes/i, "graduation-cap"],
  [/bioskop|cinema|\bxxi\b|karaoke|trans\s*studio|hiburan|\bclub\b|\bbar\b|live\s*music/i, "music"],
  [/masjid|gereja|klenteng|pura|kubah|benteng|rotterdam|monumen|museum/i, "landmark"],
  [/\btoll?\b|jalan|\broad\b|terminal|stasiun|halte/i, "route"],
];

function guess(name: string | null | undefined, rules: KeywordRule[]): IconName | null {
  if (!name) return null;
  for (const [pattern, icon] of rules) if (pattern.test(name)) return icon;
  return null;
}

export function guessAmenityIcon(name: string | null | undefined): IconName | null {
  return guess(name, AMENITY_RULES);
}

export function guessFacilityIcon(name: string | null | undefined): IconName | null {
  return guess(name, FACILITY_RULES);
}

export function guessLandmarkIcon(name: string | null | undefined): IconName | null {
  return guess(name, LANDMARK_RULES);
}
