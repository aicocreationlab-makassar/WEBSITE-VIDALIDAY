import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, LayoutGrid, MapPin } from "lucide-react";
import { PhotoPlaceholder } from "@/components/public/unit/photo-placeholder";
import { UnitDescription } from "@/components/public/unit-detail/unit-description";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { cleanDescription, isLongText } from "@/lib/unit-detail";
import { cn } from "@/lib/utils";
import { sewaHref } from "@/lib/validation/filters";
import type { LocationWithTypes } from "@/types/domain";

const CONTAINER = "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8";
const CHIP =
  "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold text-ink-2 ring-1 ring-line";

type Props = {
  location: LocationWithTypes;
  /** Jumlah kartu tipe kamar yang tampil (tipe dengan unit). */
  typeCount: number;
};

/**
 * Pembuka profil apartemen (PRD 6.7): foto gedung, nama (H1), area, tagline, deskripsi singkat,
 * harga mulai, jumlah unit, dan CTA utama. Mobile: foto selebar layar (4:3, maks. 60svh) lalu teks;
 * desktop: foto kiri (radius 24) dan teks kanan. Teks tidak ditaruh di atas foto supaya selalu terbaca.
 */
export function ApartmentHero({ location, typeCount }: Props) {
  const description = cleanDescription(location.description);
  const tagline = location.tagline?.trim() || null;
  const place = location.area ? `${location.area}, Makassar` : "Makassar";
  const unitsHref = sewaHref({ lokasi: location.slug });

  return (
    <section aria-labelledby="apartemen-judul" className="pb-10 md:pt-6 md:pb-[72px]">
      <div
        className={cn(
          CONTAINER,
          "md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center md:gap-10 lg:gap-14",
        )}
      >
        <div className="relative -mx-4 aspect-[4/3] max-h-[60svh] overflow-hidden bg-surface-2 sm:-mx-6 md:mx-0 md:max-h-none md:rounded-sheet">
          {location.imageUrl ? (
            <Image
              src={location.imageUrl}
              alt={`Gedung ${location.name}`}
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1199px) 52vw, 610px"
              loading="eager"
              fetchPriority="high"
              className="object-cover object-[50%_55%]"
            />
          ) : (
            <PhotoPlaceholder label="Foto gedung segera hadir" />
          )}
        </div>

        <div className="pt-5 md:pt-0">
          <h1 id="apartemen-judul" className="text-h1 font-extrabold tracking-tight text-balance text-ink md:text-h1-lg">
            {location.name}
          </h1>
          <p className="mt-2 flex items-start gap-1.5 text-[15px] leading-6 text-ink-2">
            <MapPin className="mt-[3px] size-[18px] shrink-0 text-brand-600" strokeWidth={1.75} aria-hidden="true" />
            <span>
              {place}
              <span aria-hidden="true"> · </span>
              <a
                href="#lokasi"
                className="-my-3 inline-block py-3 font-semibold whitespace-nowrap text-brand-700 underline-offset-4 hover:underline"
              >
                Lihat peta
              </a>
            </span>
          </p>

          {tagline ? <p className="mt-3 text-base leading-[26px] font-semibold text-ink md:text-lg">{tagline}</p> : null}

          <div className="mt-5 rounded-card bg-surface p-4 ring-1 ring-line/80 md:p-5">
            {location.minPrice !== null ? (
              <p className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-sm font-medium text-ink-2">Mulai</span>
                <span className="text-price-lg font-extrabold tracking-tight text-ink tabular-nums md:text-price-xl">
                  {formatRupiah(location.minPrice)}
                </span>
                <span className="text-base font-medium text-ink-2">/malam</span>
              </p>
            ) : (
              <p className="text-lg font-bold text-ink">
                {location.unitCount > 0 ? "Semua unit sedang penuh" : "Unit segera hadir"}
              </p>
            )}
            {location.unitCount > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Ringkasan unit di ${location.shortName}`}>
                <li className={CHIP}>
                  <BedDouble className="size-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
                  {location.availableCount > 0 ? `${location.availableCount} unit tersedia` : `${location.unitCount} unit`}
                </li>
                {typeCount > 0 ? (
                  <li className={CHIP}>
                    <LayoutGrid className="size-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
                    {typeCount} tipe kamar
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>

          <Button asChild size="lg" className="mt-5 w-full sm:w-auto">
            <Link href={unitsHref}>
              Lihat semua unit di {location.shortName}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>

          {description ? (
            <div className="mt-6">
              <UnitDescription text={description} likelyLong={isLongText(description)} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
