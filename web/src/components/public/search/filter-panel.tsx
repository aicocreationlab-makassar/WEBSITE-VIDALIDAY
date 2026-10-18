"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SewaFilter } from "@/lib/validation/filters";
import type { SearchIndexRow } from "@/types/domain";
import { BudgetControls } from "./budget-controls";
import { ChoiceChips, chipClass } from "./choice-group";
import {
  AMENITY_LIMIT,
  MAX_GUESTS,
  applyTypeOption,
  guestDisplay,
  guestValue,
  lokasiOptions,
  stepGuests,
  toggleAmenity,
  typeOptions,
  visibleFacets,
  withLokasi,
  type SearchLocation,
} from "./filter-model";

/** Chip fasilitas: ikon sudah dirender di server supaya registry ikon tidak ikut ke bundle klien. */
export type AmenityChip = { id: number; name: string; icon: React.ReactNode };

type Props = {
  value: SewaFilter;
  onChange: (next: SewaFilter) => void;
  locations: SearchLocation[];
  amenities: AmenityChip[];
  index: SearchIndexRow[];
  /** sheet = draft di bottom sheet (mobile); sidebar = langsung diterapkan (desktop). */
  variant: "sheet" | "sidebar";
};

/**
 * Isi filter /sewa (PRD 6.3, DESIGN 4.7, UX 2.3): Apartemen, Tipe kamar, Budget per malam,
 * Jumlah tamu, Fasilitas kamar, dan "Tampilkan unit penuh". Sama untuk sheet mobile dan sidebar desktop.
 */
export function FilterPanel({ value, onChange, locations, amenities, index, variant }: Props) {
  const lokasiId = useId();
  const tipeId = useId();
  const budgetId = useId();
  const tamuId = useId();
  const fasilitasId = useId();
  const penuhId = useId();
  const penuhHintId = useId();
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const size = variant;
  // Sidebar: satu pilihan per baris (hitungan di kanan, seperti Budget) supaya chip tidak berpindah baris
  // saat angka hitungan berubah. Sheet HP tetap membungkus.
  const chipLayout = variant === "sidebar" ? "stack" : "wrap";
  const facets = visibleFacets(amenities, value.fasilitas, showAllAmenities);
  const guests = guestValue(value.tamu);

  return (
    <div className="flex flex-col gap-6">
      {locations.length > 1 ? (
        <FilterSection id={lokasiId} title="Apartemen">
          <ChoiceChips
            labelledBy={lokasiId}
            options={lokasiOptions(index, value, locations)}
            onSelect={(slug) => onChange(withLokasi(value, slug, locations))}
            size={size}
            layout={chipLayout}
          />
        </FilterSection>
      ) : null}

      <FilterSection id={tipeId} title="Tipe kamar">
        <ChoiceChips
          labelledBy={tipeId}
          options={typeOptions(index, value, locations)}
          onSelect={(option) => onChange(applyTypeOption(value, option))}
          size={size}
          layout={chipLayout}
        />
      </FilterSection>

      <FilterSection id={budgetId} title="Budget per malam">
        <BudgetControls value={value} onChange={onChange} index={index} variant={variant} labelledBy={budgetId} />
      </FilterSection>

      <FilterSection id={tamuId} title="Jumlah tamu">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">Kapasitas minimal unit</p>
          <div role="group" aria-labelledby={tamuId} className="flex shrink-0 items-center gap-2">
            <StepButton
              label="Kurangi jumlah tamu"
              disabled={guests <= 1}
              onClick={() => onChange({ ...value, tamu: stepGuests(value.tamu, -1), hal: 1 })}
            >
              <Minus className="size-5" aria-hidden="true" />
            </StepButton>
            <span
              aria-live="polite"
              aria-atomic="true"
              className="min-w-11 text-center text-lg font-bold text-ink tabular-nums"
            >
              {guestDisplay(value.tamu)}
              <span className="sr-only"> tamu</span>
            </span>
            <StepButton
              label="Tambah jumlah tamu"
              disabled={guests >= MAX_GUESTS}
              onClick={() => onChange({ ...value, tamu: stepGuests(value.tamu, 1), hal: 1 })}
            >
              <Plus className="size-5" aria-hidden="true" />
            </StepButton>
          </div>
        </div>
      </FilterSection>

      {amenities.length ? (
        <FilterSection id={fasilitasId} title="Fasilitas kamar">
          <div role="group" aria-labelledby={fasilitasId} className="flex flex-wrap gap-2">
            {facets.visible.map((amenity) => {
              const selected = value.fasilitas.includes(amenity.id);
              return (
                <button
                  key={amenity.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(toggleAmenity(value, amenity.id))}
                  className={cn(chipClass(selected, false, size), "max-w-full")}
                >
                  <span
                    className={cn(
                      "flex shrink-0 [&_svg]:size-[18px]",
                      selected ? "text-brand-600" : "text-ink-2",
                    )}
                  >
                    {amenity.icon}
                  </span>
                  <span className="truncate">{amenity.name}</span>
                </button>
              );
            })}
          </div>
          {amenities.length > AMENITY_LIMIT ? (
            <button
              type="button"
              aria-expanded={showAllAmenities}
              onClick={() => setShowAllAmenities(!showAllAmenities)}
              className="mt-2 inline-flex min-h-11 items-center rounded-control px-1 text-sm font-semibold text-brand-700 hover:underline"
            >
              {showAllAmenities ? "Tampilkan lebih sedikit" : `Lihat semua (${amenities.length})`}
            </button>
          ) : null}
        </FilterSection>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Label htmlFor={penuhId} className="min-h-6 text-base leading-6 font-bold text-ink">
            Tampilkan unit penuh
          </Label>
          <p id={penuhHintId} className="text-sm text-muted">
            Unit penuh tampil di urutan paling bawah
          </p>
        </div>
        <Switch
          id={penuhId}
          checked={value.penuh}
          onCheckedChange={(checked) => onChange({ ...value, penuh: checked, hal: 1 })}
          aria-describedby={penuhHintId}
          className="data-unchecked:bg-muted/80"
        />
      </div>
    </div>
  );
}

function FilterSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-base leading-6 font-bold text-ink">
        {title}
      </h3>
      {children}
    </section>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  // aria-disabled (bukan disabled) supaya fokus keyboard tidak hilang saat mencapai batas.
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className="inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-line bg-white text-ink transition-colors duration-150 ease-out hover:border-subtle hover:bg-surface aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-line aria-disabled:hover:bg-white"
    >
      {children}
    </button>
  );
}
