import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApartmentCta } from "@/components/public/apartment/apartment-cta";
import { ApartmentHero } from "@/components/public/apartment/apartment-hero";
import { ApartmentLocation } from "@/components/public/apartment/apartment-location";
import {
  apartmentMetaDescription,
  apartmentMetaTitle,
  roomTypeCards,
} from "@/components/public/apartment/apartment-model";
import { FacilityGrid } from "@/components/public/apartment/facility-grid";
import { RoomTypeList } from "@/components/public/apartment/room-type-list";
import { FaqList } from "@/components/public/shared/faq-list";
import { Section, SectionHeading } from "@/components/public/shared/section-heading";
import { UnitBreadcrumb } from "@/components/public/unit-detail/unit-breadcrumb";
import { getCatalog } from "@/lib/data/catalog";
import { getFacilities, getFaqs, getLandmarks } from "@/lib/data/content";
import { getListedLocations } from "@/lib/data/locations";
import { getSiteUrl } from "@/lib/env";
import { apartmentPath, buildApartmentPageJsonLd } from "@/lib/seo/apartment-jsonld";
import { JsonLd } from "@/lib/seo/json-ld";

const MAX_FAQS = 5;

/** Hanya apartemen terdaftar (aktif dan punya unit published) yang punya profil publik (PRD 7.5). */
async function getListedLocation(slug: string) {
  return (await getListedLocations()).find((location) => location.slug === slug) ?? null;
}

/**
 * Apartemen terdaftar (aktif dan punya unit) diprerender saat build, supaya `params` bisa dibaca
 * tanpa Suspense. Minimal satu entri (syarat Cache Components); slug cadangan tidak ada di DB → 404 asli.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const listed = await getListedLocations();
  return listed.length ? listed.map((location) => ({ slug: location.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/apartemen/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const location = await getListedLocation(slug);
  if (!location) return {};

  // openGraph sengaja tidak diisi: objek openGraph di sini akan menggantikan milik layout dan membuang
  // gambar OG bawaan (app/opengraph-image.tsx). og:title dan og:description diisi Next dari title/description.
  return {
    title: { absolute: apartmentMetaTitle(location.name) },
    description: apartmentMetaDescription(location),
    alternates: { canonical: apartmentPath(location.slug) },
  };
}

/**
 * Profil apartemen (PRD 6.7): foto gedung, nama, area, deskripsi; tipe kamar → /sewa; fasilitas gedung;
 * lokasi (peta + semua landmark); FAQ; CTA "Lihat semua unit di {apartemen}". Statis sepenuhnya:
 * tanpa searchParams/cookies, semua data dari fungsi "use cache".
 */
export default async function ApartmentPage({ params }: PageProps<"/apartemen/[slug]">) {
  const { slug } = await params;
  const location = await getListedLocation(slug);
  if (!location) notFound();

  const [catalog, facilities, landmarks, faqs] = await Promise.all([
    getCatalog(),
    getFacilities(),
    getLandmarks(),
    getFaqs(),
  ]);

  const types = roomTypeCards(location, catalog);
  const buildingFacilities = facilities.filter((facility) => facility.locationId === location.id);
  const nearby = landmarks.filter((landmark) => landmark.locationId === location.id);
  const shownFaqs = faqs.slice(0, MAX_FAQS);

  return (
    <>
      <JsonLd
        data={buildApartmentPageJsonLd({
          location,
          siteUrl: getSiteUrl(),
          facilities: buildingFacilities,
          faqs: shownFaqs,
        })}
      />

      <div className="mx-auto hidden w-full max-w-[1200px] px-4 pt-3 sm:px-6 md:block lg:px-8">
        <UnitBreadcrumb
          items={[
            { name: "Beranda", href: "/" },
            { name: location.shortName, href: apartmentPath(location.slug) },
          ]}
        />
      </div>

      <ApartmentHero location={location} typeCount={types.length} />

      {types.length ? (
        <Section aria-labelledby="tipe-kamar-judul" className="border-t border-line">
          <SectionHeading
            id="tipe-kamar-judul"
            title="Tipe kamar"
            description={`Pilih tipe kamar untuk melihat unit yang tersedia di ${location.shortName}.`}
          />
          <RoomTypeList types={types} apartmentName={location.shortName} />
        </Section>
      ) : null}

      {buildingFacilities.length ? (
        <Section aria-labelledby="fasilitas-gedung-judul" className="bg-surface">
          <SectionHeading
            id="fasilitas-gedung-judul"
            title="Fasilitas gedung"
            description={`Bisa kamu pakai selama menginap di ${location.shortName}.`}
          />
          <FacilityGrid facilities={buildingFacilities} apartmentName={location.name} />
        </Section>
      ) : null}

      {/* scroll-mt kecil: html sudah punya scroll-padding-top setinggi header (60/72px). */}
      <Section id="lokasi" aria-labelledby="lokasi-judul" className="scroll-mt-5">
        <SectionHeading
          id="lokasi-judul"
          title="Lokasi"
          description={location.area ? `${location.shortName} berada di ${location.area}, Makassar.` : undefined}
        />
        <ApartmentLocation location={location} landmarks={nearby} />
      </Section>

      {shownFaqs.length ? (
        <Section aria-labelledby="faq-judul" className="bg-surface" containerClassName="max-w-[880px]">
          <SectionHeading id="faq-judul" title="Pertanyaan umum" />
          <FaqList faqs={shownFaqs} initial={MAX_FAQS} />
        </Section>
      ) : null}

      <ApartmentCta location={location} />
    </>
  );
}
