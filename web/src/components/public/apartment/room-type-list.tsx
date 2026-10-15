import Image from "next/image";
import Link from "next/link";
import { BedDouble, ChevronRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/format";
import type { RoomTypeCardData } from "./apartment-model";

type Props = {
  types: RoomTypeCardData[];
  apartmentName: string;
};

/**
 * Kartu "Tipe kamar" (PRD 6.7): foto unit wakil, nama, kapasitas, harga mulai, jumlah unit tersedia.
 * Seluruh kartu menuju /sewa?lokasi=...&tipe=.... Mobile: baris horizontal (foto 96px kiri) supaya
 * semua tipe terbaca tanpa banyak menggulir; md ke atas: grid kartu dengan foto 4:3 di atas.
 */
export function RoomTypeList({ types, apartmentName }: Props) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
      {types.map((type) => {
        const full = type.availableCount === 0;
        return (
          <li key={type.id}>
            <Link
              href={type.href}
              className="group flex h-full gap-3.5 rounded-card bg-white p-3 shadow-card ring-1 ring-line/80 transition-[box-shadow,transform] duration-200 ease-out outline-none focus-visible:ring-3 focus-visible:ring-brand-500/40 md:flex-col md:gap-0 md:overflow-hidden md:p-0 md:hover:-translate-y-0.5 md:hover:shadow-card-hover"
            >
              <div className="relative min-h-24 w-24 shrink-0 self-stretch overflow-hidden rounded-control bg-surface-2 md:aspect-[4/3] md:min-h-0 md:w-full md:rounded-none">
                {type.photo ? (
                  <Image
                    src={type.photo}
                    alt={`Unit tipe ${type.name} di ${apartmentName}`}
                    fill
                    sizes="(max-width: 767px) 96px, (max-width: 1023px) 46vw, 370px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <BedDouble className="size-8 text-subtle md:size-10" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col md:p-4">
                <h3 className="text-card font-bold text-ink">{type.name}</h3>
                {type.capacity ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
                    <Users className="size-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
                    Kapasitas sampai {type.capacity} tamu
                  </p>
                ) : null}
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-2">
                  {full ? (
                    <Badge variant="neutral">Penuh</Badge>
                  ) : (
                    <>
                      <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
                      {type.availableCount} unit tersedia
                    </>
                  )}
                </p>

                <div className="mt-auto flex items-end justify-between gap-2 pt-2.5 md:pt-4">
                  {type.minPrice !== null ? (
                    <p className="min-w-0 whitespace-nowrap">
                      <span className="block text-caption font-medium text-muted">Mulai </span>
                      <span className="text-price font-extrabold tracking-tight text-ink tabular-nums">
                        {formatRupiah(type.minPrice)}
                      </span>
                      <span className="text-sm font-medium text-muted">/malam</span>
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-ink-2">Belum tersedia</p>
                  )}
                  <span className="hidden items-center gap-1 text-sm font-semibold whitespace-nowrap text-brand-700 md:inline-flex">
                    Lihat unit
                    <ChevronRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                  <ChevronRight className="size-5 shrink-0 self-center text-subtle md:hidden" aria-hidden="true" />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
