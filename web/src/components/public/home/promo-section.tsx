import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CardRail } from "@/components/public/shared/card-rail";
import { Section, SectionHeading } from "@/components/public/shared/section-heading";
import { UnitCard } from "@/components/public/unit/unit-card";
import { cn } from "@/lib/utils";
import { sewaHref } from "@/lib/validation/filters";
import type { CatalogUnit } from "@/types/domain";

/**
 * Blok 2 beranda (PRD 6.2): carousel "Promo pilihan" dari pickFeatured(). Tidak dirender kalau kosong.
 * Di desktop (lg) CardRail menaruh dua tombol panah 56px di atas rel, rata kanan; tautan "Lihat semua"
 * digeser ke kiri tombol itu dan disejajarkan tingginya supaya tidak bertumpuk.
 */
export function PromoSection({ units }: { units: CatalogUnit[] }) {
  if (!units.length) return null;
  // Tombol panah hanya muncul kalau kartu lebih dari 4 kolom lg (CardRail menyembunyikannya kalau tidak ada yang digeser).
  const hasArrows = units.length > 4;

  return (
    <Section id="promo" aria-labelledby="promo-judul">
      <SectionHeading
        id="promo-judul"
        title="Promo pilihan"
        description="Unit dengan harga terbaik minggu ini."
        action={
          <Link
            href={sewaHref({ urut: "diskon" })}
            className={cn(
              "inline-flex min-h-11 items-center gap-1 rounded-control px-1 text-[15px] font-semibold text-brand-700 underline-offset-4 hover:underline",
              hasArrows && "lg:mr-28 lg:translate-y-3",
            )}
          >
            Lihat semua<span className="sr-only"> promo</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      <CardRail label="Promo pilihan">
        {units.map((unit) => (
          <UnitCard key={unit.id} unit={unit} layout="carousel" />
        ))}
      </CardRail>
    </Section>
  );
}
