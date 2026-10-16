// Registry ikon: nama kebab-case (disimpan di DB) → komponen lucide-react.
// Hanya ikon di daftar kurasi ini yang bisa dipilih admin (DESIGN 6). Tanpa emoji.

import type { LucideIcon, LucideProps } from "lucide-react";
import { guessAmenityIcon, guessFacilityIcon, guessLandmarkIcon } from "@/lib/icon-rules";
import {
  AirVent,
  ArrowUpDown,
  Baby,
  Ban,
  BadgePercent,
  Bath,
  BedDouble,
  Bike,
  Building2,
  Car,
  Cctv,
  Check,
  CigaretteOff,
  Clapperboard,
  Clock,
  Coffee,
  CookingPot,
  DoorOpen,
  Dumbbell,
  Eye,
  Fence,
  Flame,
  Footprints,
  GlassWater,
  GraduationCap,
  Hospital,
  House,
  KeyRound,
  Landmark,
  Laptop,
  Layers,
  Lock,
  MapPin,
  MessageCircle,
  Microwave,
  Music,
  Navigation,
  Plane,
  Play,
  Refrigerator,
  Route,
  Ruler,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShowerHead,
  Sofa,
  Sparkles,
  SquareParking,
  Store,
  Sun,
  Tag,
  TreePalm,
  Trees,
  Tv,
  Users,
  Utensils,
  UtensilsCrossed,
  WashingMachine,
  Waves,
  Wifi,
  Wind,
} from "lucide-react";

