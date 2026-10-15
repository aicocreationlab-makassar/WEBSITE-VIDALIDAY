import "server-only";
import { isBucketPath, MEDIA_BUCKET, normalizeStoragePath } from "@/lib/media";
import type { AdminSession } from "@/lib/auth/require-admin";

/** Path bucket yang hilang dari daftar lama → baru (URL eksternal diabaikan, seperti StorageHelper lama). */
export function removedPaths(before: (string | null | undefined)[], after: (string | null | undefined)[]): string[] {
  const keep = new Set(after.filter(isBucketPath).map(normalizeStoragePath));
  return [...new Set(before.filter(isBucketPath).map(normalizeStoragePath))].filter((path) => !keep.has(path));
}

/** Folder foto unit (sama di versi lama: `store('units')`). File di luar folder ini tidak pernah dihapus dari sini. */
const UNIT_PHOTO_PREFIX = "units/";

/**
 * Hapus file foto unit dari Storage hanya kalau tidak dipakai unit lain
 * (unit hasil "Duplikat" berbagi foto dengan unit aslinya). Kegagalan tidak membatalkan simpan.
 */
export async function deleteUnusedUnitPhotos(
  supabase: AdminSession["supabase"],
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

  const kept: string[] = [];
  const deletable: string[] = [];
  for (const path of candidates) {
    const variants = [path, `storage/${path}`, `/storage/${path}`];
    let query = supabase
      .from("units")
      .select("id", { count: "exact", head: true })
      .or(
        [
          ...variants.map((v) => `main_image.eq.${v}`),
          ...variants.map((v) => `gallery_images.cs.${JSON.stringify([v])}`),
        ].join(","),
      );
    if (excludeUnitId) query = query.neq("id", excludeUnitId);
    const { count, error } = await query;
    if (error || (count ?? 0) > 0) kept.push(path);
    else deletable.push(path);
  }

  if (deletable.length) {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(deletable);
    if (error) return { deleted: [], kept: [...kept, ...deletable] };
  }
  return { deleted: deletable, kept };
}

/** Hapus file tunggal (fasilitas, apartemen, logo, hero) kalau path bucket. */
export async function deleteStorageFiles(supabase: AdminSession["supabase"], paths: (string | null | undefined)[]) {
  const list = [...new Set(paths.filter(isBucketPath).map(normalizeStoragePath))];
  if (!list.length) return;
  await supabase.storage.from(MEDIA_BUCKET).remove(list);
}
