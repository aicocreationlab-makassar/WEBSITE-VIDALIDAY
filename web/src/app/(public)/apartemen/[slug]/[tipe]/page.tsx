import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApartmentCta } from "@/components/public/apartment/apartment-cta";
import { ApartmentLocation } from "@/components/public/apartment/apartment-location";
import { roomTypeCards } from "@/components/public/apartment/apartment-model";
import { FacilityGrid } from "@/components/public/apartment/facility-grid";
import { RoomTypeList } from "@/components/public/apartment/room-type-list";
import { LandingHero } from "@/components/public/landing/landing-hero";
import {
  buildLanding,
  findLandingType,
  landingFaqs,
  landingGlobalFaqs,
  landingMetaDescription,
  landingMetaTitle,
  landingPath,
  landingSummary,
} from "@/components/public/landing/landing-model";
import { LandingUnitList } from "@/components/public/landing/landing-unit-list";
import { FaqList } from "@/components/public/shared/faq-list";
import { Section, SectionHeading } from "@/components/public/shared/section-heading";
import { SummaryBox } from "@/components/public/shared/summary-box";
import { AmenityGrid } from "@/components/public/unit-detail/amenity-list";
import { UnitBreadcrumb } from "@/components/public/unit-detail/unit-breadcrumb";
import { getCatalog } from "@/lib/data/catalog";
import { getFacilities, getFaqs, getLandmarks } from "@/lib/data/content";
import { getListedLocations } from "@/lib/data/locations";
import { getSettings } from "@/lib/data/settings";
import { getSiteUrl } from "@/lib/env";
import { apartmentPath } from "@/lib/seo/apartment-jsonld";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildLandingJsonLd } from "@/lib/seo/landing-jsonld";

const MAX_GLOBAL_FAQS = 4;

async function getLanding(slug: string, tipe: string) {
  const location = (await getListedLocations()).find((item) => item.slug === slug) ?? null;
  if (!location) return null;
  const type = findLandingType(location, tipe);
  return type ? { location, type } : null;
}

