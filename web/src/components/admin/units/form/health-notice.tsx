"use client";

import { useWatch } from "react-hook-form";
import { CircleCheck, CircleDashed, ClipboardCheck } from "lucide-react";
import type { HealthFlag } from "@/lib/admin/unit-query";
import type { AdminLocationOption } from "@/lib/data/admin/units";
import { cn } from "@/lib/utils";
import { useUnitFormContext } from "./form-bits";
import { findLocation, findRoomType, formHealthFlags, healthChecklist, NIGHTLY_PERIOD } from "./unit-form-model";

type Props = {
  /** Penanda "Perlu dicek" saat halaman dibuka (sama dengan chip di daftar unit). */
  initialFlags: HealthFlag[];
  locations: AdminLocationOption[];
};

/**
 * Daftar "Perlu dicek" di atas form ubah: tiap butir menaut ke kartunya dan tercentang begitu
 * isiannya sudah beres (berlaku setelah disimpan).
 */
export function HealthNotice({ initialFlags, locations }: Props) {
  const { control } = useUnitFormContext();
  const values = useWatch({ control });
  const location = findLocation(locations, values.locationId);
  const type = findRoomType(location, values.roomTypeId);
  const live = formHealthFlags(
    {
      tower: values.tower,
      floorNumber: values.floorNumber,
      maxGuests: values.maxGuests ?? 0,
      isPromoActive: Boolean(values.isPromoActive),
      promoPrice: values.promoPrice,
      normalPrice: values.normalPrice,
      photos: (values.photos ?? []).filter((photo): photo is string => typeof photo === "string"),
      roomTypeId: values.roomTypeId ?? 0,
    },
    { typeDefaultGuests: type?.defaultMaxGuests ?? null, promoBadge: values.promoBadge ?? null, rentalPeriod: NIGHTLY_PERIOD },
  );
  const items = healthChecklist(initialFlags, live);
  if (!items.length) return null;
  const remaining = items.filter((item) => !item.resolved).length;

  return (
    <section aria-labelledby="perlu-dicek-judul" className="rounded-card border border-amber-200 bg-amber-50 p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-white text-warning ring-1 ring-amber-200">
          <ClipboardCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="perlu-dicek-judul" className="text-base font-bold text-ink">
            Perlu dicek
          </h2>
          <p className="mt-0.5 text-sm text-muted" aria-live="polite">
            {remaining
              ? `${remaining} dari ${items.length} hal belum beres. Ketuk untuk menuju isiannya.`
              : "Semua sudah beres. Simpan perubahan supaya tanda ini hilang dari daftar unit."}
          </p>
          <ul className="mt-3 grid gap-1">
            {items.map((item) => (
              <li key={item.flag}>
                <a
                  href={`#${item.section}`}
                  className={cn(
                    "-mx-2 flex min-h-11 items-center gap-2.5 rounded-control px-2 text-sm transition-colors hover:bg-white/70",
                    item.resolved ? "text-muted" : "font-medium text-ink",
                  )}
                >
                  {item.resolved ? (
                    <CircleCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <CircleDashed className="size-5 shrink-0 text-warning" aria-hidden="true" />
                  )}
                  <span className={cn(item.resolved && "line-through")}>{item.label}</span>
                  <span className="sr-only">{item.resolved ? " (sudah beres)" : " (belum beres)"}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
