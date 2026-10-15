"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { scrollBehavior } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  photos: string[];
  /** Tautan detail unit: ketuk foto tetap membuka detail. */
  href: string;
  alt: string;
  sizes: string;
  dimmed?: boolean;
  /** Foto pertama dimuat segera (gambar LCP). */
  eager?: boolean;
};

const MAX_PHOTOS = 5;

/**
 * Galeri geser ringan untuk kartu di grid /sewa: CSS scroll-snap (tanpa library).
 * Berada di atas tautan kartu (z-[1]) supaya bisa digeser; setiap slide juga menuju detail unit
 * (tabIndex -1, karena tautan utama kartu sudah ada di judul).
 */
export function CardGallery({ photos, href, alt, sizes, dimmed, eager = false }: Props) {
  const list = photos.slice(0, MAX_PHOTOS);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    setIndex((current) => (current === next ? current : next));
  }, []);

  const go = (delta: number) => {
    const el = track.current;
    if (!el) return;
    const target = Math.min(list.length - 1, Math.max(0, index + delta));
    el.scrollTo({ left: target * el.clientWidth, behavior: scrollBehavior() });
  };

  return (
    <div className="group/gallery relative z-[1] size-full">
      <div
        ref={track}
        onScroll={onScroll}
        className="no-scrollbar flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {list.map((src, i) => (
          <Link
            key={src}
            href={href}
            tabIndex={-1}
            aria-hidden="true"
            className="relative block size-full shrink-0 snap-center"
          >
            <Image
              src={src}
              alt={`${alt}, foto ${i + 1}`}
              fill
              sizes={sizes}
              loading={eager && i === 0 ? "eager" : "lazy"}
              fetchPriority={eager && i === 0 ? "high" : undefined}
              className={cn("object-cover object-[50%_55%]", dimmed && "grayscale-[60%]")}
            />
          </Link>
        ))}
      </div>
      {list.length > 1 ? (
        <>
          <span className="sr-only" aria-live="polite">
            Foto {index + 1} dari {list.length}
          </span>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 bottom-2.5 z-10 flex items-center gap-1 rounded-full bg-night/45 px-2 py-1"
          >
            {list.map((src, i) => (
              <span
                key={src}
                className={cn("h-1.5 rounded-full bg-white transition-all", i === index ? "w-3" : "w-1.5 opacity-60")}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label={`Foto sebelumnya, ${alt}`}
            className="absolute top-1/2 left-2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-opacity disabled:invisible md:flex md:opacity-0 md:group-hover/gallery:opacity-100 md:focus-visible:opacity-100"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index === list.length - 1}
            aria-label={`Foto berikutnya, ${alt}`}
            className="absolute top-1/2 right-2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-opacity disabled:invisible md:flex md:opacity-0 md:group-hover/gallery:opacity-100 md:focus-visible:opacity-100"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  );
}
