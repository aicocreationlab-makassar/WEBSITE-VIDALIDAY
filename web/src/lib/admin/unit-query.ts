// Daftar unit admin: pencarian, filter, urutan, paginasi (PRD 7.4). Semua state di query URL.
// Fungsi murni atas semua unit (< 200 baris), ada unit test.

export type HealthFlag =
  | "tanpa-tower-lantai"
  | "tamu-janggal"
  | "label-promo-lama"
  | "tanpa-foto"
  | "harga-promo-janggal"
  | "periode-bukan-harian"
  | "tanpa-tipe";

export type AdminUnitRow = {
  id: number;
  name: string;
  slug: string;
  tower: string | null;
  floorNumber: number | null;
  locationId: number;
  locationShortName: string;
  roomTypeId: number | null;
  roomTypeName: string | null;
  maxGuests: number;
  normalPrice: number;
  promoPrice: number;
  isPromoActive: boolean;
  promoBadge: string | null;
  effectivePrice: number;
  isPublished: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  /** URL foto sampul siap tampil, null kalau tidak ada / foto stok. */
  coverUrl: string | null;
  updatedAt: string;
  flags: HealthFlag[];
};

export type AdminUnitSort = "diubah" | "nama" | "termurah" | "termahal";

export type AdminUnitFilter = {
  q: string;
  lokasi: number | null;
  tipe: number | null;
  status: "tampil" | "draft" | null;
  stok: "tersedia" | "penuh" | null;
  promo: "aktif" | "tidak" | null;
  unggulan: boolean;
  cek: boolean;
  urut: AdminUnitSort;
  hal: number;
};

export const ADMIN_PAGE_SIZE = 20;

export const EMPTY_ADMIN_FILTER: AdminUnitFilter = {
  q: "",
  lokasi: null,
  tipe: null,
  status: null,
  stok: null,
  promo: null,
  unggulan: false,
  cek: false,
  urut: "diubah",
  hal: 1,
};

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function get(params: RawParams, key: string): string | null {
  if (params instanceof URLSearchParams) return params.get(key);
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

function id(value: string | null): number | null {
  if (!value || !/^\d{1,10}$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

function oneOf<T extends string>(value: string | null, options: readonly T[]): T | null {
  return options.includes(value as T) ? (value as T) : null;
}

export function parseAdminUnitFilter(params: RawParams): AdminUnitFilter {
  const lokasi = id(get(params, "lokasi"));
  const page = Number(get(params, "hal"));
  return {
    q: (get(params, "q") ?? "").trim().slice(0, 80),
    lokasi,
    tipe: lokasi ? id(get(params, "tipe")) : null,
    status: oneOf(get(params, "status"), ["tampil", "draft"] as const),
    stok: oneOf(get(params, "stok"), ["tersedia", "penuh"] as const),
    promo: oneOf(get(params, "promo"), ["aktif", "tidak"] as const),
    unggulan: get(params, "unggulan") === "1",
    cek: get(params, "cek") === "1",
    urut: oneOf(get(params, "urut"), ["diubah", "nama", "termurah", "termahal"] as const) ?? "diubah",
    hal: Number.isInteger(page) && page >= 1 && page <= 500 ? page : 1,
  };
}

export function adminUnitParams(filter: Partial<AdminUnitFilter>): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.lokasi) params.set("lokasi", String(filter.lokasi));
  if (filter.lokasi && filter.tipe) params.set("tipe", String(filter.tipe));
  if (filter.status) params.set("status", filter.status);
  if (filter.stok) params.set("stok", filter.stok);
  if (filter.promo) params.set("promo", filter.promo);
  if (filter.unggulan) params.set("unggulan", "1");
  if (filter.cek) params.set("cek", "1");
  if (filter.urut && filter.urut !== "diubah") params.set("urut", filter.urut);
  if (filter.hal && filter.hal > 1) params.set("hal", String(filter.hal));
  return params;
}

/** Huruf kecil tanpa spasi/tanda baca: "AT 26X" dan "at26x" sama. */
export function normalizeSearch(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
}

/** Setiap token harus cocok di nama, slug, tower, tipe, atau apartemen. */
export function matchesQuery(row: AdminUnitRow, query: string): boolean {
  const tokens = query.split(/\s+/).map(normalizeSearch).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalizeSearch(
    [row.name, row.slug, row.tower ?? "", row.roomTypeName ?? "", row.locationShortName].join(" "),
  );
  const bareName = normalizeSearch(row.name);
  return tokens.every((token) => haystack.includes(token) || bareName.includes(token));
}

function matches(row: AdminUnitRow, f: AdminUnitFilter, ignore: (keyof AdminUnitFilter)[] = []): boolean {
  const skip = (key: keyof AdminUnitFilter) => ignore.includes(key);
  if (!skip("q") && !matchesQuery(row, f.q)) return false;
  if (!skip("lokasi") && f.lokasi && row.locationId !== f.lokasi) return false;
  if (!skip("tipe") && f.tipe && row.roomTypeId !== f.tipe) return false;
  if (!skip("status") && f.status && row.isPublished !== (f.status === "tampil")) return false;
  if (!skip("stok") && f.stok && row.isAvailable !== (f.stok === "tersedia")) return false;
  if (!skip("promo") && f.promo && row.isPromoActive !== (f.promo === "aktif")) return false;
  if (!skip("unggulan") && f.unggulan && !row.isFeatured) return false;
  if (!skip("cek") && f.cek && row.flags.length === 0) return false;
  return true;
}

const SORTERS: Record<AdminUnitSort, (a: AdminUnitRow, b: AdminUnitRow) => number> = {
  diubah: (a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id,
  nama: (a, b) => a.name.localeCompare(b.name, "id", { numeric: true, sensitivity: "base" }) || a.id - b.id,
  termurah: (a, b) => a.effectivePrice - b.effectivePrice || a.id - b.id,
  termahal: (a, b) => b.effectivePrice - a.effectivePrice || a.id - b.id,
};

export type QuickCounts = {
  semua: number;
  cek: number;
  penuh: number;
  promo: number;
  draft: number;
  unggulan: number;
};

export type AdminUnitQueryResult = {
  items: AdminUnitRow[];
  total: number;
  page: number;
  pageCount: number;
  /** Jumlah untuk chip cepat, dihitung dengan pencarian + apartemen/tipe saat ini. */
  counts: QuickCounts;
  /** Total unit tanpa filter apa pun. */
  grandTotal: number;
};

export function queryAdminUnits(rows: AdminUnitRow[], filter: AdminUnitFilter): AdminUnitQueryResult {
  const filtered = rows.filter((row) => matches(row, filter)).sort(SORTERS[filter.urut]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const page = Math.min(filter.hal, pageCount);
  const base = rows.filter((row) =>
    matches(row, filter, ["status", "stok", "promo", "unggulan", "cek"]),
  );
  return {
    items: filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE),
    total: filtered.length,
    page,
    pageCount,
    grandTotal: rows.length,
    counts: {
      semua: base.length,
      cek: base.filter((r) => r.flags.length > 0).length,
      penuh: base.filter((r) => !r.isAvailable).length,
      promo: base.filter((r) => r.isPromoActive).length,
      draft: base.filter((r) => !r.isPublished).length,
      unggulan: base.filter((r) => r.isFeatured).length,
    },
  };
}
