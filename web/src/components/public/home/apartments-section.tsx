import { Section, SectionHeading } from "@/components/public/shared/section-heading";
import { cn } from "@/lib/utils";
import type { LocationWithTypes } from "@/types/domain";
import { ApartmentCard, apartmentCardSizes } from "./apartment-card";

/** Blok 3 beranda (PRD 6.2): satu kartu per apartemen yang tampil (aktif dan punya unit). */
export function ApartmentsSection({ locations, className }: { locations: LocationWithTypes[]; className?: string }) {
  if (!locations.length) return null;
  const columns = locations.length >= 3 ? 3 : 2;

  return (
    <Section id="apartemen" aria-labelledby="apartemen-judul" className={className}>
      <SectionHeading
        id="apartemen-judul"
        title="Pilih apartemen"
        description="Lihat unit yang tersedia di tiap apartemen."
      />
      <ul className={cn("grid gap-4 md:grid-cols-2 md:gap-6", columns === 3 && "lg:grid-cols-3")}>
        {locations.map((location) => (
          <li key={location.id} className="min-w-0">
            <ApartmentCard location={location} sizes={apartmentCardSizes(columns)} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
