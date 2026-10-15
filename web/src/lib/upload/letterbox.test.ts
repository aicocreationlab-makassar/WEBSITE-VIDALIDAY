import { describe, expect, it } from "vitest";
import { detectLetterbox, type PixelData } from "./letterbox";

/** Gambar sintetis: bar hitam `top`/`bottom` piksel, isi abu terang. */
function synthetic(width: number, height: number, top: number, bottom: number, indicatorRows = 0): PixelData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inTop = y < top;
      const inBottom = y >= height - bottom;
      // Bar indikator: putih di tengah, hitam di tepi, tepat di atas bar bawah.
      const inIndicator = !inBottom && y >= height - bottom - indicatorRows && x > width * 0.35 && x < width * 0.65;
      const indicatorEdge = !inBottom && y >= height - bottom - indicatorRows && !inIndicator;
      const value = inTop || inBottom || indicatorEdge ? 0 : inIndicator ? 255 : 180;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe("detectLetterbox", () => {
  it("leaves normal photos alone", () => {
    expect(detectLetterbox(synthetic(60, 80, 0, 0))).toBeNull();
  });

  it("crops top and bottom bars from video screenshots", () => {
    expect(detectLetterbox(synthetic(59, 128, 12, 12))).toEqual({ x: 0, y: 12, width: 59, height: 104 });
  });

  it("also removes the iOS home indicator strip above the bottom bar", () => {
    expect(detectLetterbox(synthetic(59, 128, 12, 10, 3))).toEqual({ x: 0, y: 12, width: 59, height: 103 });
  });

  it("refuses to crop away most of a dark photo", () => {
    expect(detectLetterbox(synthetic(40, 100, 40, 40))).toBeNull();
  });
});
