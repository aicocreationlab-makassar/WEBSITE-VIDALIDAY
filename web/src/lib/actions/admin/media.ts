"use server";

// Sapuan bucket media (Pengaturan → "Bersihkan file tak terpakai"). guardAdmin() → daftar file per
// folder dibandingkan dengan semua path yang masih dirujuk tabel konten → hapus yang yatim.
// Sebelum menghapus, referensi dibaca ULANG supaya file yang baru dipakai sejak pemeriksaan dilewati.

import { z } from "zod";
import { guardAdmin, type ActionResult } from "@/lib/actions/admin/guard";
import {
  collectReferencedPaths,
  deleteStorageFiles,
  findUnreferenced,
  listBucketFiles,
  MEDIA_FOLDERS,
  type MediaFolder,
} from "@/lib/storage-cleanup";

export type UnusedMediaFolder = { folder: MediaFolder; count: number; bytes: number; paths: string[] };
export type UnusedMediaScan = {
  folders: UnusedMediaFolder[];
  /** Jumlah dan ukuran semua file yatim. */
  total: number;
  bytes: number;
  /** Jumlah semua file di folder yang diperiksa. */
  files: number;
};
export type SweepResult = { deleted: number; failed: number; skipped: number };

const MSG_REFERENCES = "Daftar foto yang dipakai situs gagal dibaca. Coba lagi sebentar lagi.";
const MSG_LIST = "Daftar file di Storage gagal dibaca. Coba lagi sebentar lagi.";
const MSG_INVALID = "Daftar file tidak valid. Periksa ulang dulu lalu coba lagi.";

const MANAGED_PATH = /^(units|locations|facilities|settings)\/[A-Za-z0-9._-]+$/;
const sweepSchema = z.array(z.string().max(200).regex(MANAGED_PATH)).min(1).max(2000);

/** Cari file di bucket yang tidak dirujuk unit, apartemen, fasilitas, maupun pengaturan. */
export async function scanUnusedMedia(): Promise<ActionResult<UnusedMediaScan>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;
  const supabase = auth.session.supabase;

  const [referenced, ...lists] = await Promise.all([
    collectReferencedPaths(supabase),
    ...MEDIA_FOLDERS.map((folder) => listBucketFiles(supabase, folder)),
  ]);
  if (!referenced) return { ok: false, error: MSG_REFERENCES };
  if (lists.some((list) => list === null)) return { ok: false, error: MSG_LIST };

  const folders: UnusedMediaFolder[] = MEDIA_FOLDERS.map((folder, index) => {
    const files = lists[index] ?? [];
    const unused = files.filter((file) => !referenced.has(file.path));
    return {
      folder,
      count: unused.length,
      bytes: unused.reduce((sum, file) => sum + file.bytes, 0),
      paths: unused.map((file) => file.path),
    };
  });
  return {
    ok: true,
    data: {
      folders,
      total: folders.reduce((sum, item) => sum + item.count, 0),
      bytes: folders.reduce((sum, item) => sum + item.bytes, 0),
      files: lists.reduce((sum, list) => sum + (list?.length ?? 0), 0),
    },
  };
}

/** Hapus file yatim hasil pemeriksaan. Path yang sudah dipakai lagi sejak pemeriksaan dilewati. */
export async function sweepUnusedMedia(input: unknown): Promise<ActionResult<SweepResult>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = sweepSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_INVALID };
  const paths = [...new Set(parsed.data)];
  const supabase = auth.session.supabase;

  const referenced = await collectReferencedPaths(supabase);
  if (!referenced) return { ok: false, error: MSG_REFERENCES };
  const targets = findUnreferenced(paths, referenced);
  const skipped = paths.length - targets.length;
  if (!targets.length) {
    return { ok: true, message: "Semua file itu sudah dipakai lagi; tidak ada yang dihapus", data: { deleted: 0, failed: 0, skipped } };
  }

  const result = await deleteStorageFiles(supabase, targets, "sapuan media");
  const parts = [`${result.deleted.length} file dihapus`];
  if (result.failed.length) parts.push(`${result.failed.length} gagal dihapus`);
  if (skipped) parts.push(`${skipped} dilewati karena dipakai lagi`);
  return {
    ok: result.failed.length === 0 || result.deleted.length > 0,
    message: parts.join(", "),
    error: parts.join(", "),
    data: { deleted: result.deleted.length, failed: result.failed.length, skipped },
  } as ActionResult<SweepResult>;
}
