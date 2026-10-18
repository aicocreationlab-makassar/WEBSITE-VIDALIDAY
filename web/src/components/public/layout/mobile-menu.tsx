"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NavLocation } from "@/lib/data/chrome";

// Sheet (Radix Dialog) ada di semua halaman publik, jadi baru diunduh saat tombol menu disentuh,
// disorot, atau difokus; tidak ikut muatan awal.
const MobileMenuSheet = dynamic(() => import("./mobile-menu-sheet").then((mod) => mod.MobileMenuSheet), {
  ssr: false,
});

function preloadSheet() {
  void import("./mobile-menu-sheet");
}

type MobileMenuProps = {
  locations: NavLocation[];
  /** Tautan wa.me dengan pesan umum. */
  waHref: string;
};

/** Tombol menu mobile (di bawah `md`). Isi menu ada di MobileMenuSheet. */
export function MobileMenu({ locations, waHref }: MobileMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="quiet"
        size="icon"
        aria-label="Buka menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="md:hidden"
        onPointerEnter={preloadSheet}
        onFocus={preloadSheet}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        <Menu className="size-6" aria-hidden="true" />
      </Button>
      {mounted ? (
        <MobileMenuSheet
          open={open}
          onOpenChange={setOpen}
          triggerRef={triggerRef}
          locations={locations}
          waHref={waHref}
        />
      ) : null}
    </>
  );
}
