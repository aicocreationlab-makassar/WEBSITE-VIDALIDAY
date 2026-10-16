"use client";

import { useBooking } from "@/components/public/booking/booking-provider";
import { PriceTag } from "@/components/public/unit/price";
import { Button } from "@/components/ui/button";
import type { CatalogUnit } from "@/types/domain";

type Props = {
  unit: Pick<CatalogUnit, "normalPrice" | "promoPrice" | "isPromoActive" | "effectivePrice" | "promoBadge" | "isAvailable">;
};

/**
 * Bar CTA menempel di mobile (PRD 6.4, UX 2.4 G6): tampil sejak awal, putih, shadow-sticky,
 * tinggi 72px + safe area. Kiri harga per malam + harga coret, kanan tombol 52px selebar ≥ 50%.
 * Harga panjang boleh turun baris ("/malam" ke bawah) daripada menabrak tombol.
 */
export function StickyCta({ unit }: Props) {
  const { open, preload } = useBooking();
  return (
    <div
      data-testid="sticky-cta"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-sticky md:hidden"
    >
      <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6">
        <PriceTag
          unit={unit}
          size="bar"
          className="min-w-0 flex-1 [&>p:first-child]:flex-wrap [&>p:first-child]:gap-x-1 [&>p:first-child]:gap-y-0 [&>p:first-child]:whitespace-normal"
        />
        <Button
          type="button"
          size="lg"
          className="shrink-0 basis-[52%] px-4"
          onPointerEnter={preload}
          onFocus={preload}
          onClick={() => open({}, "sticky")}
        >
          {unit.isAvailable ? "Sewa sekarang" : "Tanya ketersediaan"}
        </Button>
      </div>
    </div>
  );
}
