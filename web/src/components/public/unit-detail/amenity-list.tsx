import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { Amenity } from "@/types/domain";
import { ShowAllPanel } from "./show-all-panel";

const INITIAL = 8;

/** Grid fasilitas berikon; dipakai juga landing tipe kamar ("Fasilitas kamar yang umum"). */
export function AmenityGrid({ amenities, className }: { amenities: Amenity[]; className?: string }) {
  return (
    <ul className={cn("grid gap-x-4 gap-y-1", className)}>
      {amenities.map((amenity) => (
        <li key={amenity.id} className="flex min-h-12 min-w-0 items-center gap-3 py-1">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface ring-1 ring-line/70">
            <Icon name={amenity.icon} className="size-5 text-ink-2" />
          </span>
          <span className="min-w-0 text-[15px] leading-5 break-words text-ink">{amenity.name}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Fasilitas kamar (PRD 6.4 no. 6): grid 2 kolom berikon (ikon 20px dari registry lucide),
 * maks. 8, sisanya lewat "Lihat semua (n)" (sheet di mobile, modal di desktop).
 */
export function AmenityList({ amenities }: { amenities: Amenity[] }) {
  const hidden = amenities.length > INITIAL;
  return (
    <>
      <AmenityGrid amenities={amenities.slice(0, INITIAL)} className="grid-cols-2 lg:grid-cols-3" />
      {hidden ? (
        <ShowAllPanel
          label={`Lihat semua (${amenities.length})`}
          title="Fasilitas kamar"
          description={`${amenities.length} fasilitas di unit ini`}
          className="mt-4 w-full sm:w-auto"
        >
          <AmenityGrid amenities={amenities} className="grid-cols-1 sm:grid-cols-2" />
        </ShowAllPanel>
      ) : null}
    </>
  );
}
