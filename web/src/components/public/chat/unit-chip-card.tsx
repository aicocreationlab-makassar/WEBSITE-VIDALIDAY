"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { track } from "@/lib/analytics";
import type { ChatUnit, KnowledgeIndex } from "@/lib/chat/types";
import { formatRupiah } from "@/lib/format";
import { formatUnitPlace, unitHref } from "@/lib/unit-display";

type Props = { unit: ChatUnit; idx: KnowledgeIndex; position: number; onNavigate?: () => void };

/** Kartu ringkas unit di dalam chat (pola "Terakhir kamu lihat"): foto 64px, nama, tempat, harga, status. */
export function UnitChipCard({ unit, idx, position, onNavigate }: Props) {
  const location = idx.locationBySlug.get(unit.l);
  const place = formatUnitPlace({
    locationShortName: location?.shortName ?? unit.l,
    locationArea: location?.area ?? null,
    tower: unit.tower,
    floorNumber: unit.floor,
  });
  return (
    <Link
      href={unitHref(unit.slug)}
      onClick={() => {
        track("chat_unit_click", { unit: unit.slug, position });
        onNavigate?.();
      }}
      className="flex items-center gap-3 rounded-card bg-white p-2.5 shadow-card ring-1 ring-line/80 transition-colors hover:ring-brand-200"
    >
      <span className="relative size-16 shrink-0 overflow-hidden rounded-control bg-surface-2">
        {unit.photo ? (
          <Image src={unit.photo} alt="" fill sizes="64px" className="object-cover object-[50%_55%]" />
        ) : (
          <Building2 className="m-auto size-6 h-full text-subtle" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-ink">{unit.name}</span>
        <span className="block truncate text-caption text-muted">{place}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-extrabold text-ink tabular-nums">
            {formatRupiah(unit.p)}
            <span className="font-medium text-muted"> /malam</span>
          </span>
          {unit.promo ? <span className="text-caption text-muted line-through tabular-nums">{formatRupiah(unit.np)}</span> : null}
        </span>
      </span>
      <Badge variant={unit.av ? "success" : "full"} className="shrink-0">
        {unit.av ? "Tersedia" : "Penuh"}
      </Badge>
    </Link>
  );
}
