"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Apakah lebar elemen >= `minPx` (ResizeObserver; ikut berubah saat sidebar dibuka/ditutup).
 * `null` di server, selama hidrasi, dan sebelum elemen terpasang: komponen lalu merender kedua
 * varian dengan container query CSS supaya tidak berkedip; setelah itu hanya satu varian di DOM.
 */
export function useMinWidth(element: HTMLElement | null, minPx: number): boolean | null {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (!element || typeof ResizeObserver === "undefined") return () => {};
      const observer = new ResizeObserver(callback);
      observer.observe(element);
      return () => observer.disconnect();
    },
    [element],
  );
  return useSyncExternalStore<boolean | null>(
    subscribe,
    () => (element ? element.clientWidth >= minPx : null),
    () => null,
  );
}
