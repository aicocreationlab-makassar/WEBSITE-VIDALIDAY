"use client";

import { useSyncExternalStore } from "react";
import { Toaster as Sonner } from "sonner";

const DESKTOP = "(min-width: 768px)";

function subscribe(callback: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/** Toast: atas di mobile, kanan bawah di desktop (DESIGN 4.10). */
export function Toaster() {
  const desktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
  return (
    <Sonner
      position={desktop ? "bottom-right" : "top-center"}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "font-sans rounded-card border border-line shadow-card text-sm",
          title: "font-semibold",
        },
      }}
    />
  );
}
