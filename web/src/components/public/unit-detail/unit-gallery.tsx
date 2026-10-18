"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState } from "react";
import { Images, Play } from "lucide-react";
import { PhotoPlaceholder } from "@/components/public/unit/photo-placeholder";
import { track } from "@/lib/analytics";
import { clampIndex, galleryLayout, isLetterboxed, type GalleryLayout } from "@/lib/unit-detail";
import { cn } from "@/lib/utils";

// Lightbox dan video (Radix Dialog) diunduh saat pertama dibuka, atau lebih awal saat tamu
// menyentuh/menyorot galeri; tidak ikut muatan awal halaman.
const PhotoLightbox = dynamic(() => import("./photo-lightbox").then((mod) => mod.PhotoLightbox), { ssr: false });
const VideoDialog = dynamic(() => import("./video-dialog").then((mod) => mod.VideoDialog), { ssr: false });

function preloadLightbox() {
  void import("./photo-lightbox");
}

function preloadVideo() {
  void import("./video-dialog");
}

type Props = {
  unitSlug: string;
  unitName: string;
  photos: string[];
  /** ID video YouTube; null = tombol "Video tur" tidak tampil. */
  youtubeId: string | null;
};

// Satu elemen <img> per foto melayani mobile dan desktop (tanpa unduhan ganda untuk gambar LCP),
// jadi `sizes` mencakup keduanya: mobile selalu selebar layar.
const SIZES = {
  single: "(min-width: 1200px) 1136px, (min-width: 768px) 92vw, 100vw",
  half: "(min-width: 1200px) 568px, (min-width: 768px) 46vw, 100vw",
  quarter: "(min-width: 1200px) 284px, (min-width: 768px) 23vw, 100vw",
} as const;

/** Kolom/baris grid desktop menurut jumlah foto (UX 3c). */
const GRID: Record<Exclude<GalleryLayout, "none">, string> = {
  single: "md:grid-cols-1",
  pair: "md:grid-cols-2",
  trio: "md:grid-cols-2 md:grid-rows-2",
  mosaic: "md:grid-cols-4 md:grid-rows-2",
};

/** Kelas tile desktop: tile besar, tile kecil, atau disembunyikan (tetap ada di geseran mobile). */
function tileClass(layout: GalleryLayout, i: number): string {
  if (layout === "trio") return i === 0 ? "md:row-span-2" : i > 2 ? "md:hidden" : "";
  if (layout === "mosaic") return i === 0 ? "md:col-span-2 md:row-span-2" : i > 4 ? "md:hidden" : "";
  return "";
}

function tileSizes(layout: GalleryLayout, i: number): string {
  if (layout === "single") return SIZES.single;
  if (layout === "mosaic" && i > 0) return SIZES.quarter;
  return SIZES.half;
}

const PILL =
  "inline-flex items-center gap-1.5 rounded-full bg-night/65 font-semibold text-white backdrop-blur-sm transition-colors hover:bg-night/80 focus-visible:ring-3 focus-visible:ring-white/50";

/**
 * Galeri detail unit (UX 3b, 3c).
 * Mobile: geser penuh lebar, bingkai 4:5 (maks. 60svh), cover 50% 55%, penanda "1/8" (≥ 2 foto),
 * "Video tur" di kiri bawah. Desktop: grid tinggi 440px menurut jumlah foto; 1 foto = contain di atas
 * salinan blur (foto potret 9:16 berbar hitam dibingkai 9:16 cover). Ketuk foto → lightbox.
 */
