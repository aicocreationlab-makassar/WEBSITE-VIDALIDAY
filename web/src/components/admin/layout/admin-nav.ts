import {
  AirVent,
  BedDouble,
  Building2,
  CircleHelp,
  Inbox,
  Info,
  LayoutDashboard,
  MapPin,
  Settings,
  Waves,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Tampilkan badge jumlah permintaan sewa baru. */
  showLeadsBadge?: boolean;
};

export const ADMIN_HOME = "/admin";

// Urutan menu PRD 7.2.
export const ADMIN_NAV: readonly AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Unit kamar", href: "/admin/units", icon: BedDouble },
  { label: "Permintaan sewa", href: "/admin/leads", icon: Inbox, showLeadsBadge: true },
  { label: "Apartemen & tipe kamar", href: "/admin/locations", icon: Building2 },
  { label: "Fasilitas kamar", href: "/admin/amenities", icon: AirVent },
  { label: "Fasilitas gedung", href: "/admin/facilities", icon: Waves },
  { label: "Landmark", href: "/admin/landmarks", icon: MapPin },
  { label: "FAQ", href: "/admin/faqs", icon: CircleHelp },
  { label: "Halaman About", href: "/admin/about", icon: Info },
  { label: "Pengaturan", href: "/admin/settings", icon: Settings },
];

function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/** Aktif bila sama persis atau halaman turunannya. Dashboard hanya aktif di `/admin` persis. */
export function isNavItemActive(pathname: string, href: string): boolean {
  const path = normalize(pathname);
  if (href === ADMIN_HOME) return path === ADMIN_HOME;
  return path === href || path.startsWith(`${href}/`);
}

/** Judul halaman di topbar, diturunkan dari pathname. */
export function getAdminPageTitle(pathname: string): string {
  const path = normalize(pathname);
  if (path === "/admin/units/new") return "Tambah unit";
  if (/^\/admin\/units\/[^/]+$/.test(path)) return "Ubah unit";
  if (path === "/admin/locations/new") return "Tambah apartemen";
  if (/^\/admin\/locations\/[^/]+$/.test(path)) return "Ubah apartemen";

  let match: AdminNavItem | undefined;
  for (const item of ADMIN_NAV) {
    if (isNavItemActive(path, item.href) && (!match || item.href.length > match.href.length)) {
      match = item;
    }
  }
  return match?.label ?? "Panel admin";
}

/** Teks badge: maksimal "99+". */
export function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}
