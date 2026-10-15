// Deteksi bar hitam atas/bawah (tangkapan layar video dari HP) supaya bisa dipotong sebelum diunggah.
// Fungsi murni atas data piksel RGBA, ada unit test dengan gambar sintetis.

export type PixelData = { data: Uint8ClampedArray; width: number; height: number };
export type CropRect = { x: number; y: number; width: number; height: number };

const DARK_LUMA = 20;
const ROW_DARK_RATIO = 0.96;
/** Bar indikator iOS: baris di luar 25% kiri/kanan gelap, di tengah terang. */
const EDGE_RATIO = 0.25;

function luma(data: Uint8ClampedArray, i: number): number {
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
}

function darkRatio(img: PixelData, y: number, from = 0, to = img.width): number {
  let dark = 0;
  for (let x = from; x < to; x++) {
    if (luma(img.data, (y * img.width + x) * 4) < DARK_LUMA) dark += 1;
  }
  return dark / Math.max(1, to - from);
}

function isBarRow(img: PixelData, y: number): boolean {
  return darkRatio(img, y) >= ROW_DARK_RATIO;
}

/** Baris bar indikator: tepi kiri & kanan gelap (tampilan video), tengah tidak harus gelap. */
function isIndicatorRow(img: PixelData, y: number): boolean {
  const edge = Math.floor(img.width * EDGE_RATIO);
  return (
    darkRatio(img, y, 0, edge) >= ROW_DARK_RATIO && darkRatio(img, y, img.width - edge, img.width) >= ROW_DARK_RATIO
  );
}

/**
 * Hitung area isi tanpa bar hitam atas dan bawah. Kembalikan null kalau tidak ada bar
 * (atau bar terlalu tipis, < 2% tinggi), supaya foto biasa tidak diubah.
 */
export function detectLetterbox(img: PixelData): CropRect | null {
  const { width, height } = img;
  if (width < 8 || height < 8) return null;
  let top = 0;
  while (top < height / 2 && isBarRow(img, top)) top += 1;
  let bottom = height - 1;
  while (bottom > height / 2 && (isBarRow(img, bottom) || isIndicatorRow(img, bottom))) bottom -= 1;
  const cutTop = top;
  const cutBottom = height - 1 - bottom;
  const minBar = Math.max(2, Math.round(height * 0.02));
  if (cutTop < minBar && cutBottom < minBar) return null;
  const cropHeight = bottom - top + 1;
  if (cropHeight < height * 0.4) return null;
  return { x: 0, y: top, width, height: cropHeight };
}
