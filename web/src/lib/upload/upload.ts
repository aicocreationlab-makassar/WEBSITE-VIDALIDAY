"use client";

// Unggah langsung dari browser ke Storage `media/<folder>/<uuid>.webp` dengan sesi admin
// (RLS storage: hanya admin). Server Action hanya menerima path hasilnya.

import { getBrowserSupabase } from "@/lib/supabase/browser";
import { MEDIA_BUCKET } from "@/lib/media";
import { prepareImage, UploadRejected } from "./compress";

export type MediaFolder = "units" | "facilities" | "locations" | "settings";

export type UploadResult = { path: string; width: number; height: number };

/** Pesan Storage (bahasa Inggris, teknis) → teks admin dalam Bahasa Indonesia. */
export function uploadErrorMessage(message: string): string {
  if (/row-level security|not authorized|unauthorized|jwt/i.test(message)) {
    return "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi.";
  }
  if (/failed to fetch|load failed|network|timeout|aborted/i.test(message)) {
    return "Koneksi terputus saat mengunggah. Periksa internet lalu coba lagi.";
  }
  if (/payload too large|too large|exceeded the maximum/i.test(message)) {
    return "Ukuran foto terlalu besar untuk Storage. Pilih foto yang lebih kecil.";
  }
  console.error("[upload] Storage menolak unggahan", { message });
  return "Gagal mengunggah foto. Coba lagi.";
}

export async function uploadImage(
  file: File,
  folder: MediaFolder,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  let prepared: Awaited<ReturnType<typeof prepareImage>>;
  try {
    prepared = await prepareImage(file, (p) => onProgress?.(Math.round(p * 0.7)));
  } catch (error) {
    if (error instanceof UploadRejected) throw error;
    // Pesan bawaan browser (DOMException, dll.) berbahasa Inggris; tampilkan teks yang bisa ditindaklanjuti.
    console.error("[upload] gagal memproses foto", { name: (error as Error)?.name });
    throw new Error(`"${file.name}" tidak bisa diproses. Coba foto lain atau simpan ulang sebagai JPG.`);
  }
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await getBrowserSupabase()
    .storage.from(MEDIA_BUCKET)
    .upload(path, prepared.file, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) throw new Error(uploadErrorMessage(error.message));
  onProgress?.(100);
  return { path, width: prepared.width, height: prepared.height };
}
