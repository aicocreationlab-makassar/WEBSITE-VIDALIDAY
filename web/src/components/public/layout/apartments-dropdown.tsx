"use client";

import { lazy, Suspense, useState } from "react";
import { useIsDesktop } from "@/hooks/use-media-query";
import type { NavLocation } from "@/lib/data/chrome";
import { cn } from "@/lib/utils";
import { ApartmentsTriggerContent } from "./apartments-trigger";

// Radix DropdownMenu + floating-ui hanya diunduh di md ke atas (nav header tersembunyi di mobile).
// React.lazy (bukan next/dynamic) supaya fallback-nya bisa memakai props: tombol pengganti yang sama.
const ApartmentsMenu = lazy(() => import("./apartments-menu").then((mod) => ({ default: mod.ApartmentsMenu })));

/**
 * Menu "Apartemen" di header desktop: satu baris per apartemen aktif. Server, hidrasi pertama, dan
 * layar di bawah md memakai tombol biasa yang tampilannya sama; di desktop tombol itu diganti
 * DropdownMenu setelah modulnya termuat. Klik sebelum termuat tetap membuka menu, dan fokus
 * keyboard pindah ke tombol baru.
 */
export function ApartmentsDropdown({
  locations,
  triggerClassName,
}: {
  locations: NavLocation[];
  /** Kelas tautan nav header, supaya pemicu sejajar dengan tautan lain. */
  triggerClassName?: string;
}) {
  const isDesktop = useIsDesktop();
  const [requested, setRequested] = useState(false);
  const [focused, setFocused] = useState(false);

  if (locations.length === 0) return null;

  const placeholder = (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={false}
      data-state="closed"
      onClick={() => setRequested(true)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={cn("group", triggerClassName)}
    >
      <ApartmentsTriggerContent />
    </button>
  );

  if (!isDesktop) return placeholder;

  return (
    <Suspense fallback={placeholder}>
      <ApartmentsMenu
        locations={locations}
        triggerClassName={triggerClassName}
        defaultOpen={requested}
        // Menu yang langsung terbuka mengatur fokusnya sendiri (Radix).
        autoFocus={focused && !requested}
      />
    </Suspense>
  );
}
