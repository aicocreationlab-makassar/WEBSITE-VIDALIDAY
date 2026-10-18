import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingProvider } from "@/components/public/booking/booking-provider";
import { RecordView } from "@/components/public/recommend/record-view";
import { initialOrder } from "@/components/public/recommend/recommend-model";
import { SimilarUnits } from "@/components/public/recommend/similar-units";
import { FaqList } from "@/components/public/shared/faq-list";
import { SectionHeading } from "@/components/public/shared/section-heading";
import { AmenityList } from "@/components/public/unit-detail/amenity-list";
import { BookingCard } from "@/components/public/unit-detail/booking-card";
import { BuildingFacilities } from "@/components/public/unit-detail/building-facilities";
import { DetailSection } from "@/components/public/unit-detail/detail-section";
import { KeyFacts } from "@/components/public/unit-detail/key-facts";
import { LocationSection } from "@/components/public/unit-detail/location-section";
import { StayInfo } from "@/components/public/unit-detail/stay-info";
import { StickyCta } from "@/components/public/unit-detail/sticky-cta";
import { UnitBreadcrumb } from "@/components/public/unit-detail/unit-breadcrumb";
import { UnitDescription } from "@/components/public/unit-detail/unit-description";
import { UnitGallery } from "@/components/public/unit-detail/unit-gallery";
import { UnitPriceBlock, UnitTitle } from "@/components/public/unit-detail/unit-summary";
import { getCatalog, getUnitBySlug } from "@/lib/data/catalog";
import { getFacilities, getFaqs, getLandmarks } from "@/lib/data/content";
import { getPopularity } from "@/lib/data/popularity";
import { getSettings } from "@/lib/data/settings";
import { getSiteUrl } from "@/lib/env";
import { formatOfficeHours } from "@/lib/format";
import { scoreSimilar } from "@/lib/recommend";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildUnitJsonLd } from "@/lib/seo/unit-jsonld";
import {
  cleanDescription,
  isLongText,
  parseHouseRules,
  similarFallbackPool,
  toBookingUnit,
  toCatalogUnit,
  unitBreadcrumbs,
  unitFacts,
  unitMetaDescription,
  unitMetaTitle,
  unitSummarySentence,
} from "@/lib/unit-detail";
import { unitHref } from "@/lib/unit-display";
import { cn } from "@/lib/utils";
import { MAX_GUESTS } from "@/lib/validation/booking-constants";
import { sewaHref } from "@/lib/validation/filters";
import { youtubeId } from "@/lib/youtube";

const CONTAINER = "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8";
const MAX_FAQS = 5;

/**
 * Semua unit published diprerender saat build, supaya `params` bisa dibaca tanpa Suspense.
 * Minimal satu entri (syarat Cache Components); slug cadangan tidak ada di DB → 404 asli.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const catalog = await getCatalog();
  return catalog.length ? catalog.map((unit) => ({ slug: unit.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/unit/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const unit = await getUnitBySlug(slug);
  if (!unit) return {};

  const title = unitMetaTitle(unit);
  const description = unitMetaDescription(unit);
  const url = unitHref(unit.slug);
  return {
    title,
    description,
    alternates: { canonical: url },
    // Gambar OG berasal dari opengraph-image.tsx di folder ini. Objek ini menggantikan openGraph layout,
    // jadi locale dan siteName diulang.
    openGraph: { type: "website", url, title, description, locale: "id_ID", siteName: "VIDALIDAY" },
  };
}

/**
 * Detail unit (PRD 6.4, DESIGN 4.8, UX 2.4). Statis sepenuhnya: tanpa searchParams/cookies,
 * semua data dari fungsi "use cache"; personalisasi "Unit serupa" terjadi di klien.
 */
