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

/** Ukuran potongan untuk `storage.remove()` dan `storage.list()`. */
const REMOVE_CHUNK = 100;
const LIST_PAGE = 1000;

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
  let units = supabase.from("units").select("id, main_image, gallery_images");
  if (options.excludeUnitId) units = units.neq("id", options.excludeUnitId);
  const [unitRows, locationRows, facilityRows, settingRows] = await Promise.all([
    units,
    supabase.from("locations").select("hero_image"),
    supabase.from("facilities").select("image"),
    supabase.from("settings").select("value").in("key", SETTING_IMAGE_KEYS),
  ]);
  const failed = [unitRows, locationRows, facilityRows, settingRows].find((result) => result.error);
  if (failed) {
    console.error("[storage-cleanup] baca referensi gagal", { code: failed.error?.code });
    return null;
  }

  const referenced = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (isBucketPath(value)) referenced.add(normalizeStoragePath(value));
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

export type BucketFile = { path: string; bytes: number };

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
      files.push({ path: `${folder}/${item.name}`, bytes: Number.isFinite(size) ? size : 0 });
    }
    if ((data?.length ?? 0) < LIST_PAGE) break;
  }
  return files;
}
