import "server-only";
import { isBucketPath, MEDIA_BUCKET, normalizeStoragePath, parseGallery } from "@/lib/media";
import type { AdminSession } from "@/lib/auth/require-admin";

// Kebersihan bucket `media` (PRD 7.4, 7.5, 7.7, 7.9): file yang tidak lagi dirujuk tabel konten dihapus,
// supaya yang tersimpan di Storage sama dengan yang dipakai situs. Satu pemeriksaan referensi dipakai semua
// aksi admin (unit, apartemen, fasilitas, pengaturan) dan sapuan "Bersihkan file tak terpakai".
// Kegagalan membaca referensi berarti TIDAK ADA yang dihapus (lebih aman tersisa daripada hilang).

type Supabase = AdminSession["supabase"];

/** Folder di bucket media yang dikelola admin. File di luar folder ini tidak pernah disentuh. */
export const MEDIA_FOLDERS = ["units", "locations", "facilities", "settings"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

/** Kunci setting yang menyimpan path foto di bucket. */
const SETTING_IMAGE_KEYS = ["hero_image", "site_logo"];

/** Folder foto unit (sama di versi lama: `store('units')`). */
const UNIT_PHOTO_PREFIX = "units/";

/** Ukuran potongan untuk `storage.remove()` dan `storage.list()`, dan halaman baca tabel (batas PostgREST). */
const REMOVE_CHUNK = 100;
const LIST_PAGE = 1000;
const ROW_PAGE = 1000;

/**
 * File yang baru diunggah belum tentu sudah disimpan di form (admin masih mengisi). Sapuan melewati file
 * yang lebih muda dari ini supaya foto di form yang belum disimpan tidak ikut terhapus.
 */
export const SWEEP_MIN_AGE_MS = 24 * 60 * 60 * 1000;

const OWN_BUCKET_URL = new RegExp(`/storage/v1/object/(?:public/)?${MEDIA_BUCKET}/([^?#]+)`);

/**
 * Nilai kolom foto → path bucket yang dirujuk: path biasa ("units/a.webp", "/storage/units/a.webp") atau
 * URL publik bucket ini sendiri (".../storage/v1/object/public/media/units/a.webp"). URL luar → null.
 */
export function referencedPath(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  if (isBucketPath(raw)) return normalizeStoragePath(raw);
  const match = OWN_BUCKET_URL.exec(raw);
  if (!match) return null;
  try {
    return normalizeStoragePath(decodeURIComponent(match[1]));
  } catch {
    return normalizeStoragePath(match[1]);
  }
}

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { code?: string } | null }>;

/** Baca semua baris per 1000 (PostgREST memotong respons di max-rows). */
async function readAllRows<T>(page: (from: number, to: number) => PageResult<T>): Promise<{ data: T[]; error: { code?: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += ROW_PAGE) {
    const { data, error } = await page(from, from + ROW_PAGE - 1);
    if (error) return { data: rows, error };
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < ROW_PAGE) return { data: rows, error: null };
  }
}

/** Path bucket yang hilang dari daftar lama → baru (URL eksternal diabaikan, seperti StorageHelper lama). */
export function removedPaths(before: (string | null | undefined)[], after: (string | null | undefined)[]): string[] {
  const keep = new Set(after.filter(isBucketPath).map(normalizeStoragePath));
  return [...new Set(before.filter(isBucketPath).map(normalizeStoragePath))].filter((path) => !keep.has(path));
}

export function chunk<T>(list: readonly T[], size: number): T[][] {
  const parts: T[][] = [];
  for (let index = 0; index < list.length; index += size) parts.push(list.slice(index, index + size));
  return parts;
}

/**
 * Semua path bucket yang masih dirujuk tabel konten: foto unit (sampul + galeri), foto apartemen,
 * foto fasilitas, foto hero dan logo di pengaturan. `excludeUnitId` mengabaikan satu unit (yang baru
 * saja diubah, nilai lamanya sudah tidak berlaku). null = ada query yang gagal → jangan hapus apa pun.
 */
export async function collectReferencedPaths(
  supabase: Supabase,
  options: { excludeUnitId?: number } = {},
): Promise<Set<string> | null> {
  const [unitRows, locationRows, facilityRows, settingRows] = await Promise.all([
    readAllRows<{ id: number; main_image: string | null; gallery_images: unknown }>((from, to) => {
      let query = supabase.from("units").select("id, main_image, gallery_images").order("id");
      if (options.excludeUnitId) query = query.neq("id", options.excludeUnitId);
      return query.range(from, to);
    }),
    readAllRows<{ hero_image: string | null }>((from, to) => supabase.from("locations").select("hero_image").order("id").range(from, to)),
    readAllRows<{ image: string | null }>((from, to) => supabase.from("facilities").select("image").order("id").range(from, to)),
    readAllRows<{ value: string | null }>((from, to) =>
      supabase.from("settings").select("value").in("key", SETTING_IMAGE_KEYS).order("key").range(from, to),
    ),
  ]);
  const failed = [unitRows, locationRows, facilityRows, settingRows].find((result) => result.error);
  if (failed) {
    console.error("[storage-cleanup] baca referensi gagal", { code: failed.error?.code });
    return null;
  }

  const referenced = new Set<string>();
  const add = (value: string | null | undefined) => {
    const path = referencedPath(value);
    if (path) referenced.add(path);
  };
  for (const row of unitRows.data ?? []) {
    add(row.main_image);
    for (const photo of parseGallery(row.gallery_images)) add(photo);
  }
  for (const row of locationRows.data ?? []) add(row.hero_image);
  for (const row of facilityRows.data ?? []) add(row.image);
  for (const row of settingRows.data ?? []) add(row.value);
  return referenced;
}