export default async function UnitPage({ params }: PageProps<"/unit/[slug]">) {
  const { slug } = await params;
  const unit = await getUnitBySlug(slug);
  if (!unit) notFound();

  const [settings, catalog, landmarks, facilities, faqs, popularity] = await Promise.all([
    getSettings(),
    getCatalog(),
    getLandmarks(),
    getFacilities(),
    getFaqs(),
    getPopularity(),
  ]);

  const current = toCatalogUnit(unit);
  const full = !unit.isAvailable;
  const description = cleanDescription(unit.description);
  const nearby = landmarks.filter((landmark) => landmark.locationId === unit.locationId);
  const buildingFacilities = facilities.filter((facility) => facility.locationId === unit.locationId);
  const largerUnitsHref = sewaHref({ lokasi: unit.locationSlug, tamu: Math.min(unit.maxGuests + 1, MAX_GUESTS) });
  const officeHours = formatOfficeHours(settings.officeHours);

  const stage1 = scoreSimilar(current, catalog, popularity);
  const pool = similarFallbackPool(current, catalog);
  // Tanpa kandidat: jangan render pembungkus kosong (jumlah kartu klien selalu sama dengan ini).
  const hasSimilar = initialOrder(current, stage1, pool).length > 0;
  const similar = <SimilarUnits current={current} stage1={stage1} pool={pool} />;

  return (
    <BookingProvider
      unit={toBookingUnit(current)}
      settings={{
        whatsappNumber: settings.whatsappNumber,
        bookingWhatsappTemplate: settings.bookingWhatsappTemplate,
        officeHours: settings.officeHours,
      }}
      siteUrl={getSiteUrl()}
      largerUnitsHref={largerUnitsHref}
    >
      <JsonLd data={buildUnitJsonLd({ unit, siteUrl: getSiteUrl() })} />
      <RecordView unit={current} />

      {/* Ruang untuk bar CTA mobile (72px + safe area) sudah ada di padding bawah footer (6rem + safe area). */}
      <div>
        <div className={cn(CONTAINER, "hidden pt-3 pb-1 md:block")}>
          <UnitBreadcrumb items={unitBreadcrumbs(current)} />
        </div>

        <UnitGallery unitSlug={unit.slug} unitName={unit.name} photos={unit.photos} youtubeId={youtubeId(unit.youtubeUrl)} />

        <div
          className={cn(
            CONTAINER,
            "md:grid md:grid-cols-[minmax(0,1fr)_300px] md:gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10",
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-col gap-5 pt-5 pb-8 md:pt-8 md:pb-10">
              <UnitTitle unit={current} />
              <UnitPriceBlock unit={current} />
              {/* Kalimat ringkasan teks polos (SEO/AI Overview): semua angka utama tanpa ikon. */}
              <p className="text-base leading-[26px] text-ink-2" data-testid="unit-summary">
                {unitSummarySentence(current)}
              </p>
            </div>

            {/* Unit penuh: alternatif yang tersedia langsung di bawah harga (PRD 6.4). */}
            {full && hasSimilar ? <div className="border-t border-line py-8 md:py-10">{similar}</div> : null}

            <KeyFacts facts={unitFacts(current)} className="border-t border-line py-8 md:py-10" />

            {current.amenities.length ? (
              <DetailSection headingId="fasilitas-kamar-judul" title="Fasilitas kamar">
                <AmenityList amenities={current.amenities} />
              </DetailSection>
            ) : null}

            {description ? (
              <DetailSection headingId="deskripsi-judul" title="Deskripsi">
                <UnitDescription text={description} likelyLong={isLongText(description)} />
              </DetailSection>
            ) : null}

            <DetailSection headingId="info-menginap-judul" title="Info menginap">
              <StayInfo
                checkinTime={settings.checkinTime}
                checkoutTime={settings.checkoutTime}
                requirements={settings.checkinRequirements}
                rules={parseHouseRules(settings.houseRules)}
              />
            </DetailSection>

            <LocationSection location={unit.location} landmarks={nearby} />
          </div>

          <div className="hidden md:block md:pt-8 md:pb-10">
            <BookingCard unit={current} largerUnitsHref={largerUnitsHref} officeHours={officeHours} />
          </div>
        </div>

        {buildingFacilities.length ? (
          <section aria-labelledby="fasilitas-gedung-judul" className="bg-surface py-10 md:py-14">
            <div className={CONTAINER}>
              <SectionHeading
                id="fasilitas-gedung-judul"
                title="Fasilitas gedung"
                description={`Bisa kamu pakai selama menginap di ${unit.location.shortName}.`}
              />
              <BuildingFacilities facilities={buildingFacilities} apartmentName={unit.location.shortName} />
            </div>
          </section>
        ) : null}

        {!full && hasSimilar ? <div className={cn(CONTAINER, "py-10 md:py-14")}>{similar}</div> : null}

        {faqs.length ? (
          <section aria-labelledby="faq-judul" className="border-t border-line py-10 md:py-14">
            <div className={cn(CONTAINER, "max-w-[880px]")}>
              <SectionHeading id="faq-judul" title="Pertanyaan umum" />
              <FaqList faqs={faqs.slice(0, MAX_FAQS)} initial={MAX_FAQS} />
            </div>
          </section>
        ) : null}
      </div>

      <StickyCta unit={current} />
    </BookingProvider>
  );
}
