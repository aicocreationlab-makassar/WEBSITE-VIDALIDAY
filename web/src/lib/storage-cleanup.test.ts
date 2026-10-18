import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chunk,
  collectReferencedPaths,
  deleteStorageFiles,
  deleteUnusedUnitPhotos,
  findUnreferenced,
  isSweepable,
  listBucketFiles,
  referencedPath,
  removedPaths,
  SWEEP_MIN_AGE_MS,
} from "@/lib/storage-cleanup";

type Supabase = Parameters<typeof deleteUnusedUnitPhotos>[0];
type Row = Record<string, unknown>;
type Tables = Partial<Record<"units" | "locations" | "facilities" | "settings", Row[]>>;
type StorageItem = { name: string; id: string | null; metadata: { size?: number } | null; created_at?: string };

/**
 * Klien tiruan: tabel berisi baris polos (filter neq/in diterapkan di memori), `remove` dicatat,
 * `list` membaca peta folder → halaman. `failTable` membuat select tabel itu mengembalikan error.
 */
function fakeSupabase(
  tables: Tables,
  options: { failTable?: keyof Tables; removeError?: boolean; listing?: Record<string, StorageItem[][]> } = {},
) {
  const remove = vi.fn(async (paths: string[]) => (options.removeError ? { data: null, error: { message: "boom" } } : { data: paths, error: null }));
  const listCalls: { folder: string; offset: number }[] = [];
  const list = vi.fn(async (folder: string, opts: { offset: number; limit: number }) => {
    listCalls.push({ folder, offset: opts.offset });
    const pages = options.listing?.[folder] ?? [[]];
    const page = pages[opts.offset / opts.limit] ?? [];
    return { data: page, error: null };
  });

  const pageCalls: { table: string; from: number; to: number }[] = [];
  function builder(table: keyof Tables) {
    let rows = tables[table] ?? [];
    const query = {
      select: () => query,
      order: () => query,
      neq: (column: string, value: unknown) => {
        rows = rows.filter((row) => row[column] !== value);
        return query;
      },
      in: (column: string, values: unknown[]) => {
        rows = rows.filter((row) => values.includes(row[column]));
        return query;
      },
      range: (from: number, to: number) => {
        pageCalls.push({ table, from, to });
        rows = rows.slice(from, to + 1);
        return query;
      },
      then: (resolve: (value: { data: Row[] | null; error: { code: string } | null }) => void) =>
        resolve(options.failTable === table ? { data: null, error: { code: "42P01" } } : { data: rows, error: null }),
    };
    return query;
  }

  const client = { from: vi.fn(builder), storage: { from: () => ({ remove, list }) } };
  return { client: client as unknown as Supabase, remove, list, listCalls, pageCalls, from: client.from };
}

const content: Tables = {
  units: [
    { id: 7, main_image: "units/a.webp", gallery_images: '["storage/units/b.webp", "https://images.unsplash.com/x"]' },
    { id: 8, main_image: "/storage/units/c.webp", gallery_images: ["units/b.webp"] },
  ],
  locations: [{ hero_image: "locations/hero.webp" }, { hero_image: null }],
  facilities: [{ image: "facilities/kolam.webp" }, { image: "https://cdn.test/luar.jpg" }],
  settings: [
    { key: "hero_image", value: "settings/hero.webp" },
    { key: "site_logo", value: " " },
    { key: "whatsapp_number", value: "units/bukan-foto.webp" },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("removedPaths", () => {
  it("hanya path bucket yang hilang, dinormalkan", () => {
    expect(removedPaths(["units/a.webp", "/storage/units/b.webp", "https://x.test/c.jpg"], ["units/a.webp"])).toEqual([
      "units/b.webp",
    ]);
  });
});

describe("chunk dan findUnreferenced", () => {
  it("memotong daftar dan menormalkan path", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 100)).toEqual([]);
    const referenced = new Set(["units/a.webp"]);
    expect(findUnreferenced(["storage/units/a.webp", "/units/x.webp", "https://x.test/c.jpg", null, "units/x.webp"], referenced)).toEqual([
      "units/x.webp",
    ]);
  });
});

describe("collectReferencedPaths", () => {
  it("mengumpulkan path dari unit (sampul + galeri), apartemen, fasilitas, dan pengaturan", async () => {
    const { client } = fakeSupabase(content);
    const referenced = await collectReferencedPaths(client);
    expect(referenced && [...referenced].sort()).toEqual([
      "facilities/kolam.webp",
      "locations/hero.webp",
      "settings/hero.webp",
      "units/a.webp",
      "units/b.webp",
      "units/c.webp",
    ]);
  });

  it("mengabaikan unit yang dikecualikan, tapi foto yang dipakai unit lain tetap terhitung", async () => {
    const { client } = fakeSupabase(content);
    const referenced = await collectReferencedPaths(client, { excludeUnitId: 7 });
    expect(referenced?.has("units/a.webp")).toBe(false);
    expect(referenced?.has("units/b.webp")).toBe(true);
  });

  it("URL publik bucket sendiri dihitung sebagai referensi, URL luar tidak", async () => {
    expect(referencedPath("https://abc.supabase.co/storage/v1/object/public/media/units/foto%20lama.jpg")).toBe("units/foto lama.jpg");
    expect(referencedPath("https://abc.supabase.co/storage/v1/object/media/locations/a.webp?t=1")).toBe("locations/a.webp");
    expect(referencedPath("https://images.unsplash.com/photo-1")).toBeNull();
    expect(referencedPath("/storage/units/a.webp")).toBe("units/a.webp");
    expect(referencedPath("  ")).toBeNull();
    const { client } = fakeSupabase({
      units: [{ id: 1, main_image: "https://abc.supabase.co/storage/v1/object/public/media/units/penuh.webp", gallery_images: [] }],
    });
    expect((await collectReferencedPaths(client))?.has("units/penuh.webp")).toBe(true);
  });

  it("membaca semua baris per 1000 (batas PostgREST)", async () => {
    const units = Array.from({ length: 1500 }, (_, i) => ({ id: i + 1, main_image: `units/${i}.webp`, gallery_images: [] }));
    const { client, pageCalls } = fakeSupabase({ units });
    const referenced = await collectReferencedPaths(client);
    expect(referenced?.has("units/1499.webp")).toBe(true);
    expect(pageCalls.filter((call) => call.table === "units").map((call) => call.from)).toEqual([0, 1000]);
  });

  it("null kalau salah satu tabel gagal dibaca", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client } = fakeSupabase(content, { failTable: "facilities" });
    expect(await collectReferencedPaths(client)).toBeNull();
  });
});

