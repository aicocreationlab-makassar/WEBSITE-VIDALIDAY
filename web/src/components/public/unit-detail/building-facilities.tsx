import Image from "next/image";
import { CardRail } from "@/components/public/shared/card-rail";
import { Icon } from "@/lib/icons";
import { isStockPhoto } from "@/lib/media";
import type { Facility } from "@/types/domain";

/**
 * Fasilitas gedung (PRD 6.4 no. 10): rel kartu kecil (foto 4:3 atau tile ikon, nama, satu baris
 * keterangan) untuk apartemen unit ini. Foto stok dianggap tidak ada (DESIGN 7).
 */
export function BuildingFacilities({ facilities, apartmentName }: { facilities: Facility[]; apartmentName: string }) {
  return (
    <CardRail label="Fasilitas gedung" focusableTrack itemClassName="w-[64%] max-w-[260px] sm:w-[38%] lg:w-[calc((100%-3rem)/4)] lg:max-w-none">
      {facilities.map((facility) => {
        const photo = facility.imageUrl && !isStockPhoto(facility.imageUrl) ? facility.imageUrl : null;
        return (
          <article
            key={facility.id}
            className="flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card ring-1 ring-line/80"
          >
            <div className="relative aspect-[4/3] bg-surface-2">
              {photo ? (
                <Image
                  src={photo}
                  alt={`Fasilitas ${facility.name} di ${apartmentName}`}
                  fill
                  sizes="(max-width: 639px) 64vw, (max-width: 1023px) 38vw, 270px"
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-white ring-1 ring-line">
                    <Icon name={facility.icon} fallback="sparkles" className="size-8 text-ink-2" />
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-0.5 p-3.5">
              <h3 className="flex min-w-0 items-center gap-2 text-[15px] leading-6 font-bold text-ink">
                <Icon name={facility.icon} fallback="sparkles" className="size-4 shrink-0 text-ink-2" />
                <span className="truncate">{facility.name}</span>
              </h3>
              {facility.description ? (
                <p className="line-clamp-1 text-sm text-muted">{facility.description}</p>
              ) : null}
            </div>
          </article>
        );
      })}
    </CardRail>
  );
}
