"use client";

import Image from "next/image";
import { Building2, TriangleAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HEALTH_LABELS } from "@/lib/admin/data-health";
import type { AdminUnitRow, HealthFlag } from "@/lib/admin/unit-query";
import { cn } from "@/lib/utils";

/** URL Storage Supabase (ada di images.remotePatterns); URL lama dari host lain ditampilkan tanpa optimasi. */
function isStorageUrl(url: string): boolean {
  return /\/storage\/v1\/object\/public\/media\//.test(url);
}

/** Foto sampul kecil (56px tabel, 72px kartu) atau ikon gedung kalau belum ada foto asli. */
export function UnitThumb({ row, size }: { row: Pick<AdminUnitRow, "coverUrl">; size: 56 | 72 }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-2 ring-1 ring-line",
        size === 56 ? "size-14" : "size-[72px]",
      )}
    >
      {row.coverUrl ? (
        <Image
          src={row.coverUrl}
          alt=""
          fill
          sizes={`${size}px`}
          unoptimized={!isStorageUrl(row.coverUrl)}
          className="object-cover"
        />
      ) : (
        <Building2 className={cn("text-subtle", size === 56 ? "size-6" : "size-7")} strokeWidth={1.5} aria-hidden="true" />
      )}
    </span>
  );
}

export function healthText(flags: HealthFlag[]): string {
  return flags.map((flag) => HEALTH_LABELS[flag]).join(", ");
}

/** Penanda "Perlu dicek" di tabel: ikon segitiga amber + tooltip daftar catatan. */
export function HealthTooltip({ flags }: { flags: HealthFlag[] }) {
  if (!flags.length) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Perlu dicek: ${healthText(flags)}`}
          className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full text-warning transition-colors after:absolute after:-inset-1.5 hover:bg-amber-50 focus-visible:ring-3 focus-visible:ring-brand-500/20"
        >
          <TriangleAlert className="size-4" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex-col items-start gap-1 py-2 text-left">
        <span className="font-semibold">Perlu dicek</span>
        <ul className="grid gap-0.5">
          {flags.map((flag) => (
            <li key={flag}>{HEALTH_LABELS[flag]}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

/** Penanda "Perlu dicek" di kartu HP: teks langsung terlihat (tooltip tidak jalan di layar sentuh). */
export function HealthNote({ flags, className }: { flags: HealthFlag[]; className?: string }) {
  if (!flags.length) return null;
  return (
    <p className={cn("flex items-start gap-1.5 text-caption font-medium text-[#b45309]", className)}>
      <TriangleAlert className="mt-px size-4 shrink-0 text-warning" aria-hidden="true" />
      <span>Perlu dicek: {healthText(flags)}</span>
    </p>
  );
}
