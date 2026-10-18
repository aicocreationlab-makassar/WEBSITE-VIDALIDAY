// Peta: ambil koordinat dari link Google Maps (PRD 7.5) dan bentuk URL embed/tautan luar (PRD 6.4).

export type LatLng = { lat: number; lng: number };

function valid(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";

/**
 * Titik dari link Google Maps. `precise` = pin tempat ("!3d<lat>!4d<lng>") atau titik yang ditulis eksplisit
 * ("q=" / "query=" / "ll=" / "destination="). "@<lat>,<lng>" dan "center=" hanya titik TENGAH tampilan peta
 * saat link disalin (bisa ratusan meter dari gedung, bahkan di laut) → `precise: false`.
 * Link pendek (maps.app.goo.gl) tidak bisa dibaca → null.
 */
export function parseGmapsPoint(url: string | null | undefined): { point: LatLng; precise: boolean } | null {
  if (!url) return null;
  let text = url.trim();
  try {
    text = decodeURIComponent(text);
  } catch {
    // biarkan apa adanya
  }
  const patterns: [RegExp, boolean][] = [
    [new RegExp(`!3d${NUM}!4d${NUM}`), true],
    [new RegExp(`[?&](?:q|query|ll|destination)=${NUM}\\s*,\\s*${NUM}`), true],
    [new RegExp(`@${NUM},${NUM}`), false],
    [new RegExp(`[?&]center=${NUM}\\s*,\\s*${NUM}`), false],
  ];
  for (const [pattern, precise] of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const point = valid(Number(match[1]), Number(match[2]));
      if (point) return { point, precise };
    }
  }
  return null;
}

/** Koordinat terbaik dari link: pin kalau ada, kalau tidak titik tengah tampilan. */
export function parseGmapsCoordinates(url: string | null | undefined): LatLng | null {
  return parseGmapsPoint(url)?.point ?? null;
}

/** Jarak dua titik dalam meter (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isShortGmapsLink(url: string | null | undefined): boolean {
  return Boolean(url && /(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(url));
}

type MapPlace = {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  gmapsUrl?: string | null;
};

/** Teks pencarian peta: koordinat kalau ada, kalau tidak "nama apartemen, alamat". */
export function mapQuery(place: MapPlace): string {
  if (place.latitude != null && place.longitude != null) return `${place.latitude},${place.longitude}`;
  return [place.name, place.address].filter(Boolean).join(", ");
}

/** Iframe Google Maps tanpa API key (PRD 6.4). */
export function mapEmbedUrl(place: MapPlace, zoom = 16): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(mapQuery(place))}&z=${zoom}&output=embed`;
}

/** Tombol "Buka di Google Maps": link admin kalau ada, kalau tidak pencarian. */
export function mapExternalUrl(place: MapPlace): string {
  if (place.gmapsUrl && /^https?:\/\//i.test(place.gmapsUrl)) return place.gmapsUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery(place))}`;
}