/** Semua pasangan apartemen × tipe yang punya unit diprerender; slug cadangan tidak ada → 404 asli. */
export async function generateStaticParams(): Promise<{ slug: string; tipe: string }[]> {
  const listed = await getListedLocations();
  const params = listed.flatMap((location) =>
    location.roomTypes.filter((type) => type.unitCount > 0).map((type) => ({ slug: location.slug, tipe: type.slug })),
  );
  return params.length ? params : [{ slug: "__none__", tipe: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/apartemen/[slug]/[tipe]">): Promise<Metadata> {
  const { slug, tipe } = await params;
  const found = await getLanding(slug, tipe);
  if (!found) return {};
  const data = buildLanding(found.location, found.type, await getCatalog());
  // openGraph sengaja tidak diisi (sama dengan profil apartemen): gambar OG bawaan diwarisi dari app/.
  return {
    title: { absolute: landingMetaTitle(data) },
    description: landingMetaDescription(data),
    alternates: { canonical: landingPath(data) },
  };
}

/**
 * Landing tipe kamar per apartemen (SEO, PRD 6.9): H1 entitas + kota, ringkasan fakta, daftar unit tipe
 * ini, fasilitas kamar yang umum, fasilitas gedung, lokasi, tipe lain, FAQ dari data. Statis sepenuhnya.
 */
export default async function RoomTypeLandingPage({ params }: PageProps<"/apartemen/[slug]/[tipe]">) {
  const { slug, tipe } = await params;
  const found = await getLanding(slug, tipe);
  if (!found) notFound();

  const [catalog, facilities, landmarks, globalFaqs, settings] = await Promise.all([
    getCatalog(),
    getFacilities(),
    getLandmarks(),
    getFaqs(),
    getSettings(),
  ]);
  const { location, type } = found;
  const data = buildLanding(location, type, catalog);
  const nearby = landmarks.filter((landmark) => landmark.locationId === location.id);
  const buildingFacilities = facilities.filter((facility) => facility.locationId === location.id);
  // FAQPage hanya untuk tanya-jawab khusus tipe ini; FAQ umum sudah ditandai di beranda dan profil apartemen.
  const typeFaqs = landingFaqs(data, settings, nearby);
  // FAQ umum yang topiknya sudah dijawab di atas (harga, tamu, jam check-in, cara pesan) tidak diulang.
  const faqs = [...typeFaqs, ...landingGlobalFaqs(globalFaqs, MAX_GLOBAL_FAQS)];
  const otherTypes = roomTypeCards(location, catalog).filter((card) => card.id !== type.id);
  // Alamat menuju peta di halaman ini (bagian #lokasi), bukan pindah ke profil apartemen.
  const summary = landingSummary(data, settings).map((row) => (row.label === "Alamat" ? { ...row, href: "#lokasi" } : row));

  return (
    <>
      <JsonLd data={buildLandingJsonLd({ data, siteUrl: getSiteUrl(), faqs: typeFaqs })} />

      <div className="mx-auto hidden w-full max-w-[1200px] px-4 pt-3 sm:px-6 md:block lg:px-8">
        <UnitBreadcrumb
          items={[
            { name: "Beranda", href: "/" },
            { name: location.shortName, href: apartmentPath(location.slug) },
            { name: type.name, href: landingPath(data) },
          ]}
        />
      </div>

      <LandingHero data={data} settings={settings} />

      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SummaryBox items={summary} />
      </div>

      <Section aria-labelledby="unit-tipe-judul">
        <SectionHeading
          id="unit-tipe-judul"
          title={`Unit ${type.name} di ${location.shortName}`}
          description={
            data.allFull
              ? "Semua unit tipe ini sedang penuh. Tanya jadwal kosong ke admin lewat halaman unit."
              : `${type.availableCount} unit tersedia, urut dari harga terendah. Harga per malam, konfirmasi akhir oleh admin.`
          }
        />
        <LandingUnitList units={data.units} label={`Unit ${type.name} di ${location.shortName}`} />
      </Section>

      {data.commonAmenities.length ? (
        <Section aria-labelledby="fasilitas-umum-judul" className="bg-surface">
          <SectionHeading
            id="fasilitas-umum-judul"
            title="Fasilitas kamar yang umum"
            description={`Ada di sebagian besar unit ${type.name} di ${location.shortName}; kelengkapan tiap unit tertulis di halaman unitnya.`}
          />
          <AmenityGrid amenities={data.commonAmenities} className="grid-cols-2 md:grid-cols-3 lg:grid-cols-4" />
        </Section>
      ) : null}

      {buildingFacilities.length ? (
        <Section aria-labelledby="fasilitas-gedung-judul">
          <SectionHeading
            id="fasilitas-gedung-judul"
            title={`Fasilitas gedung ${location.shortName}`}
            description={`Bisa kamu pakai selama menginap di ${location.shortName}.`}
          />
          <FacilityGrid facilities={buildingFacilities} apartmentName={location.shortName} />
        </Section>
      ) : null}

      <Section id="lokasi" aria-labelledby="lokasi-judul" className="scroll-mt-5 bg-surface">
        <SectionHeading
          id="lokasi-judul"
          title={`Lokasi ${location.shortName}`}
          description={location.area ? `${location.shortName} berada di ${location.area}, Makassar.` : undefined}
        />
        <ApartmentLocation location={location} landmarks={nearby} />
      </Section>

      {otherTypes.length ? (
        <Section aria-labelledby="tipe-lain-judul">
          <SectionHeading id="tipe-lain-judul" title={`Tipe lain di ${location.shortName}`} />
          <RoomTypeList types={otherTypes} apartmentName={location.shortName} />
        </Section>
      ) : null}

      <Section aria-labelledby="faq-judul" className="bg-surface" containerClassName="max-w-[880px]">
        <SectionHeading id="faq-judul" title={`Pertanyaan umum tentang ${type.name} di ${location.shortName}`} />
        <FaqList faqs={faqs} initial={faqs.length} />
      </Section>

      <ApartmentCta location={location} />
    </>
  );
}
