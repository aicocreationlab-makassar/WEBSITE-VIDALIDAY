"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { ArrowDown, ArrowUp, BedDouble, Building2, CircleAlert, CircleCheck, EyeOff, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/kit/form-card";
import { EmptyState } from "@/components/public/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { reorderLocation } from "@/lib/actions/admin/locations";
import { adminUnitParams } from "@/lib/admin/unit-query";
import { cn } from "@/lib/utils";
import {
  applySortUpdates,
  locationVisibility,
  planReorder,
  roomTypeCountLabel,
  unitCountLabel,
  visibilityNote,
  type AdminLocationCard,
  type LocationVisibility,
  type SortItem,
} from "./location-model";
import { AddLocationButton } from "./new-location-dialog";

type Direction = "up" | "down";

/**
 * Daftar apartemen (PRD 7.5): kartu per apartemen termasuk yang nonaktif, jumlah unit,
 * status, dan urutan naik/turun (= urutan tab di beranda). Tambah apartemen lewat dialog.
 */
export function LocationsList({ locations }: { locations: AdminLocationCard[] }) {
  const [items, applyOrder] = useOptimistic(locations, (state: AdminLocationCard[], updates: SortItem[]) =>
    applySortUpdates(state, updates),
  );
  const [moving, startMove] = useTransition();
  // Tombol urutan yang terakhir dipakai: setelah selesai, fokus keyboard dikembalikan ke kartu yang dipindah.
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    const key = pendingFocus.current;
    if (!key || moving) return;
    pendingFocus.current = null;
    const [id, direction] = key.split(":");
    const button = document.querySelector<HTMLButtonElement>(`[data-reorder="${id}:${direction}"]`);
    const other = document.querySelector<HTMLButtonElement>(`[data-reorder="${id}:${direction === "up" ? "down" : "up"}"]`);
    (button && !button.disabled ? button : other)?.focus();
  }, [items, moving]);

  function move(card: AdminLocationCard, direction: Direction) {
    const plan = planReorder(items, card.id, direction);
    if (!plan) return;
    pendingFocus.current = `${card.id}:${direction}`;
    startMove(async () => {
      applyOrder(plan);
      const result = await reorderLocation({ id: card.id, direction });
      if (result.ok) toast.success(result.message ?? "Urutan disimpan");
      else toast.error(result.error);
    });
  }

  return (
    <>
      <AdminPageHeader
        description="Apartemen tampil di beranda, menu, dan pencarian setelah aktif dan punya minimal satu unit yang tampil. Urutan di sini sama dengan urutan tab di beranda."
        actions={locations.length > 0 ? <AddLocationButton /> : undefined}
      />

      {items.length === 0 ? (
        <div className="glass-card rounded-card">
          <EmptyState
            icon={Building2}
            title="Belum ada apartemen"
            description="Tambah apartemen pertama, lalu isi tipe kamar dan unitnya."
            action={<AddLocationButton />}
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy={moving || undefined}>
          {items.map((card, index) => (
            <LocationCardItem
              key={card.id}
              card={card}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              disabled={moving}
              onMove={(direction) => move(card, direction)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

const VISIBILITY_STYLE: Record<LocationVisibility, { icon: typeof CircleCheck; className: string }> = {
  tampil: { icon: CircleCheck, className: "text-emerald-700" },
  "tanpa-unit": { icon: CircleAlert, className: "text-[#b45309]" },
  nonaktif: { icon: EyeOff, className: "text-muted" },
};

type CardProps = {
  card: AdminLocationCard;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  onMove: (direction: Direction) => void;
};

function LocationCardItem({ card, isFirst, isLast, disabled, onMove }: CardProps) {
  const href = `/admin/locations/${card.id}`;
  const visibility = locationVisibility(card.isActive, card.publishedUnitCount);
  const { icon: VisibilityIcon, className: visibilityClass } = VISIBILITY_STYLE[visibility];
  const unitsHref = `/admin/units?${adminUnitParams({ lokasi: card.id }).toString()}`;

  return (
    <li className="glass-card flex flex-col overflow-hidden rounded-card">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/9] bg-surface-2">
        {card.imageUrl ? (
          <Image
            src={card.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1280px) 45vw, 360px"
            className={cn("object-cover", !card.isActive && "grayscale-[60%]")}
          />
        ) : (
          <span className="flex size-full items-center justify-center">
            <Building2 className="size-12 text-subtle" strokeWidth={1.5} />
          </span>
        )}
        <span className="absolute top-3 left-3">
          {card.isActive ? <Badge variant="success">Aktif</Badge> : <Badge variant="neutral">Nonaktif</Badge>}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h2 className="text-card font-bold text-ink">
            <Link href={href} className="underline-offset-2 hover:underline">
              {card.name}
            </Link>
          </h2>
          <p className="truncate text-sm text-muted">
            Tab: {card.shortName}
            {card.area ? ` · ${card.area}` : ""}
          </p>
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-4 text-subtle" aria-hidden="true" />
            {unitCountLabel(card.unitCount)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="size-4 text-subtle" aria-hidden="true" />
            {roomTypeCountLabel(card.roomTypeCount)}
          </span>
        </p>

        <p className={cn("flex items-start gap-1.5 text-caption font-medium", visibilityClass)}>
          <VisibilityIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {visibilityNote(visibility)}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex items-center gap-1">
            <Button
              variant="quiet"
              size="icon"
              data-reorder={`${card.id}:up`}
              aria-label={`Naikkan urutan ${card.name}`}
              disabled={isFirst || disabled}
              onClick={() => onMove("up")}
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              variant="quiet"
              size="icon"
              data-reorder={`${card.id}:down`}
              aria-label={`Turunkan urutan ${card.name}`}
              disabled={isLast || disabled}
              onClick={() => onMove("down")}
            >
              <ArrowDown aria-hidden="true" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {card.unitCount > 0 ? (
              <Button asChild variant="ghost" className="px-3">
                <Link href={unitsHref}>Lihat unit</Link>
              </Button>
            ) : null}
            <Button asChild variant="secondary">
              <Link href={href} aria-label={`Ubah ${card.name}`}>
                <Pencil aria-hidden="true" />
                Ubah
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
