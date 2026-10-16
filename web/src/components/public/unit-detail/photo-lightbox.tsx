"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { clampIndex, isLetterboxed } from "@/lib/unit-detail";
import { scrollBehavior } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Shape = "full" | "letterbox" | "error";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: string[];
  unitName: string;
  index: number;
  onIndexChange: (index: number) => void;
};

const NAV_BUTTON =
  "absolute top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-sm transition-colors hover:bg-white/24 focus-visible:ring-3 focus-visible:ring-white/40 aria-disabled:cursor-default aria-disabled:opacity-40";

/**
 * Lightbox layar penuh (DESIGN 4.10, UX 3d): latar night 95%, foto utuh (contain) dalam
 * 100vw × (100dvh − 120px). Foto tangkapan layar video (lebar/tinggi < 0,5) ditampilkan di
 * bingkai 9:16 dengan cover supaya bar hitam dan bar indikator iOS terpotong.
 * Geser (scroll-snap), tombol panah, keyboard kiri/kanan, strip thumbnail di desktop.
 */
export function PhotoLightbox({ open, onOpenChange, photos, unitName, index, onIndexChange }: Props) {
  const count = photos.length;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [shapes, setShapes] = useState<Record<string, Shape>>({});

  // Saat track dipasang (modal dibuka), langsung lompat ke foto yang diketuk tanpa animasi.
  const attachTrack = useCallback((el: HTMLDivElement | null) => {
    trackRef.current = el;
    if (el) el.scrollLeft = Number(el.dataset.start ?? 0) * el.clientWidth;
  }, []);

  const go = (target: number) => {
    const next = clampIndex(target, count);
    onIndexChange(next);
    const el = trackRef.current;
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: scrollBehavior() });
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const current = clampIndex(el.scrollLeft / el.clientWidth, count);
    if (current !== index) onIndexChange(current);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
  };

  const markShape = (src: string, shape: Shape) =>
    setShapes((current) => (current[src] === shape ? current : { ...current, [src]: shape }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onKeyDown={onKeyDown}
        className="top-0 left-0 flex h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden overflow-y-hidden rounded-none bg-night/95 p-0 text-white shadow-none sm:max-w-none"
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 pr-2 pl-4">
          <DialogTitle className="sr-only">Galeri foto</DialogTitle>
          <DialogDescription className="sr-only">
            {unitName}. Geser atau pakai tombol panah untuk melihat foto lain.
          </DialogDescription>
          <p aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-white tabular-nums">
            <span className="sr-only">
              Foto {index + 1} dari {count}
            </span>
            <span aria-hidden="true">
              {index + 1}/{count}
            </span>
          </p>
          <p className="hidden min-w-0 flex-1 truncate text-center text-sm font-medium text-white/80 md:block">
            {unitName}
          </p>
          <DialogClose className="inline-flex size-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/12 focus-visible:ring-3 focus-visible:ring-white/40">
            <X className="size-6" aria-hidden="true" />
            <span className="sr-only">Tutup</span>
          </DialogClose>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            ref={attachTrack}
            data-start={index}
            onScroll={onScroll}
            className="no-scrollbar flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          >
            {photos.map((src, i) => {
              const shape = shapes[src];
              return (
                <div
                  key={src}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Foto ${i + 1} dari ${count}`}
                  className="flex size-full shrink-0 snap-center items-center justify-center px-2 md:px-20"
                >
                  {shape === "error" ? (
                    <div className="flex flex-col items-center gap-2 text-center text-white/80">
                      <ImageOff className="size-10" strokeWidth={1.5} aria-hidden="true" />
                      <span className="text-sm">Foto tidak bisa dimuat</span>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "relative",
                        shape === "letterbox" ? "aspect-[9/16] h-full max-w-full overflow-hidden" : "size-full",
                      )}
                    >
                      <Image
                        src={src}
                        alt={`${unitName}, foto ${i + 1}`}
                        fill
                        sizes="100vw"
                        loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
                        onLoad={(event) => {
                          const img = event.currentTarget;
                          markShape(src, isLetterboxed(img.naturalWidth, img.naturalHeight) ? "letterbox" : "full");
                        }}
                        onError={() => markShape(src, "error")}
                        className={cn(
                          "transition-opacity duration-200",
                          shape === "letterbox" ? "object-cover" : "object-contain",
                          shape ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-disabled={index === 0 || undefined}
                aria-label="Foto sebelumnya"
                className={cn(NAV_BUTTON, "left-2 md:left-4")}
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-disabled={index === count - 1 || undefined}
                aria-label="Foto berikutnya"
                className={cn(NAV_BUTTON, "right-2 md:right-4")}
              >
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>

        <div className="flex h-16 shrink-0 items-center justify-center px-4 pb-[env(safe-area-inset-bottom)]">
          {count > 1 ? (
            <>
              <p className="text-sm text-white/70 md:hidden">Geser untuk melihat foto lain</p>
              <ul className="no-scrollbar hidden max-w-full gap-2 overflow-x-auto py-1 md:flex" aria-label="Thumbnail foto">
                {photos.map((src, i) => (
                  <li key={src} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Lihat foto ${i + 1}`}
                      aria-current={i === index ? "true" : undefined}
                      className={cn(
                        "relative block h-11 w-16 overflow-hidden rounded-md ring-2 transition-opacity",
                        i === index ? "ring-white" : "opacity-55 ring-transparent hover:opacity-100",
                      )}
                    >
                      <Image src={src} alt="" fill sizes="64px" className="object-cover object-[50%_55%]" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
