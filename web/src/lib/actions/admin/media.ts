"use server";

// Sapuan bucket media (Pengaturan → "Bersihkan file tak terpakai"). guardAdmin() → daftar file per
// folder dibandingkan dengan semua path yang masih dirujuk tabel konten → hapus yang yatim.
// File yang diunggah < 24 jam terakhir dilewati (bisa jadi foto di form yang belum disimpan), dan
// sebelum menghapus referensi + umur file dibaca ULANG, jadi daftar dari klien hanya usulan.

import { z } from "zod";
import { guardAdmin, type ActionResult } from "@/lib/actions/admin/guard";
import {
  collectReferencedPaths,
  deleteStorageFiles,
  findUnreferenced,
  isSweepable,
  listBucketFiles,
  MEDIA_FOLDERS,
  type BucketFile,
  type MediaFolder,
} from "@/lib/storage-cleanup";

export type UnusedMediaFolder = { folder: MediaFolder; count: number; bytes: number; paths: string[] };
export type UnusedMediaScan = {
  folders: UnusedMediaFolder[];
  /** Jumlah dan ukuran semua file yatim yang boleh dihapus. */
  total: number;
  bytes: number;
  /** Jumlah semua file di folder yang diperiksa. */
  files: number;
  /** File yatim yang dilewati karena baru diunggah (< 24 jam). */
  recent: number;
};
export type SweepResult = { deleted: number; failed: number; skipped: number };

const MSG_REFERENCES = "Daftar foto yang dipakai situs gagal dibaca. Coba lagi sebentar lagi.";
const MSG_LIST = "Daftar file di Storage gagal dibaca. Coba lagi sebentar lagi.";
const MSG_INVALID = "Daftar file tidak valid. Periksa ulang dulu lalu coba lagi.";

/** Path di salah satu folder yang dikelola: satu segmen nama file, tanpa "..", "/" atau "\". */
const MANAGED_PATH = /^(units|locations|facilities|settings)\/(?!.*\.\.)[^/\\\u0000-\u001f]+$/;
const sweepSchema = z.array(z.string().max(300)).min(1).max(5000);

async function listAll(supabase: Parameters<typeof listBucketFiles>[0]): Promise<BucketFile[][] | null> {
  const lists = await Promise.all(MEDIA_FOLDERS.map((folder) => listBucketFiles(supabase, folder)));
  return lists.some((list) => list === null) ? null : (lists as BucketFile[][]);
}

/** Cari file di bucket yang tidak dirujuk unit, apartemen, fasilitas, maupun pengaturan. */
export async function scanUnusedMedia(): Promise<ActionResult<UnusedMediaScan>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;
  const supabase = auth.session.supabase;

  const [referenced, lists] = await Promise.all([collectReferencedPaths(supabase), listAll(supabase)]);
  if (!referenced) return { ok: false, error: MSG_REFERENCES };
  if (!lists) return { ok: false, error: MSG_LIST };

  const now = Date.now();
  let recent = 0;
  const folders: UnusedMediaFolder[] = MEDIA_FOLDERS.map((folder, index) => {
    const unused = lists[index].filter((file) => !referenced.has(file.path));
    const old = unused.filter((file) => isSweepable(file, now));
    recent += unused.length - old.length;
    return {
      folder,
      count: old.length,
      bytes: old.reduce((sum, file) => sum + file.bytes, 0),
      paths: old.map((file) => file.path),
    };
  });
  return {
    ok: true,
    data: {
      folders,
      total: folders.reduce((sum, item) => sum + item.count, 0),
      bytes: folders.reduce((sum, item) => sum + item.bytes, 0),
      files: lists.reduce((sum, list) => sum + list.length, 0),
      recent,
    },
  };
}

/** Hapus file yatim hasil pemeriksaan. Path yang sudah dipakai lagi atau baru diunggah dilewati. */
export async function sweepUnusedMedia(input: unknown): Promise<ActionResult<SweepResult>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = sweepSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_INVALID };
  // Path di luar folder yang dikelola diabaikan satu per satu (tidak menggagalkan seluruh sapuan).
  const requested = [...new Set(parsed.data.map((path) => path.trim()).filter((path) => MANAGED_PATH.test(path)))];
  if (!requested.length) return { ok: false, error: MSG_INVALID };
  const supabase = auth.session.supabase;

  const [referenced, lists] = await Promise.all([collectReferencedPaths(supabase), listAll(supabase)]);
  if (!referenced) return { ok: false, error: MSG_REFERENCES };
  if (!lists) return { ok: false, error: MSG_LIST };

  // Hanya file yang memang ada di bucket, sudah cukup tua, dan masih tidak dirujuk.
  const now = Date.now();
  const sweepable = new Set(lists.flat().filter((file) => isSweepable(file, now)).map((file) => file.path));
  const targets = findUnreferenced(
    requested.filter((path) => sweepable.has(path)),
    referenced,
  );
  const skipped = requested.length - targets.length;
  if (!targets.length) {
    return { ok: true, message: "Semua file itu sudah dipakai lagi atau baru diunggah; tidak ada yang dihapus", data: { deleted: 0, failed: 0, skipped } };
  }

  const result = await deleteStorageFiles(supabase, targets, "sapuan media");
  const parts = [`${result.deleted.length} file dihapus`];
  if (result.failed.length) parts.push(`${result.failed.length} gagal dihapus`);
  if (skipped) parts.push(`${skipped} dilewati karena dipakai lagi atau baru diunggah`);
  const data = { deleted: result.deleted.length, failed: result.failed.length, skipped };
  if (!result.deleted.length && result.failed.length) return { ok: false, error: parts.join(", ") };
  return { ok: true, message: parts.join(", "), data };
}
