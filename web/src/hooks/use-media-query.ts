"use client";

import { useSyncExternalStore } from "react";

/** true kalau media query cocok. Server & hidrasi pertama memakai `serverDefault` (mobile dulu). */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  return useSyncExternalStore(
    (callback) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", callback);
      return () => list.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}

/** md ke atas (>= 768px): popover/sidebar desktop. Di bawahnya: bottom sheet. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
