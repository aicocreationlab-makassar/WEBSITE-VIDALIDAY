import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, MapPin } from "lucide-react";
import { PhotoPlaceholder } from "@/components/public/unit/photo-placeholder";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { sewaHref } from "@/lib/validation/filters";
import type { LocationWithTypes } from "@/types/domain";

/** Kolom grid: 1 di mobile, 2 di md; 3 di lg kalau apartemen ada 3 atau lebih. */
export function apartmentCardSizes(columns: 2 | 3): string {
  return columns === 3
    ? "(max-width: 767px) 92vw, (max-width: 1023px) 46vw, 370px"
    : "(max-width: 767px) 92vw, (max-width: 1199px) 46vw, 560px";
}

type Props = {
  location: LocationWithTypes;
  sizes: string;
  className?: string;
};

/**
 * Kartu apartemen di beranda (PRD 6.2 blok 3): foto gedung, nama, area, unit tersedia, harga mulai.
 * Seluruh kartu menuju /sewa?lokasi=... lewat pseudo-elemen tautan "Lihat unit" (tanpa tautan bersarang);
 * "Tentang apartemen" berada di atas lapisan itu (z-10) dan menuju profil apartemen.
 */
export function ApartmentCard({ location, sizes, className }: Props) {
  const available = location.availableCount;

  return (
    <article
      data-testid="apartment-card"
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card ring-1 ring-line/80 transition-[box-shadow,transform] duration-200 ease-out md:hover:-translate-y-0.5 md:hover:shadow-card-hover",
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        {location.imageUrl ? (
          <Image
            src={location.imageUrl}
            alt={`Gedung ${location.name}`}
            fill
            sizes={sizes}
            className="object-cover"
          />
        ) : (
          <PhotoPlaceholder />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 md:p-5">
        <h3 className="text-card font-bold text-ink">{location.name}</h3>
        {location.area ? (
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{location.area}</span>
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2">
            <BedDouble className="size-4 shrink-0 text-muted" aria-hidden="true" />
            {available > 0 ? `${available} unit tersedia` : "Semua unit penuh"}
          </p>
          {location.minPrice !== null ? (
            <p className="text-right whitespace-nowrap">
              <span className="block text-caption font-medium text-muted">Mulai </span>
              <span className="text-price font-extrabold tracking-tight text-ink tabular-nums">
                {formatRupiah(location.minPrice)}
              </span>
              <span className="text-sm font-medium text-muted">/malam</span>
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <Link
            href={sewaHref({ lokasi: location.slug })}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control whitespace-nowrap border-[1.5px] border-brand-600 bg-white px-4 text-[15px] font-semibold text-brand-700 transition-colors duration-150 ease-out group-hover:bg-brand-50 after:absolute after:inset-0 after:content-[''] focus-visible:ring-3 focus-visible:ring-brand-500/20"
          >
            Lihat unit<span className="sr-only"> di {location.shortName}</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href={`/apartemen/${location.slug}`}
            className="relative z-10 inline-flex min-h-11 shrink-0 items-center rounded-control px-2 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Tentang apartemen<span className="sr-only"> {location.shortName}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
