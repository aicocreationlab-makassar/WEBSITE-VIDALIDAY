import type { Metadata } from "next";
import { ApartmentsSection } from "@/components/public/home/apartments-section";
import { ClosingCta } from "@/components/public/home/closing-cta";
import { FaqSection } from "@/components/public/home/faq-section";
import { PromoSection } from "@/components/public/home/promo-section";
import { WhySection } from "@/components/public/home/why-section";
import { Hero } from "@/components/public/hero/hero";
import { RecentlyViewed } from "@/components/public/shared/recently-viewed";
import { getCatalog, getSearchIndex } from "@/lib/data/catalog";
import { getFaqs } from "@/lib/data/content";
import { getListedLocations } from "@/lib/data/locations";
import { getSettings } from "@/lib/data/settings";
import { getSiteUrl } from "@/lib/env";
import { pickFeatured } from "@/lib/featured";
import { apartmentPageUrl } from "@/lib/seo/apartment-jsonld";
import { buildHomeJsonLd } from "@/lib/seo/home-jsonld";
import { JsonLd } from "@/lib/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: { absolute: settings.seoTitle },
    description: settings.seoDescription,
    alternates: { canonical: "/" },
    // Tanpa objek openGraph di sini: objek halaman akan menimpa milik layout dan membuang gambar OG bawaan.
  };
}

/**
 * Beranda (PRD 6.2): hero + kotak pencarian, lalu maksimal 6 blok.
 * Statis sepenuhnya (tanpa searchParams/cookies); semua data dari fungsi "use cache".
 * Latar berselang: putih (promo), surface (apartemen + riwayat), putih (alasan), surface (FAQ), putih (penutup).
 */
export default async function HomePage() {
  const [settings, listed, catalog, index, faqs] = await Promise.all([
    getSettings(),
    getListedLocations(),
    getCatalog(),
    getSearchIndex(),
    getFaqs(),
  ]);

  const featured = pickFeatured(catalog);
  const siteUrl = getSiteUrl();
  const jsonLd = buildHomeJsonLd({
    siteUrl,
    whatsappNumber: settings.whatsappNumber,
    prices: catalog.map((unit) => unit.effectivePrice),
    description: settings.seoDescription,
    email: settings.contactEmail,
    images: listed.map((location) => location.imageUrl),
    legalName: settings.companyLegalName,
    officeHours: settings.officeHours,
    sameAs: [settings.instagramUrl, settings.facebookUrl, settings.tiktokUrl, settings.googleBusinessUrl],
    locations: listed.map((location) => ({
      name: location.name,
      url: apartmentPageUrl(siteUrl, location.slug),
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    })),
    faqs,
  });

  return (
    <>
      {jsonLd.map((data) => (
        <JsonLd key={data["@type"]} data={data} />
      ))}

      <Hero settings={settings} locations={listed} index={index} />

      <PromoSection units={featured} />

      <ApartmentsSection locations={listed} className="bg-surface" />

      {/* Riwayat (hanya kalau ada) menyambung latar blok apartemen, tanpa jarak atas ganda. */}
      <RecentlyViewed
        current={index.map((row) => ({ id: row.id, p: row.p }))}
        className={listed.length ? "bg-surface pt-0 md:pt-0" : "bg-surface"}
      />

      <WhySection legalName={settings.companyLegalName} />

      <FaqSection faqs={faqs} className="bg-surface" />

      <ClosingCta whatsappNumber={settings.whatsappNumber} officeHours={settings.officeHours} />
    </>
  );
}
