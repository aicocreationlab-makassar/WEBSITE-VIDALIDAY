import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/public/shared/section-heading";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { sewaHref } from "@/lib/validation/filters";
import type { LocationWithTypes } from "@/types/domain";

type Props = {
  location: Pick<LocationWithTypes, "slug" | "shortName" | "availableCount" | "minPrice">;
};

/** Penutup profil apartemen (PRD 6.7): CTA "Lihat semua unit di {apartemen}" ke /sewa?lokasi=.... */
export function ApartmentCta({ location }: Props) {
  const summary =
    location.availableCount > 0 && location.minPrice !== null
      ? `${location.availableCount} unit siap disewa, mulai ${formatRupiah(location.minPrice)}/malam.`
      : "Lihat unit yang ada dan tanya jadwal kosong ke admin.";

  return (
    <Section aria-labelledby="apartemen-cta-judul">
      <div className="flex flex-col gap-5 rounded-sheet bg-night p-6 text-white md:flex-row md:items-center md:justify-between md:gap-10 md:px-10 md:py-9">
        <div className="min-w-0">
          <h2 id="apartemen-cta-judul" className="text-h2 font-bold text-balance md:text-h2-lg">
            Menginap di {location.shortName}
          </h2>
          <p className="mt-1 text-base text-white/85">{summary}</p>
        </div>
        <Button asChild size="lg" className="w-full shrink-0 focus-visible:ring-white/60 md:w-auto">
          <Link href={sewaHref({ lokasi: location.slug, penuh: location.availableCount === 0 })}>
            Lihat semua unit di {location.shortName}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Section>
  );
}