export const ICONS = {
  "air-vent": AirVent,
  "arrow-up-down": ArrowUpDown,
  baby: Baby,
  ban: Ban,
  "badge-percent": BadgePercent,
  bath: Bath,
  "bed-double": BedDouble,
  bike: Bike,
  "building-2": Building2,
  car: Car,
  cctv: Cctv,
  check: Check,
  "cigarette-off": CigaretteOff,
  clapperboard: Clapperboard,
  clock: Clock,
  coffee: Coffee,
  "cooking-pot": CookingPot,
  "door-open": DoorOpen,
  dumbbell: Dumbbell,
  eye: Eye,
  fence: Fence,
  flame: Flame,
  footprints: Footprints,
  "glass-water": GlassWater,
  "graduation-cap": GraduationCap,
  hospital: Hospital,
  house: House,
  "key-round": KeyRound,
  landmark: Landmark,
  laptop: Laptop,
  layers: Layers,
  lock: Lock,
  "map-pin": MapPin,
  "message-circle": MessageCircle,
  microwave: Microwave,
  music: Music,
  navigation: Navigation,
  plane: Plane,
  play: Play,
  refrigerator: Refrigerator,
  route: Route,
  ruler: Ruler,
  "shield-check": ShieldCheck,
  shirt: Shirt,
  "shopping-bag": ShoppingBag,
  "shower-head": ShowerHead,
  sofa: Sofa,
  sparkles: Sparkles,
  "square-parking": SquareParking,
  store: Store,
  sun: Sun,
  tag: Tag,
  "tree-palm": TreePalm,
  trees: Trees,
  tv: Tv,
  users: Users,
  utensils: Utensils,
  "utensils-crossed": UtensilsCrossed,
  "washing-machine": WashingMachine,
  waves: Waves,
  wifi: Wifi,
  wind: Wind,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Nama lama/tidak baku dari data situs lama → nama di registry. */
const ALIASES: Record<string, IconName> = {
  "swimming-pool": "waves",
  pool: "waves",
  gym: "dumbbell",
  fitness: "dumbbell",
  running: "footprints",
  jogging: "footprints",
  home: "house",
  chat: "message-circle",
  whatsapp: "message-circle",
  shield: "shield-check",
  security: "shield-check",
  parking: "square-parking",
  "parking-square": "square-parking",
  palmtree: "tree-palm",
  "palm-tree": "tree-palm",
  lift: "arrow-up-down",
  elevator: "arrow-up-down",
  park: "trees",
  garden: "trees",
  lobby: "door-open",
  playground: "baby",
  shop: "store",
  minimarket: "store",
  restaurant: "utensils-crossed",
  food: "utensils-crossed",
  mall: "shopping-bag",
  shopping: "shopping-bag",
  airport: "plane",
  "map-pinned": "map-pin",
  ac: "air-vent",
  tv: "tv",
};

function isIconName(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}

/** Nama dari DB → nama registry. Tidak dikenal → `fallback`. */
export function resolveIconName(name: string | null | undefined, fallback: IconName = "check"): IconName {
  if (!name) return fallback;
  const key = name.trim().toLowerCase();
  if (isIconName(key)) return key;
  return ALIASES[key] ?? fallback;
}

export function isKnownIconName(name: string | null | undefined): boolean {
  if (!name) return false;
  const key = name.trim().toLowerCase();
  return isIconName(key) || key in ALIASES;
}

// ---------------------------------------------------------------------------
// Tebak ikon dari nama (untuk data lama yang ikonnya "check" atau kosong)
// ---------------------------------------------------------------------------

/** Ikon fasilitas kamar: pakai ikon tersimpan kalau dikenal (dan bukan "check"), lalu tebak dari nama. */
export function resolveAmenityIcon(name: string, icon: string | null | undefined): IconName {
  const stored = resolveIconName(icon, "check");
  if (stored !== "check") return stored;
  return guessAmenityIcon(name) ?? "check";
}

/** Ikon fasilitas gedung: ikon tersimpan dulu, lalu tebak dari nama, terakhir sparkles. */
export function resolveFacilityIcon(name: string, icon: string | null | undefined): IconName {
  if (isKnownIconName(icon)) return resolveIconName(icon);
  return guessFacilityIcon(name) ?? "sparkles";
}

/** Ikon landmark: ikon tersimpan dulu, lalu tebak dari nama (pola situs lama), terakhir map-pin. */
export function resolveLandmarkIcon(name: string, icon: string | null | undefined): IconName {
  if (isKnownIconName(icon)) return resolveIconName(icon, "map-pin");
  return guessLandmarkIcon(name) ?? "map-pin";
}

// ---------------------------------------------------------------------------
// Pilihan untuk admin
// ---------------------------------------------------------------------------

export type IconChoice = { name: IconName; label: string; keywords?: string };

/** Pilihan ikon fasilitas kamar & gedung di pemilih ikon admin (bisa dicari). */
export const ICON_CHOICES: IconChoice[] = [
  { name: "air-vent", label: "AC", keywords: "pendingin udara" },
  { name: "wifi", label: "WiFi", keywords: "internet" },
  { name: "tv", label: "TV", keywords: "televisi smart tv" },
  { name: "clapperboard", label: "Netflix / streaming", keywords: "film" },
  { name: "shower-head", label: "Water heater", keywords: "air panas mandi" },
  { name: "cooking-pot", label: "Dapur", keywords: "kitchen kompor masak" },
  { name: "bed-double", label: "Tempat tidur", keywords: "kasur queen king bed" },
  { name: "fence", label: "Balkon", keywords: "balcony" },
  { name: "refrigerator", label: "Kulkas", keywords: "lemari es" },
  { name: "washing-machine", label: "Mesin cuci", keywords: "laundry" },
  { name: "microwave", label: "Microwave" },
  { name: "sofa", label: "Sofa / ruang tamu", keywords: "living room" },
  { name: "laptop", label: "Meja kerja", keywords: "work desk belajar" },
  { name: "bath", label: "Perlengkapan mandi", keywords: "handuk toiletries" },
  { name: "shirt", label: "Setrika / lemari", keywords: "iron pakaian" },
  { name: "glass-water", label: "Dispenser air", keywords: "galon minum" },
  { name: "coffee", label: "Teko / kopi", keywords: "kettle" },
  { name: "utensils", label: "Alat makan", keywords: "meja makan" },
  { name: "eye", label: "Pemandangan", keywords: "view" },
  { name: "users", label: "Kapasitas tamu" },
  { name: "waves", label: "Kolam renang", keywords: "pool" },
  { name: "dumbbell", label: "Gym", keywords: "fitness" },
  { name: "trees", label: "Taman", keywords: "garden" },
  { name: "baby", label: "Area anak", keywords: "playground kids" },
  { name: "door-open", label: "Lobi", keywords: "lobby" },
  { name: "shield-check", label: "Keamanan 24 jam", keywords: "security satpam" },
  { name: "cctv", label: "CCTV" },
  { name: "square-parking", label: "Parkir", keywords: "parking" },
  { name: "arrow-up-down", label: "Lift", keywords: "elevator" },
  { name: "store", label: "Minimarket", keywords: "toko mart" },
  { name: "footprints", label: "Jogging track", keywords: "lari" },
  { name: "sun", label: "Sunset deck", keywords: "rooftop" },
  { name: "key-round", label: "Akses kartu", keywords: "key card" },
  { name: "wind", label: "Kipas angin", keywords: "fan" },
  { name: "sparkles", label: "Lainnya", keywords: "umum" },
  { name: "check", label: "Tanda centang", keywords: "umum" },
];

/** Kategori ikon landmark (PRD 7.7). */
export const LANDMARK_ICON_CHOICES: IconChoice[] = [
  { name: "shopping-bag", label: "Belanja / mall" },
  { name: "utensils-crossed", label: "Kuliner" },
  { name: "hospital", label: "Rumah sakit" },
  { name: "graduation-cap", label: "Kampus / sekolah" },
  { name: "tree-palm", label: "Wisata / pantai" },
  { name: "plane", label: "Transportasi / bandara" },
  { name: "music", label: "Hiburan" },
  { name: "landmark", label: "Ibadah / landmark kota" },
  { name: "route", label: "Jalan / tol" },
  { name: "map-pin", label: "Lainnya" },
];

// ---------------------------------------------------------------------------
// Komponen
// ---------------------------------------------------------------------------

export type IconProps = Omit<LucideProps, "ref"> & {
  name: string | null | undefined;
  fallback?: IconName;
};

/** Ikon dari nama DB. Dekoratif secara default (aria-hidden), stroke 1,75 (DESIGN 6). */
export function Icon({ name, fallback = "check", strokeWidth = 1.75, ...props }: IconProps) {
  const Component = ICONS[resolveIconName(name, fallback)];
  return <Component aria-hidden="true" strokeWidth={strokeWidth} {...props} />;
}
