"use client";

import Link from "next/link";
import { useController } from "react-hook-form";
import { Check, CircleAlert, Settings2 } from "lucide-react";
import { FormCard } from "@/components/admin/kit/form-card";
import type { AdminAmenityOption } from "@/lib/data/admin/units";
import { Icon, resolveAmenityIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useUnitFormContext } from "./form-bits";
import { amenityChoices, toggleId } from "./unit-form-model";

type Props = {
  amenities: AdminAmenityOption[];
  /** Pilihan saat form dibuka: fasilitas nonaktif tetap tampil kalau sudah dipilih. */
  initialIds: readonly number[];
};

/** Kartu "Fasilitas kamar" (PRD 7.4): chip multi-pilih berikon dari tabel amenities + tautan "Kelola fasilitas". */
export function AmenitiesSection({ amenities, initialIds }: Props) {
  const { control } = useUnitFormContext();
  const { field, fieldState } = useController({ control, name: "amenityIds" });
  const selected = field.value ?? [];
  const choices = amenityChoices(amenities, initialIds, selected);
  const error = fieldState.error?.message;

  return (
    <FormCard
      id="fasilitas"
      title="Fasilitas kamar"
      description={selected.length ? `${selected.length} fasilitas dipilih.` : "Ketuk fasilitas yang ada di unit ini."}
      className="scroll-mt-20"
      action={
        <Link
          href="/admin/amenities"
          className="-my-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          <Settings2 className="size-4" aria-hidden="true" />
          Kelola fasilitas
        </Link>
      }
    >
      {choices.length ? (
        <div
          role="group"
          aria-labelledby="fasilitas-judul"
          aria-describedby={error ? "fasilitas-error" : undefined}
          data-invalid={error ? "true" : undefined}
          tabIndex={-1}
          className="flex flex-wrap gap-2"
        >
          {choices.map((amenity) => {
            const active = selected.includes(amenity.id);
            return (
              <button
                key={amenity.id}
                type="button"
                aria-pressed={active}
                onClick={() => field.onChange(toggleId(selected, amenity.id))}
                onBlur={field.onBlur}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-3.5 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-brand-500/20",
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-line bg-white text-ink-2 hover:bg-surface-2",
                )}
              >
                <Icon
                  name={resolveAmenityIcon(amenity.name, amenity.icon)}
                  className={cn("size-[18px]", active ? "text-brand-600" : "text-muted")}
                />
                <span>{amenity.name}</span>
                {!amenity.isActive ? <span className="text-caption text-muted">(nonaktif)</span> : null}
                {active ? <Check className="size-4 text-brand-600" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-control bg-surface px-3.5 py-3 text-sm text-ink-2">
          Belum ada fasilitas kamar.{" "}
          <Link href="/admin/amenities" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
            Tambah fasilitas
          </Link>
        </p>
      )}
      {error ? (
        <p id="fasilitas-error" className="flex items-start gap-1.5 text-caption font-medium text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </FormCard>
  );
}
