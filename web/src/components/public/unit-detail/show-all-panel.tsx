"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/hooks/use-media-query";

// Dialog/Sheet diunduh saat pertama dibuka (atau saat tombol disorot/difokus), bukan saat halaman dimuat.
const ShowAllOverlay = dynamic(() => import("./show-all-overlay").then((mod) => mod.ShowAllOverlay), { ssr: false });

function preloadOverlay() {
  void import("./show-all-overlay");
}

type Props = {
  /** Teks tombol, mis. "Lihat semua (12)". */
  label: string;
  title: string;
  description?: string;
  className?: string;
  /** Isi lengkap (dirender di server). */
  children: React.ReactNode;
};

/** Tombol "Lihat semua (n)" yang membuka daftar lengkap: bottom sheet di mobile, modal di desktop. */
export function ShowAllPanel({ label, title, description, className, children }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const desktop = useIsDesktop();

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={className}
        onPointerEnter={preloadOverlay}
        onFocus={preloadOverlay}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        aria-haspopup="dialog"
      >
        {label}
      </Button>
      {mounted ? (
        <ShowAllOverlay open={open} onOpenChange={setOpen} desktop={desktop} title={title} description={description}>
          {children}
        </ShowAllOverlay>
      ) : null}
    </>
  );
}
