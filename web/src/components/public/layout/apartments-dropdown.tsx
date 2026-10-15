"use client";

import Link from "next/link";
import { Building2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavLocation } from "@/lib/data/chrome";
import { cn } from "@/lib/utils";

/** Menu "Apartemen" di header desktop: satu baris per apartemen aktif. */
export function ApartmentsDropdown({
  locations,
  triggerClassName,
}: {
  locations: NavLocation[];
  /** Kelas tautan nav header, supaya pemicu sejajar dengan tautan lain. */
  triggerClassName?: string;
}) {
  if (locations.length === 0) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn("group", triggerClassName)}>
          Apartemen
          <ChevronDown
            className="size-4 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-auto max-w-80 min-w-60 rounded-card p-1.5 shadow-raised ring-line"
      >
        {locations.map((location) => (
          <DropdownMenuItem key={location.slug} asChild>
            <Link
              href={`/apartemen/${location.slug}`}
              className="min-h-11 cursor-pointer gap-3 rounded-control px-3 py-2 text-[15px] font-semibold text-ink focus:bg-surface-2"
            >
              <Building2 className="size-5 text-muted" aria-hidden="true" />
              <span className="min-w-0 truncate">{location.name}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
