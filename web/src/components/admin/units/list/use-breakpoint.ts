"use client";

import { useSyncExternalStore } from "react";

export const MD_QUERY = "(min-width: 48rem)"; // 768px: popover di desktop, bottom sheet di HP
export const LG_QUERY = "(min-width: 64rem)"; // 1024px: tabel + filter sebaris (sidebar 256px memakan ruang)

/**
 * Cocok/tidaknya media query. `null` di server dan selama hidrasi: komponen lalu merender
 * kedua varian dengan kelas CSS responsif supaya tidak berkedip; setelah itu hanya satu varian
 * yang ada di DOM (tidak ada baris ganda tersembunyi).
 */
export function useBreakpoint(query: string): boolean | null {
  return useSyncExternalStore<boolean | null>(
    (callback) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", callback);
      return () => list.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}
