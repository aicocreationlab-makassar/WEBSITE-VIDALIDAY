import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toDisplayLegalName } from "@/lib/format";
import { DEFAULT_HERO_IMAGE, isStockPhoto, mediaUrl } from "@/lib/media";
import type { LocationWithTypes, SearchIndexRow } from "@/types/domain";
import type { SiteSettings } from "@/types/settings";
import { HeroSearch } from "./hero-search";
import { toHeroIndex, toHeroLocations } from "./hero-model";

type HeroProps = {
  settings: SiteSettings;
  /** Apartemen terdaftar: aktif dan punya unit, urut sort_order (getListedLocations). */
  locations: LocationWithTypes[];
  /** getSearchIndex(): dipangkas ke unit tersedia di apartemen di atas sebelum dikirim ke klien. */
  index: SearchIndexRow[];
};

/**
 * Hero beranda (PRD 6.2, DESIGN 4.2, UX 2.1). Mobile: foto penuh lebar setinggi
 * clamp(232px, 100svh − 348px, 340px), judul di atas foto, kartu pencarian menimpa 64px bagian
 * bawah foto. Tinggi foto dihitung supaya header (61px) + pengumuman (37px) + kartu (±310px)
 * tetap muat di layar 390×664 tanpa menggulir. Desktop: foto ±520px di dalam container 1200px,
 * radius 24, judul rata kiri, kartu satu baris di bagian bawah foto.
 */
export function Hero({ settings, locations, index }: HeroProps) {
  const heroLocations = toHeroLocations(locations);
  const heroIndex = toHeroIndex(index, heroLocations);
  const custom = settings.heroImage && !isStockPhoto(settings.heroImage) ? mediaUrl(settings.heroImage) : null;
  const image = custom ?? DEFAULT_HERO_IMAGE;
  const legalName = settings.companyLegalName.trim() ? toDisplayLegalName(settings.companyLegalName) : null;

  return (
    <section
      aria-labelledby="hero-title"
      className="relative [--hero-photo-h:clamp(232px,calc(100svh_-_348px),340px)] md:mx-auto md:max-w-[1200px] md:px-6 md:pt-6 lg:px-8"
    >
      <div className="relative isolate md:flex md:min-h-[520px] md:flex-col md:justify-end md:overflow-hidden md:rounded-sheet md:p-10 lg:p-12">
        {/* Foto + overlay: mobile hanya setinggi area foto, desktop memenuhi seluruh kotak. */}
        <div className="absolute inset-x-0 top-0 -z-10 h-(--hero-photo-h) overflow-hidden bg-night md:inset-0 md:h-auto">
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1280px) 1200px, 100vw"
            loading="eager"
            fetchPriority="high"
            quality={50}
            className="object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-night/80 via-night/45 to-night/10"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden bg-linear-to-r from-night/55 via-night/20 to-transparent md:block"
          />
        </div>

        {/* Judul: di mobile menempel ke bawah foto, 16px di atas kartu yang menimpa 64px. */}
        <div className="flex min-h-(--hero-photo-h) flex-col justify-end px-4 pt-8 pb-20 sm:px-6 md:min-h-0 md:max-w-[720px] md:p-0 md:pb-6">
          <h1
            id="hero-title"
            className="line-clamp-2 text-hero font-extrabold tracking-[-0.02em] text-balance text-white [text-shadow:0_1px_16px_rgb(2_6_23/0.35)] md:text-hero-lg"
          >
            {settings.heroTitle}
          </h1>
          {settings.heroSubtitle.trim() ? (
            <p className="mt-2 line-clamp-2 max-w-[60ch] text-[15px] leading-[22px] text-white/90 [text-shadow:0_1px_12px_rgb(2_6_23/0.35)] md:mt-3 md:text-lg md:leading-7">
              {settings.heroSubtitle}
            </p>
          ) : null}
        </div>

        <div className="relative mx-4 -mt-16 sm:mx-6 md:m-0 md:max-w-[880px]">
          <div className="rounded-sheet bg-white p-4 shadow-raised md:p-6">
            {heroLocations.length > 0 ? (
              <HeroSearch locations={heroLocations} index={heroIndex} />
            ) : (
              <Button asChild size="lg" className="w-full md:w-auto">
                <Link href="/sewa">
                  Lihat semua unit
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>

          {legalName ? (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-caption font-medium text-ink-2 md:justify-start md:text-white/90">
              <ShieldCheck className="size-4 shrink-0 text-success md:text-white/90" aria-hidden="true" />
              <span>Dikelola resmi oleh {legalName}</span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
