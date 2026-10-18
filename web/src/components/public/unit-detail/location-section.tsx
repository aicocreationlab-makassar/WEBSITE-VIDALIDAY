import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mapEmbedUrl, mapExternalUrl } from "@/lib/gmaps";
import { Icon } from "@/lib/icons";
import type { Landmark, UnitLocation } from "@/types/domain";
import { DetailSection } from "./detail-section";
import { ExpandableList } from "./expandable-list";

const LANDMARKS_SHOWN = 5;

/**
 * Lokasi (PRD 6.4 no. 9, DESIGN 4.10): peta Google Maps tanpa API key (iframe lazy, 240px mobile,
 * 320px desktop) memakai koordinat apartemen atau "nama + alamat", alamat, tombol "Buka di Google Maps",
 * lalu 5 landmark terdekat + "Lihat semua".
 */
export function LocationSection({ location, landmarks }: { location: UnitLocation; landmarks: Landmark[] }) {
  const place = {
    name: location.name,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    gmapsUrl: location.gmapsUrl,
  };

  return (
    // scroll-mt kecil: html sudah punya scroll-padding-top setinggi header (60/72px).
    <DetailSection id="lokasi" headingId="lokasi-judul" title="Lokasi" className="scroll-mt-5">
      <div className="overflow-hidden rounded-card border border-line bg-surface-2">
        <iframe
          src={mapEmbedUrl(place)}
          title={`Peta lokasi ${location.shortName}`}
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
            {location.address ? <span className="block">{location.address}</span> : null}
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

      {landmarks.length ? (
        <div className="mt-6">
          <h3 className="text-base font-bold text-ink">Tempat terdekat</h3>
          <ExpandableList
            initial={LANDMARKS_SHOWN}
            label={`Tempat terdekat dari ${location.shortName}`}
            className="mt-2 flex flex-col"
            itemClassName="border-b border-line last:border-b-0"
          >
            {landmarks.map((landmark) => (
              <div key={landmark.id} className="flex items-start gap-3 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-line/70">
                  <Icon name={landmark.icon} fallback="map-pin" className="size-5 text-ink-2" />
                </span>
                <div className="min-w-0 flex-1">
                  {/* Waktu tempuh tetap di kanan baris pertama; nama panjang membungkus di kolomnya sendiri. */}
                  <div className="flex items-baseline gap-3">
                    <p className="min-w-0 flex-1 text-[15px] leading-6 font-semibold text-ink">{landmark.name}</p>
                    <p className="shrink-0 text-right text-sm font-medium whitespace-nowrap text-ink-2 tabular-nums">
                      {landmark.distanceTime}
                    </p>
                  </div>
                  {landmark.notes ? <p className="mt-0.5 text-sm text-muted">{landmark.notes}</p> : null}
                </div>
              </div>
            ))}
          </ExpandableList>
        </div>
      ) : null}
    </DetailSection>
  );
}
