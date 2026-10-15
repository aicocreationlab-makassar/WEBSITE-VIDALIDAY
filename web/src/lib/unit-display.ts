// Teks tampilan unit (fungsi murni, ada test). Tidak pernah menghasilkan potongan kosong
// seperti "Tower  lt." (DESIGN 4.6, UX "formatUnitPlace").

import type { Amenity, CatalogUnit } from "@/types/domain";

type PlaceFields = Pick<CatalogUnit, "locationShortName" | "locationArea" | "tower" | "floorNumber">;

/** Bagian lokasi di dalam gedung: "Tower Ashton lt. 26", "Tower Ashton", "Lantai 26", atau null. */
export function formatUnitSpot(unit: Pick<CatalogUnit, "tower" | "floorNumber">): string | null {
  const tower = unit.tower?.trim();
  const towerLabel = tower ? (/^tower\b/i.test(tower) ? tower : `Tower ${tower}`) : null;
  if (towerLabel && unit.floorNumber != null) return `${towerLabel} lt. ${unit.floorNumber}`;
  if (towerLabel) return towerLabel;
  if (unit.floorNumber != null) return `Lantai ${unit.floorNumber}`;
  return null;
}

/** "Vida View · Tower Ashton lt. 26" → fallback ke area → nama apartemen saja. */
export function formatUnitPlace(unit: PlaceFields): string {
  const spot = formatUnitSpot(unit) ?? unit.locationArea;
  return spot ? `${unit.locationShortName} · ${spot}` : unit.locationShortName;
}

export function unitHref(slug: string): string {
  return `/unit/${encodeURIComponent(slug)}`;
}

/** Fasilitas utama untuk kartu: yang bukan ikon generik, urut sort_order, maks. n. */
export function cardAmenities(amenities: Amenity[], limit = 3): Amenity[] {
  const primary = amenities.filter((a) => a.icon !== "check");
  return (primary.length >= limit ? primary : [...primary, ...amenities.filter((a) => a.icon === "check")]).slice(
    0,
    limit,
  );
}

export function guestsLabel(maxGuests: number): string {
  return `Maks. ${maxGuests} tamu`;
}
