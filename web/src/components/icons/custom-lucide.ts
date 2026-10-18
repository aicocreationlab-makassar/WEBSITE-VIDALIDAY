// Ikon gaya lucide yang tidak ada di lucide-react (lemari pakaian, gantungan baju). Digambar di
// grid 24px, stroke 2, ujung bulat, lalu dibungkus createLucideIcon supaya bisa masuk registry
// lib/icons.tsx seperti ikon lucide lain (ukuran, strokeWidth, aria-hidden sama).

import { createLucideIcon } from "lucide-react";

/** Lemari pakaian dua pintu dengan gagang dan kaki. */
export const Wardrobe = createLucideIcon("wardrobe", [
  ["rect", { width: "16", height: "18", x: "4", y: "2", rx: "2", key: "body" }],
  ["path", { d: "M12 2v18", key: "doors" }],
  ["path", { d: "M10 10v2", key: "handle-left" }],
  ["path", { d: "M14 10v2", key: "handle-right" }],
  ["path", { d: "M6 20v2", key: "leg-left" }],
  ["path", { d: "M18 20v2", key: "leg-right" }],
]);

/** Gantungan baju: kait di atas, badan segitiga dengan palang bawah. */
export const Hanger = createLucideIcon("hanger", [
  ["path", { d: "M14 5a2 2 0 1 0-2 2v1", key: "hook" }],
  ["path", { d: "M12 8 3 15v2h18v-2z", key: "body" }],
]);