/** Path bucket (dinormalkan, tanpa duplikat) yang tidak ada di daftar referensi. */
export function findUnreferenced(paths: Iterable<string | null | undefined>, referenced: ReadonlySet<string>): string[] {
  const list = [...new Set([...paths].filter(isBucketPath).map(normalizeStoragePath))];
  return list.filter((path) => !referenced.has(path));
}

/**
 * Hapus file dari bucket per 100 path. Kegagalan dicatat (jumlah dan pesan, tanpa data tamu) dan
 * dilaporkan lewat `failed`, tidak dilempar: sisa file tidak merusak situs.
 */
export async function deleteStorageFiles(
  supabase: Supabase,
  paths: (string | null | undefined)[],
  context = "storage",
): Promise<{ deleted: string[]; failed: string[] }> {
  const list = [...new Set(paths.filter(isBucketPath).map(normalizeStoragePath))];
  const deleted: string[] = [];
  const failed: string[] = [];
  for (const part of chunk(list, REMOVE_CHUNK)) {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(part);
    if (error) {
      console.error(`[storage-cleanup] hapus ${context} gagal`, { count: part.length, message: error.message });
      failed.push(...part);
    } else {
      // remove() tidak mengeluh untuk path yang sudah tidak ada: dianggap bersih.
      deleted.push(...part);
    }
  }
  return { deleted, failed };
}

/**
 * Hapus file foto unit dari Storage hanya kalau tidak dipakai unit lain (unit hasil "Duplikat" berbagi
 * foto dengan unit aslinya) atau baris lain mana pun. Kegagalan tidak membatalkan simpan.
 */
export async function deleteUnusedUnitPhotos(
  supabase: Supabase,
  paths: string[],
  excludeUnitId?: number,
): Promise<{ deleted: string[]; kept: string[] }> {
  // Path yang menunjuk ke folder lain (mis. foto apartemen dipakai sebagai sampul) tidak disentuh.
  const candidates = [
    ...new Set(
      paths
        .filter(isBucketPath)
        .map(normalizeStoragePath)
        .filter((path) => path.startsWith(UNIT_PHOTO_PREFIX)),
    ),
  ];
  if (!candidates.length) return { deleted: [], kept: [] };

  const referenced = await collectReferencedPaths(supabase, { excludeUnitId });
  if (!referenced) return { deleted: [], kept: candidates };

  const deletable = candidates.filter((path) => !referenced.has(path));
  const kept = candidates.filter((path) => referenced.has(path));
  if (!deletable.length) return { deleted: [], kept };

  const result = await deleteStorageFiles(supabase, deletable, "foto unit");
  return { deleted: result.deleted, kept: [...kept, ...result.failed] };
}

export type BucketFile = {
  path: string;
  bytes: number;
  /** Waktu unggah (ISO) dari metadata Storage; null kalau tidak ada. */
  createdAt: string | null;
};

/** File cukup tua untuk disapu (unggahan < 24 jam dilewati; tanpa tanggal dianggap tua). */
export function isSweepable(file: Pick<BucketFile, "createdAt">, now: number, minAgeMs = SWEEP_MIN_AGE_MS): boolean {
  if (!file.createdAt) return true;
  const time = Date.parse(file.createdAt);
  return Number.isNaN(time) || now - time >= minAgeMs;
}

/** Semua file di satu folder bucket (paginasi 1000). null kalau Storage gagal dibaca. */
export async function listBucketFiles(supabase: Supabase, folder: MediaFolder): Promise<BucketFile[] | null> {
  const files: BucketFile[] = [];
  for (let offset = 0; ; offset += LIST_PAGE) {
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(folder, { limit: LIST_PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) {
      console.error("[storage-cleanup] daftar folder gagal", { folder, message: error.message });
      return null;
    }
    for (const item of data ?? []) {
      // Subfolder (id null) dan penanda folder kosong bukan file.
      if (!item.id || item.name === ".emptyFolderPlaceholder") continue;
      const size = Number((item.metadata as { size?: unknown } | null)?.size ?? 0);
      files.push({
        path: `${folder}/${item.name}`,
        bytes: Number.isFinite(size) ? size : 0,
        createdAt: item.created_at ?? item.updated_at ?? null,
      });
    }
    if ((data?.length ?? 0) < LIST_PAGE) break;
  }
  return files;
}
