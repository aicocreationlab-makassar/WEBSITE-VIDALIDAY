import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mapEmbedUrl, mapExternalUrl } from "@/lib/gmaps";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { Landmark, LocationWithTypes } from "@/types/domain";

type Props = {
  location: Pick<LocationWithTypes, "name" | "shortName" | "address" | "area" | "latitude" | "longitude" | "gmapsUrl">;
  /** Semua landmark aktif apartemen ini, urut sort_order. */
  landmarks: Landmark[];
};

/**
 * Lokasi (PRD 6.7, DESIGN 4.10): peta Google Maps tanpa API key (iframe lazy, 240px mobile /
 * 320px desktop), alamat, tombol "Buka di Google Maps", lalu SELURUH landmark aktif.
 * Desktop: peta kiri, daftar landmark kanan. Judul section dirender oleh pemanggil.
 */
export function ApartmentLocation({ location, landmarks }: Props) {
  const place = {
    name: location.name,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    gmapsUrl: location.gmapsUrl,
  };

  return (
    <div className={cn("grid gap-8 md:gap-10", landmarks.length > 0 && "md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]")}>
      <div className="min-w-0">
        <div className="overflow-hidden rounded-card border border-line bg-surface-2">
          <iframe
            src={mapEmbedUrl(place)}
            title={`Peta lokasi ${location.name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="block h-60 w-full border-0 md:h-80"
          />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="flex min-w-0 items-start gap-2 text-[15px] leading-6 text-ink-2">
            <MapPin className="mt-0.5 size-5 shrink-0 text-brand-600" strokeWidth={1.75} aria-hidden="true" />
            <span>
              <span className="font-semibold text-ink">{location.name}</span>
              <span className="block">{location.address || (location.area ? `${location.area}, Makassar` : "Makassar")}</span>
            </span>
          </p>
          <Button asChild variant="secondary" className="w-full shrink-0 sm:w-auto">
            <a href={mapExternalUrl(place)} target="_blank" rel="noopener noreferrer">
              <Navigation aria-hidden="true" />
              Buka di Google Maps
              <span className="sr-only"> (tab baru)</span>
            </a>
          </Button>
        </div>
      </div>

      {landmarks.length ? (
        <div className="min-w-0">
          <h3 id="tempat-terdekat-judul" className="text-lg font-bold text-ink">
            Tempat terdekat
          </h3>
          <ul aria-labelledby="tempat-terdekat-judul" className="mt-2 flex flex-col">
            {landmarks.map((landmark) => (
              <li key={landmark.id} className="flex items-start gap-3 border-b border-line py-3 last:border-b-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-line/70">
                  <Icon name={landmark.icon} fallback="map-pin" className="size-5 text-ink-2" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-[15px] leading-6 font-semibold text-ink">{landmark.name}</p>
                    <p className="text-sm font-medium whitespace-nowrap text-ink-2 tabular-nums">{landmark.distanceTime}</p>
                  </div>
                  {landmark.notes ? <p className="mt-0.5 text-sm text-muted">{landmark.notes}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
