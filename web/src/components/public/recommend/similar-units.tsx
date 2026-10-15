"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeading } from "@/components/public/shared/section-heading";
import { UnitCard } from "@/components/public/unit/unit-card";
import { track } from "@/lib/analytics";
import { getRecentServerSnapshot, getRecentSnapshot, subscribeRecent } from "@/lib/recent";
import type { Recommendation } from "@/lib/recommend";
import { cn } from "@/lib/utils";
import type { CatalogUnit } from "@/types/domain";
import { ReasonChip } from "./reason-chip";
import { rankSimilar } from "./recommend-model";

const HEADING_ID = "unit-serupa-judul";
const LIST_ID = "unit-serupa-daftar";
/** Rel mobile 82% layar; rel tablet/kolom kiri maks. 340px; grid desktop 3 kolom (±300-365px). */
const CARD_SIZES = "(max-width: 767px) 82vw, 360px";

type Props = {
  /** Unit yang sedang dilihat. */
  current: CatalogUnit;
  /** Hasil `scoreSimilar` (tahap 1, server), maks. 12 kandidat. */
  stage1: Recommendation[];
  /** Pelengkap kalau kandidat kurang dari 3 (unggulan apartemen sama, lalu termurah). */
  pool: CatalogUnit[];
  className?: string;
};

/**
 * "Unit serupa" (PRD 6.6, UX 2.6). Server merender urutan tahap 1 (riwayat kosong), lalu setelah hidrasi
 * urutan disesuaikan dengan riwayat di perangkat. Jumlah kartu tidak berubah, jadi tidak ada pergeseran
 * tata letak; section ada jauh di bawah lipatan. Tidak merender apa pun kalau tidak ada kandidat.
 *
 * Tata letak mengikuti lebar wadah (container query), bukan lebar layar, karena section ini bisa berada
 * di kolom kiri (unit penuh, tepat di bawah harga) atau selebar halaman:
 * - wadah < 896px: rel geser (kartu 82%, mulai 512px 46%), panah untuk mouse di layar md ke atas;
 * - wadah >= 896px: grid 3 kolom x 2 baris.
 */
export function SimilarUnits({ current, stage1, pool, className }: Props) {
  const recent = useSyncExternalStore(subscribeRecent, getRecentSnapshot, getRecentServerSnapshot);
  const items = useMemo(() => rankSimilar(current, stage1, recent, pool), [current, stage1, recent, pool]);

  if (!items.length) return null;
  return <SimilarList currentSlug={current.slug} items={items} className={className} />;
}

function SimilarList({
  currentSlug,
  items,
  className,
}: {
  currentSlug: string;
  items: Recommendation[];
  className?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // Callback pertama datang saat pengamatan dimulai, jadi status panah langsung benar setelah hidrasi.
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateEdges]);

  const scrollPage = (direction: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const arrows =
    items.length > 1 ? (
      // Hanya untuk mouse di layar md ke atas, dan hanya saat berbentuk rel (grid 3 kolom tidak perlu).
      <div className="hidden md:pointer-fine:block">
        <div className="flex gap-2 @4xl:hidden">
          <RailButton direction={-1} disabled={atStart} onClick={() => scrollPage(-1)} />
          <RailButton direction={1} disabled={atEnd} onClick={() => scrollPage(1)} />
        </div>
      </div>
    ) : undefined;

  return (
    <section aria-labelledby={HEADING_ID} className={cn("@container", className)}>
      <SectionHeading
        id={HEADING_ID}
        title="Unit serupa"
        description="Dipilih dari tipe, harga, dan fasilitas yang mirip"
        action={arrows}
      />
      <ul
        id={LIST_ID}
        ref={listRef}
        onScroll={updateEdges}
        className={cn(
          // Rel: di mobile menembus padding container supaya kartu berikutnya terlihat sampai tepi layar;
          // md ke atas sedikit saja (cincin dan bayangan kartu tidak terpotong).
          "no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-3",
          "sm:-mx-6 sm:scroll-px-6 sm:px-6 md:-mx-2 md:scroll-px-2 md:px-2",
          "@4xl:mx-0 @4xl:grid @4xl:grid-cols-3 @4xl:gap-6 @4xl:overflow-visible @4xl:p-0",
        )}
      >
        {items.map((rec, index) => (
          <li
            key={rec.unit.id}
            className="w-[82%] max-w-[340px] shrink-0 snap-start @lg:w-[46%] @4xl:w-auto @4xl:max-w-none"
          >
            <UnitCard
              unit={rec.unit}
              layout="carousel"
              headingLevel="h3"
              sizes={CARD_SIZES}
              extra={rec.reason ? <ReasonChip reason={rec.reason} /> : undefined}
              linkProps={{
                onClick: () =>
                  track("recommendation_click", { from: currentSlug, to: rec.unit.slug, position: index + 1 }),
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RailButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 1 | -1;
  disabled: boolean;
  onClick: () => void;
}) {
  const Chevron = direction === 1 ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-controls={LIST_ID}
      aria-label={direction === 1 ? "Geser unit serupa ke kanan" : "Geser unit serupa ke kiri"}
      className="inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-line bg-white text-ink transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:opacity-40"
    >
      <Chevron className="size-5" aria-hidden="true" />
    </button>
  );
}
