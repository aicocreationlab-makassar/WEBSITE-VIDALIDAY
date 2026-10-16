"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Building2, History } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { clearRecent, getRecentServerSnapshot, getRecentSnapshot, subscribeRecent } from "@/lib/recent";
import { unitHref } from "@/lib/unit-display";
import { cn } from "@/lib/utils";

/** Harga terkini per unit dari katalog (unit yang tidak ada di sini sudah dihapus/disembunyikan). */
export type CurrentPrices = { id: number; p: number }[];

type Props = {
  /** Unit yang sedang dilihat (tidak ditampilkan). */
  excludeId?: number;
  /** Kalau diisi: entri yang tidak ada di katalog dibuang dan harga memakai nilai terbaru. */
  current?: CurrentPrices;
  max?: number;
  className?: string;
};

/**
 * "Terakhir kamu lihat" (PRD 6.6). Hanya tampil kalau ada riwayat di perangkat ini.
 * Baris ringkas (thumbnail 64px, nama, harga) + "Hapus riwayat". Data tidak pernah dikirim ke server.
 */
export function RecentlyViewed({ excludeId, current, max = 6, className }: Props) {
  const recent = useSyncExternalStore(subscribeRecent, getRecentSnapshot, getRecentServerSnapshot);
  const prices = current ? new Map(current.map((row) => [row.id, row.p])) : null;
  const items = recent
    .filter((r) => r.id !== excludeId && (!prices || prices.has(r.id)))
    .map((r) => ({ ...r, p: prices?.get(r.id) ?? r.p }))
    .slice(0, max);
  if (!items.length) return null;

  return (
    <section aria-labelledby="riwayat-judul" className={cn("py-10 md:py-[72px]", className)}>
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="riwayat-judul" className="flex items-center gap-2 text-h2 font-bold text-ink md:text-h2-lg">
            <History className="size-6 text-brand-600" aria-hidden="true" />
            Terakhir kamu lihat
          </h2>
          <button
            type="button"
            onClick={clearRecent}
            className="min-h-11 shrink-0 rounded-control px-2 text-sm font-semibold text-brand-700 hover:underline"
          >
            Hapus riwayat
          </button>
        </div>
        <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0">
          {items.map((item) => (
            <li key={item.id} className="w-[78%] max-w-[320px] shrink-0 snap-start lg:w-auto lg:max-w-none">
              <Link
                href={unitHref(item.slug)}
                className="flex items-center gap-3 rounded-card bg-white p-2.5 shadow-card ring-1 ring-line/80 transition-colors hover:ring-brand-200"
              >
                <span className="relative size-16 shrink-0 overflow-hidden rounded-control bg-surface-2">
                  {item.photo ? (
                    <Image src={item.photo} alt="" fill sizes="64px" className="object-cover object-[50%_55%]" />
                  ) : (
                    <Building2 className="m-auto size-6 h-full text-subtle" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold text-ink">{item.name}</span>
                  <span className="block truncate text-caption text-muted">{item.place}</span>
                  <span className="block text-sm font-extrabold text-ink tabular-nums">
                    {formatRupiah(item.p)}
                    <span className="font-medium text-muted"> /malam</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
