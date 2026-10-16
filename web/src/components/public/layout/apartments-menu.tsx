"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavLocation } from "@/lib/data/chrome";
import { cn } from "@/lib/utils";
import { ApartmentsTriggerContent } from "./apartments-trigger";

type Props = {
  locations: NavLocation[];
  triggerClassName?: string;
  /** Tombol pengganti sudah ditekan sebelum modul ini termuat: langsung buka. */
  defaultOpen: boolean;
  /** Tombol pengganti sedang difokus saat diganti: pindahkan fokus ke tombol ini. */
  autoFocus: boolean;
};

/** Menu "Apartemen" di header desktop (Radix DropdownMenu), dimuat dinamis oleh ApartmentsDropdown. */
export function ApartmentsMenu({ locations, triggerClassName, defaultOpen, autoFocus }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (autoFocus) triggerRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  return (
    <DropdownMenu modal={false} defaultOpen={defaultOpen}>
      <DropdownMenuTrigger asChild>
        <button ref={triggerRef} type="button" className={cn("group", triggerClassName)}>
          <ApartmentsTriggerContent />
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
