import Image from "next/image";
import Link from "next/link";
import { BedDouble, MapPin, Users } from "lucide-react";
import { Icon } from "@/lib/icons";
import { cardAmenities, formatUnitPlace, guestsLabel, unitHref } from "@/lib/unit-display";
import { cn } from "@/lib/utils";
import type { CatalogUnit } from "@/types/domain";
import { CardGallery } from "./card-gallery";
import { PhotoPlaceholder } from "./photo-placeholder";
import { PriceTag } from "./price";
import { UnitBadges } from "./unit-badges";

export const CARD_SIZES = {
  grid: "(max-width: 767px) 92vw, (max-width: 1279px) 46vw, 380px",
  carousel: "(max-width: 767px) 82vw, 300px",
} as const;

type UnitCardProps = {
  unit: CatalogUnit;
  /** grid = boleh geser foto (hasil /sewa); carousel = satu foto (promo, serupa, riwayat). */
  layout?: "grid" | "carousel";
  /** Elemen tambahan di bawah nama, mis. chip alasan rekomendasi. */
  extra?: React.ReactNode;
  headingLevel?: "h2" | "h3";
  className?: string;
  /** Props tambahan tautan judul (mis. onClick untuk event recommendation_click; hanya dari komponen klien). */
  linkProps?: Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">;
};

/**
 * Kartu unit (DESIGN 4.6). Seluruh kartu satu tautan: judul memakai pseudo-elemen yang menutupi kartu,
 * sehingga tidak ada tombol di dalam tautan. Tombol galeri berada di atas lapisan itu (z-10).
 */
export function UnitCard({ unit, layout = "grid", extra, headingLevel = "h3", className, linkProps }: UnitCardProps) {
  const Heading = headingLevel;
  const amenities = cardAmenities(unit.amenities);
  const sizes = CARD_SIZES[layout];
  const alt = unit.name;
  const dimmed = !unit.isAvailable;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card ring-1 ring-line/80 transition-[box-shadow,transform] duration-200 ease-out focus-within:ring-2 focus-within:ring-brand-500 md:hover:-translate-y-0.5 md:hover:shadow-card-hover",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {unit.photos.length === 0 ? (
          <PhotoPlaceholder />
        ) : layout === "grid" && unit.photos.length > 1 ? (
          <CardGallery photos={unit.photos} href={unitHref(unit.slug)} alt={alt} sizes={sizes} dimmed={dimmed} />
        ) : (
          <Image
            src={unit.photos[0]}
            alt={`${alt}, foto 1`}
            fill
            sizes={sizes}
            className={cn("object-cover object-[50%_55%]", dimmed && "grayscale-[60%]")}
          />
        )}
        <UnitBadges unit={unit} className="pointer-events-none absolute top-2.5 left-2.5 z-10" />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{formatUnitPlace(unit)}</span>
        </p>
        <Heading className="line-clamp-2 text-card font-bold text-ink">
          <Link
            href={unitHref(unit.slug)}
            className="outline-none after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:underline"
            {...linkProps}
          >
            {unit.name}
          </Link>
        </Heading>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="size-4 text-muted" aria-hidden="true" />
            {unit.roomTypeName ?? "Unit"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4 text-muted" aria-hidden="true" />
            {guestsLabel(unit.maxGuests)}
          </span>
        </p>
        {amenities.length ? (
          <ul className="flex min-w-0 items-center gap-3 overflow-hidden text-caption text-muted" aria-label="Fasilitas utama">
            {amenities.map((amenity) => (
              <li key={amenity.id} className="inline-flex min-w-0 shrink-0 items-center gap-1 last:shrink">
                <Icon name={amenity.icon} className="size-4 shrink-0" />
                <span className="truncate">{amenity.name}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {extra}
        <PriceTag unit={unit} className="mt-auto pt-2" />
      </div>
    </article>
  );
}
