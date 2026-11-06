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

export type OutputType = "image/webp" | "image/jpeg";
export type PreparedImage = { file: File; type: OutputType; extension: "webp" | "jpg"; width: number; height: number };

/** Sisi terpanjang hasil kompresi. */
export const MAX_SIDE = 1920;
/** Ukuran hasil maksimal; di atas ini kualitas diturunkan bertahap oleh browser-image-compression. */
const MAX_OUTPUT_MB = 1.5;
/** File WebP/JPEG yang sudah lebih kecil dari ini dan tidak lebih besar dari MAX_SIDE diunggah apa adanya. */
export const SKIP_COMPRESS_BYTES = 300 * 1024;

let webpSupport: Promise<boolean> | null = null;

/**
 * Browser yang tidak bisa meng-encode WebP lewat canvas (Safari/iOS) diam-diam menghasilkan PNG walau
 * diminta "image/webp": file jadi 2–4 MB. Dicek sekali per sesi lewat canvas 2×2 piksel.
 */
export function canEncodeWebp(): Promise<boolean> {
  webpSupport ??= new Promise<boolean>((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      canvas.toBlob((blob) => resolve(blob?.type === "image/webp"), "image/webp");
    } catch {
      resolve(false);
    }
  });
  return webpSupport;
}

function extensionFor(type: OutputType): "webp" | "jpg" {
  return type === "image/webp" ? "webp" : "jpg";
}

async function dimensions(file: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

/** Sudah WebP/JPEG, kecil, dan tidak melebihi MAX_SIDE: tidak perlu dikompres ulang (kualitas tidak turun lagi). */
export function isAlreadySmall(file: { type: string; size: number }, size: { width: number; height: number }): boolean {
  return (
    (file.type === "image/webp" || file.type === "image/jpeg") &&
    file.size <= SKIP_COMPRESS_BYTES &&
    Math.max(size.width, size.height) <= MAX_SIDE
  );
}

async function encode(source: File, type: OutputType, onProgress?: (percent: number) => void): Promise<File> {
  return imageCompression(source, {
    maxSizeMB: MAX_OUTPUT_MB,
    maxWidthOrHeight: MAX_SIDE,
    initialQuality: 0.8,
    fileType: type,
    useWebWorker: true,
    onProgress,
  });
}

/**
 * Validasi → (file kecil: lewati) → potong bar hitam → kompres sisi terpanjang 1920px q0,8 ke WebP,
 * atau JPEG kalau browser tidak bisa meng-encode WebP. SVG/GIF ditolak di `checkFile` (bukan foto kamar).
 */
export async function prepareImage(file: File, onProgress?: (percent: number) => void): Promise<PreparedImage> {
  checkFile(file);

  if (file.type === "image/webp" || file.type === "image/jpeg") {
    try {
      const size = await dimensions(file);
      if (isAlreadySmall(file, size)) {
        const type: OutputType = file.type;
        onProgress?.(100);
        return { file, type, extension: extensionFor(type), ...size };
      }
    } catch {
      // Tidak terbaca sebagai gambar di sini: lanjut ke jalur kompresi, yang akan memberi pesan kalau memang rusak.
    }
  }

  let source = file;
  try {
    source = await trimLetterbox(file);
  } catch {
    source = file; // Browser lama tanpa OffscreenCanvas: lewati pemotongan.
  }
  let type: OutputType = (await canEncodeWebp()) ? "image/webp" : "image/jpeg";
  let compressed = await encode(source, type, onProgress);
  if (type === "image/webp" && compressed.type !== "image/webp") {
    // Encoder WebP ternyata tidak tersedia (mis. di web worker): ulangi sebagai JPEG supaya tidak ada PNG besar.
    type = "image/jpeg";
    compressed = await encode(source, type, onProgress);
  }
  const extension = extensionFor(type);
  return {
    file: new File([compressed], `foto.${extension}`, { type }),
    type,
    extension,
    ...(await dimensions(compressed)),
  };
}
