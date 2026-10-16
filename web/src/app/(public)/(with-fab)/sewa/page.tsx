import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyResults } from "@/components/public/search/empty-results";
import { amenityFacets, sanitizeFilter, toSearchLocations } from "@/components/public/search/filter-model";
import { ResultsGrid } from "@/components/public/search/results-grid";
import { SearchView } from "@/components/public/search/search-view";
import { SewaSkeleton } from "@/components/public/search/sewa-skeleton";
import { RecentlyViewed } from "@/components/public/shared/recently-viewed";
import { getCatalog, getSearchIndex } from "@/lib/data/catalog";
import { getAmenities } from "@/lib/data/content";
import { getListedLocations } from "@/lib/data/locations";
import { getPopularity } from "@/lib/data/popularity";
import { Icon } from "@/lib/icons";
import { searchUnits } from "@/lib/search";
import { parseSewaFilter } from "@/lib/validation/filters";

export const metadata: Metadata = {
  title: "Cari unit apartemen di Makassar",
  description:
    "Bandingkan unit apartemen harian di Makassar: pilih apartemen, tipe kamar, budget per malam, dan fasilitas, lalu sewa langsung via WhatsApp.",
  alternates: { canonical: "/sewa" },
};

/**
 * Hasil pencarian /sewa (PRD 6.3). Kerangka halaman statis; hasil bergantung searchParams sehingga
 * dirender per permintaan di dalam Suspense (skeleton sebagai fallback). Semua data dari fungsi "use cache".
 */
export default async function SewaPage({ searchParams }: PageProps<"/sewa">) {
  // Indeks di-cache 'max' (bagian dari kerangka statis); dipakai untuk membuang riwayat unit yang sudah tidak ada.
  const index = await getSearchIndex();
  return (
    <>
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-5 pb-10 sm:px-6 md:pt-8 md:pb-[72px] lg:px-8">
        <Suspense fallback={<SewaSkeleton />}>
          <SewaResults searchParams={searchParams} />
        </Suspense>
      </div>
      {/* Hanya tampil kalau ada riwayat di perangkat ini; setelah hasil supaya tidak menggeser layout. */}
      <RecentlyViewed current={index.map((row) => ({ id: row.id, p: row.p }))} className="bg-surface" />
    </>
  );
}

async function SewaResults({ searchParams }: Pick<PageProps<"/sewa">, "searchParams">) {
  const requested = parseSewaFilter(await searchParams);
  const [catalog, listed, amenityRows, index, popularity] = await Promise.all([
    getCatalog(),
    getListedLocations(),
    getAmenities(),
    getSearchIndex(),
    getPopularity(),
  ]);

  const locations = toSearchLocations(listed);
  const filter = sanitizeFilter(
    requested,
    locations,
    amenityRows.map((amenity) => amenity.id),
  );
  const result = searchUnits(catalog, filter, popularity);
  // Ikon dirender di server: registry ikon tidak ikut ke bundle klien.
  const amenities = amenityFacets(catalog, amenityRows, filter.fasilitas).map((facet) => ({
    id: facet.id,
    name: facet.name,
    icon: <Icon name={facet.icon} />,
  }));

  return (
    <SearchView
      filter={filter}
      total={result.total}
      shown={result.items.length}
      hasMore={result.hasMore}
      locations={locations}
      amenities={amenities}
      index={index}
    >
      {result.total ? <ResultsGrid units={result.items} /> : <EmptyResults suggestions={result.suggestions} />}
    </SearchView>
  );
}