describe("deleteStorageFiles", () => {
  it("menghapus per 100 path dan melaporkan potongan yang gagal", async () => {
    const { client, remove } = fakeSupabase({});
    const paths = Array.from({ length: 150 }, (_, i) => `units/${i}.webp`);
    const result = await deleteStorageFiles(client, [...paths, "https://x.test/luar.jpg", "storage/units/0.webp"]);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove.mock.calls[0][0]).toHaveLength(100);
    expect(result.deleted).toHaveLength(150);
    expect(result.failed).toEqual([]);
  });

  it("tidak melempar saat Storage menolak; path gagal dikembalikan", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client } = fakeSupabase({}, { removeError: true });
    const result = await deleteStorageFiles(client, ["units/a.webp"]);
    expect(result).toEqual({ deleted: [], failed: ["units/a.webp"] });
  });
});

describe("deleteUnusedUnitPhotos", () => {
  it("tidak menyentuh file di luar folder units/", async () => {
    const { client, remove, from } = fakeSupabase(content);
    const result = await deleteUnusedUnitPhotos(client, ["locations/hero.webp", "facilities/kolam.webp"]);
    expect(result).toEqual({ deleted: [], kept: [] });
    expect(from).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("menghapus foto unit yang tidak dipakai baris mana pun", async () => {
    const { client, remove } = fakeSupabase(content);
    const result = await deleteUnusedUnitPhotos(client, ["storage/units/a.webp", "units/lama.webp"], 7);
    expect(result).toEqual({ deleted: ["units/a.webp", "units/lama.webp"], kept: [] });
    expect(remove).toHaveBeenCalledWith(["units/a.webp", "units/lama.webp"]);
  });

  it("menyimpan foto unit yang masih dipakai unit lain", async () => {
    const { client, remove } = fakeSupabase(content);
    const result = await deleteUnusedUnitPhotos(client, ["units/b.webp", "units/c.webp"], 7);
    expect(result).toEqual({ deleted: [], kept: ["units/b.webp", "units/c.webp"] });
    expect(remove).not.toHaveBeenCalled();
  });

  it("tidak menghapus apa pun kalau referensi gagal dibaca", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client, remove } = fakeSupabase(content, { failTable: "units" });
    const result = await deleteUnusedUnitPhotos(client, ["units/a.webp"], 7);
    expect(result).toEqual({ deleted: [], kept: ["units/a.webp"] });
    expect(remove).not.toHaveBeenCalled();
  });
});

describe("isSweepable", () => {
  it("melewati unggahan < 24 jam (bisa jadi form belum disimpan)", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    expect(isSweepable({ createdAt: "2026-10-18T11:00:00Z" }, now)).toBe(false);
    expect(isSweepable({ createdAt: new Date(now - SWEEP_MIN_AGE_MS).toISOString() }, now)).toBe(true);
    expect(isSweepable({ createdAt: null }, now)).toBe(true);
    expect(isSweepable({ createdAt: "bukan tanggal" }, now)).toBe(true);
  });
});

describe("listBucketFiles", () => {
  it("melewati subfolder dan penanda folder kosong, lalu membaca halaman berikutnya", async () => {
    const page1: StorageItem[] = Array.from({ length: 1000 }, (_, i) => ({ name: `${i}.webp`, id: `id-${i}`, metadata: { size: 10 } }));
    const page2: StorageItem[] = [
      { name: "x.webp", id: "id-x", metadata: { size: 2048 }, created_at: "2026-10-01T00:00:00Z" },
      { name: "sub", id: null, metadata: null },
      { name: ".emptyFolderPlaceholder", id: "id-p", metadata: { size: 0 } },
    ];
    const { client, listCalls } = fakeSupabase({}, { listing: { units: [page1, page2] } });
    const files = await listBucketFiles(client, "units");
    expect(files).toHaveLength(1001);
    expect(files?.[1000]).toEqual({ path: "units/x.webp", bytes: 2048, createdAt: "2026-10-01T00:00:00Z" });
    expect(listCalls).toEqual([
      { folder: "units", offset: 0 },
      { folder: "units", offset: 1000 },
    ]);
  });
});
