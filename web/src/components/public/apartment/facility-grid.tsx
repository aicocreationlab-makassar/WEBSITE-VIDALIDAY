import Image from "next/image";
import { Icon } from "@/lib/icons";
import { isStockPhoto } from "@/lib/media";
import type { Facility } from "@/types/domain";

type Props = {
  facilities: Facility[];
  apartmentName: string;
};

/**
 * Fasilitas gedung (PRD 6.7): grid foto 4:3 atau tile ikon, nama dengan ikon garis, dan keterangan
 * dua baris. 2 kolom di mobile, 3 di md, 4 di lg. Foto stok dianggap tidak ada (DESIGN 7).
 */
export function FacilityGrid({ facilities, apartmentName }: Props) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {facilities.map((facility) => {
        const photo = facility.imageUrl && !isStockPhoto(facility.imageUrl) ? facility.imageUrl : null;
        return (
          <li
            key={facility.id}
            className="flex flex-col overflow-hidden rounded-card bg-white shadow-card ring-1 ring-line/80"
          >
            <div className="relative aspect-[4/3] bg-surface-2">
              {photo ? (
                <Image
                  src={photo}
                  alt={`Fasilitas ${facility.name} di ${apartmentName}`}
                  fill
                  sizes="(max-width: 767px) 46vw, (max-width: 1023px) 31vw, 270px"
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-white ring-1 ring-line md:size-16">
                    <Icon name={facility.icon} fallback="sparkles" className="size-7 text-ink-2 md:size-8" />
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-0.5 p-3 md:p-4">
              <h3 className="flex min-w-0 items-start gap-2 text-[15px] leading-[22px] font-bold text-ink">
                <Icon name={facility.icon} fallback="sparkles" className="mt-0.5 size-[18px] shrink-0 text-ink-2" />
                <span className="min-w-0 break-words">{facility.name}</span>
              </h3>
              {facility.description ? (
                <p className="line-clamp-2 text-sm text-muted">{facility.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