export function UnitGallery({ unitSlug, unitName, photos, youtubeId }: Props) {
  const count = photos.length;
  const layout = galleryLayout(count);
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState({ open: false, index: 0 });
  const [videoOpen, setVideoOpen] = useState(false);
  // Sekali dibuka, tetap terpasang supaya animasi tutup dan pengembalian fokus berjalan.
  const [lightboxMounted, setLightboxMounted] = useState(false);
  const [videoMounted, setVideoMounted] = useState(false);
  const [coverLetterboxed, setCoverLetterboxed] = useState(false);

  const openLightbox = (index: number) => {
    setLightboxMounted(true);
    setLightbox({ open: true, index });
    track("gallery_open", { unit: unitSlug, index });
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = clampIndex(el.scrollLeft / el.clientWidth, count);
    setCurrent((value) => (value === next ? value : next));
  };

  const videoButton = youtubeId ? (
    <button
      type="button"
      onPointerEnter={preloadVideo}
      onFocus={preloadVideo}
      onClick={() => {
        setVideoMounted(true);
        setVideoOpen(true);
      }}
      className={cn(
        PILL,
        "absolute bottom-3 left-3 z-10 min-h-9 px-3.5 text-sm after:absolute after:-inset-1.5 after:content-[''] md:bottom-4 md:left-4 md:min-h-11 md:px-4",
      )}
    >
      <Play className="size-4 fill-current" aria-hidden="true" />
      Video tur
    </button>
  ) : null;

  return (
    <div className="md:mx-auto md:w-full md:max-w-[1200px] md:px-6 lg:px-8">
      <div
        className="relative"
        onPointerEnter={count > 0 ? preloadLightbox : undefined}
        onFocus={count > 0 ? preloadLightbox : undefined}
      >
        {layout === "none" ? (
          <div className="aspect-[4/5] max-h-[60svh] w-full overflow-hidden md:aspect-auto md:h-[280px] md:max-h-none md:rounded-card">
            <PhotoPlaceholder />
          </div>
        ) : (
          <div
            ref={trackRef}
            onScroll={onScroll}
            role="group"
            aria-label={`Foto ${unitName}`}
            className={cn(
              "no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-surface-2",
              "md:grid md:h-[440px] md:snap-none md:gap-2 md:overflow-hidden md:rounded-card md:bg-transparent",
              GRID[layout],
            )}
          >
            {photos.map((src, i) => {
              const single = layout === "single";
              const framed = single && coverLetterboxed;
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => openLightbox(i)}
                  aria-label={`Buka foto ${i + 1} dari ${count}`}
                  className={cn(
                    "group/tile relative aspect-[4/5] max-h-[60svh] w-full shrink-0 snap-center overflow-hidden bg-surface-2",
                    "outline-offset-[-3px] md:aspect-auto md:h-full md:max-h-none md:w-full",
                    single && "md:flex md:items-center md:justify-center md:bg-night",
                    tileClass(layout, i),
                  )}
                >
                  {single ? (
                    // Latar blur dari foto yang sama (desktop saja; lazy → tidak diunduh di mobile).
                    <Image
                      src={src}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="160px"
                      className="hidden scale-110 object-cover brightness-[.85] blur-[28px] md:block"
                    />
                  ) : null}
                  <span
                    className={cn(
                      "absolute inset-0",
                      framed && "md:relative md:inset-auto md:block md:aspect-[9/16] md:h-full",
                    )}
                  >
                    <Image
                      src={src}
                      alt={`${unitName}, foto ${i + 1}`}
                      fill
                      sizes={tileSizes(layout, i)}
                      loading={i === 0 ? "eager" : "lazy"}
                      fetchPriority={i === 0 ? "high" : undefined}
                      onLoad={
                        single
                          ? (event) => {
                              const img = event.currentTarget;
                              setCoverLetterboxed(isLetterboxed(img.naturalWidth, img.naturalHeight));
                            }
                          : undefined
                      }
                      className={cn(
                        "object-cover object-[50%_55%] transition-[filter] duration-200 md:group-hover/tile:brightness-95",
                        single && !framed && "md:object-contain md:object-center",
                      )}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {count >= 2 ? (
          <>
            <button
              type="button"
              onClick={() => openLightbox(current)}
              aria-label={`Lihat semua foto (${count}), foto ${current + 1}/${count}`}
              className={cn(
                PILL,
                "absolute right-3 bottom-3 z-10 min-h-8 px-3 text-caption tabular-nums after:absolute after:-inset-1.5 after:content-[''] md:hidden",
              )}
            >
              <Images className="size-3.5" aria-hidden="true" />
              <span>
                {current + 1}/{count}
              </span>
            </button>
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className="absolute right-4 bottom-4 z-10 hidden min-h-11 items-center gap-2 rounded-control border-[1.5px] border-line bg-white px-4 text-[15px] font-semibold text-ink shadow-card transition-colors hover:bg-surface-2 md:inline-flex"
            >
              <Images className="size-5" aria-hidden="true" />
              Lihat semua foto ({count})
            </button>
          </>
        ) : null}

        {videoButton}
      </div>

      {count > 0 && lightboxMounted ? (
        <PhotoLightbox
          open={lightbox.open}
          onOpenChange={(open) => setLightbox((state) => ({ ...state, open }))}
          photos={photos}
          unitName={unitName}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox((state) => ({ ...state, index }))}
        />
      ) : null}
      {youtubeId && videoMounted ? (
        <VideoDialog open={videoOpen} onOpenChange={setVideoOpen} videoId={youtubeId} unitName={unitName} />
      ) : null}
    </div>
  );
}
