"use client";

// Siapkan foto di browser sebelum diunggah (PRD 7.4): tolak HEIC, potong bar hitam tangkapan layar video,
// kompres ke WebP sisi terpanjang 2000px kualitas 0,8.

import imageCompression from "browser-image-compression";
import { detectLetterbox } from "./letterbox";

export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

export class UploadRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadRejected";
  }
}

const HEIC = /\.(heic|heif)$/i;

/** Validasi awal; pesan dalam Bahasa Indonesia untuk ditampilkan langsung. */
export function checkFile(file: File): void {
  if (HEIC.test(file.name) || /heic|heif/i.test(file.type)) {
    throw new UploadRejected(
      `"${file.name}" berformat HEIC. Ubah dulu ke JPG: di iPhone buka Pengaturan > Kamera > Format > Paling Kompatibel, atau kirim fotonya lewat WhatsApp ke diri sendiri lalu simpan ulang.`,
    );
  }
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    throw new UploadRejected(`"${file.name}" bukan foto JPG, PNG, atau WebP.`);
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new UploadRejected(`"${file.name}" lebih dari 10 MB. Pilih foto yang lebih kecil.`);
  }
}

async function trimLetterbox(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    // Analisis di ukuran kecil supaya cepat, lalu potong di ukuran asli.
    const scale = Math.min(1, 400 / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(8, Math.round(bitmap.width * scale));
    const h = Math.max(8, Math.round(bitmap.height * scale));
    const probe = new OffscreenCanvas(w, h);
    const ctx = probe.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const crop = detectLetterbox(ctx.getImageData(0, 0, w, h));
    if (!crop) return file;

    const sy = Math.round(crop.y / scale);
    const sh = Math.min(bitmap.height - sy, Math.round(crop.height / scale));
    const canvas = new OffscreenCanvas(bitmap.width, sh);
    const out = canvas.getContext("2d");
    if (!out) return file;
    out.drawImage(bitmap, 0, sy, bitmap.width, sh, 0, 0, bitmap.width, sh);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    return new File([blob], file.name.replace(/\.\w+$/, ".png"), { type: "image/png" });
  } finally {
    bitmap.close();
  }
}

export type PreparedImage = { file: File; width: number; height: number };

/** Validasi → potong bar hitam → kompres WebP 2000px q0,8. */
export async function prepareImage(file: File, onProgress?: (percent: number) => void): Promise<PreparedImage> {
  checkFile(file);
  let source = file;
  try {
    source = await trimLetterbox(file);
  } catch {
    source = file; // Browser lama tanpa OffscreenCanvas: lewati pemotongan.
  }
  const compressed = await imageCompression(source, {
    maxWidthOrHeight: 2000,
    initialQuality: 0.8,
    fileType: "image/webp",
    useWebWorker: true,
    onProgress,
  });
  const bitmap = await createImageBitmap(compressed);
  const result = { file: new File([compressed], "foto.webp", { type: "image/webp" }), width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return result;
}
