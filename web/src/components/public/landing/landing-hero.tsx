import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apartmentPath } from "@/lib/seo/apartment-jsonld";
import { landingCtaHref, landingH1, landingIntro, type LandingData, type LandingSettings } from "./landing-model";

const CONTAINER = "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8";

type Props = { data: LandingData; settings: LandingSettings };

/**
 * Pembuka landing tipe kamar: H1 dengan entitas + kota, baris area, dua paragraf fakta, CTA utama ke
 * daftar unit tipe ini di /sewa dan tautan ke profil apartemen. Server component, tanpa JS.
 */
export function LandingHero({ data, settings }: Props) {
  const [first, second] = landingIntro(data, settings);
  const place = data.location.area ? `${data.location.area}, Makassar` : "Makassar";
  const availableLabel = data.allFull ? `Lihat ${data.units.length} unit (sedang penuh)` : `Lihat ${data.type.availableCount} unit tersedia`;

  return (
    <section aria-labelledby="landing-judul" className="pt-4 pb-8 md:pt-6 md:pb-10">
      {/* Kontainer 1200px sejajar breadcrumb dan Ringkasan; hanya lebar teks yang dibatasi 880px. */}
      <div className={CONTAINER}>
        <div className="max-w-[880px]">
          <h1 id="landing-judul" className="text-h1 font-extrabold tracking-tight text-balance text-ink md:text-h1-lg">
            {landingH1(data)}
          </h1>
          <p className="mt-2 flex items-start gap-1.5 text-[15px] leading-6 text-ink-2">
            <MapPin className="mt-[3px] size-[18px] shrink-0 text-brand-600" strokeWidth={1.75} aria-hidden="true" />
            <span>
              {data.location.name}, {place}
            </span>
          </p>
          <p className="mt-5 text-base leading-[26px] text-ink-2">{first}</p>
          <p className="mt-3 text-base leading-[26px] text-ink-2">{second}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={landingCtaHref(data)}>
                {availableLabel}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
              <Link href={apartmentPath(data.location.slug)}>Profil {data.location.shortName}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
