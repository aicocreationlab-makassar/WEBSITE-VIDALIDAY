/** Perilaku scroll terprogram: "smooth", kecuali pengguna meminta gerak dikurangi (DESIGN 8). */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
