"use client";

// Unggah langsung dari browser ke Storage `media/<folder>/<uuid>.webp` dengan sesi admin
// (RLS storage: hanya admin). Server Action hanya menerima path hasilnya.

import { getBrowserSupabase } from "@/lib/supabase/browser";
import { MEDIA_BUCKET } from "@/lib/media";
import { prepareImage } from "./compress";

export type MediaFolder = "units" | "facilities" | "locations" | "settings";

export type UploadResult = { path: string; width: number; height: number };

export async function uploadImage(
  file: File,
  folder: MediaFolder,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const prepared = await prepareImage(file, (p) => onProgress?.(Math.round(p * 0.7)));
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await getBrowserSupabase()
    .storage.from(MEDIA_BUCKET)
    .upload(path, prepared.file, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) {
    throw new Error(
      /row-level security|not authorized|unauthorized|jwt/i.test(error.message)
        ? "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi."
        : `Gagal mengunggah foto: ${error.message}`,
    );
  }
  onProgress?.(100);
  return { path, width: prepared.width, height: prepared.height };
}
