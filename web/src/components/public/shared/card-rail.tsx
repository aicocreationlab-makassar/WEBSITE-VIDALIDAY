"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { scrollBehavior } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  /** Label grup untuk pembaca layar, mis. "Promo pilihan". */
  label: string;
  /** Lebar item: mobile 82% layar (kartu berikutnya terlihat sebagian), desktop sesuai kolom. */
  itemClassName?: string;
  className?: string;
  /**
   * Isi kartu tidak punya elemen yang bisa difokus (mis. fasilitas gedung): rel bisa difokus dan digeser
   * dengan tombol panah keyboard, dan tombol geser sudah tampil mulai md untuk pointer mouse.
   */
  focusableTrack?: boolean;
};

/**
 * Rel kartu horizontal dengan scroll-snap (DESIGN 4.6: kartu carousel mobile 82% lebar layar).
 * Bisa digeser jari, keyboard (Tab ke kartu), dan tombol panah di desktop.
 */
export function CardRail({ children, label, itemClassName, className, focusableTrack = false }: Props) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: scrollBehavior() });
  };

  const items = Children.toArray(children);

  return (
    <div className={cn("relative", className)}>
      <ul
        ref={track}
        onScroll={update}
        aria-label={label}
        tabIndex={focusableTrack ? 0 : undefined}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0"
      >
        {items.map((child, i) => (
          <li
            key={i}
            className={cn("w-[82%] max-w-[340px] shrink-0 snap-start sm:w-[46%] lg:w-[calc((100%-3rem)/4)]", itemClassName)}
          >
            {child}
          </li>
        ))}
      </ul>
      {items.length > 1 ? (
        <div
          className={cn(
            "pointer-events-none absolute -top-14 right-0 hidden gap-2 lg:flex",
            focusableTrack && "md:pointer-fine:flex",
          )}
        >
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-disabled={edges.start || undefined}
            aria-label={`Geser ${label} ke kiri`}
            className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-line bg-white text-ink transition-colors hover:bg-surface-2 aria-disabled:opacity-40"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-disabled={edges.end || undefined}
            aria-label={`Geser ${label} ke kanan`}
            className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-line bg-white text-ink transition-colors hover:bg-surface-2 aria-disabled:opacity-40"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
