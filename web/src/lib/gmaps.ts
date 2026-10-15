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
 * Pola yang dikenali: "!3d<lat>!4d<lng>" (pin persis), "@<lat>,<lng>" (pusat peta),
 * "q=<lat>,<lng>" / "query=" / "ll=" / "center=". Link pendek (maps.app.goo.gl) tidak bisa dibaca → null.
 */
export function parseGmapsCoordinates(url: string | null | undefined): LatLng | null {
  if (!url) return null;
  let text = url.trim();
  try {
    text = decodeURIComponent(text);
  } catch {
    // biarkan apa adanya
  }
  const patterns = [
    new RegExp(`!3d${NUM}!4d${NUM}`),
    new RegExp(`@${NUM},${NUM}`),
    new RegExp(`[?&](?:q|query|ll|center|destination)=${NUM}\\s*,\\s*${NUM}`),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const point = valid(Number(match[1]), Number(match[2]));
      if (point) return point;
    }
  }
  return null;
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
