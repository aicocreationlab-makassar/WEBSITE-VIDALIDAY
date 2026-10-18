"use client";

import { useState } from "react";
import Link from "next/link";
import { useController, useWatch } from "react-hook-form";
import { Field, NativeSelect } from "@/components/admin/kit/field";
import { FormCard } from "@/components/admin/kit/form-card";
import { Input } from "@/components/ui/input";
import { towerSuggestion } from "@/lib/admin/towers";
import type { AdminLocationOption } from "@/lib/data/admin/units";
import { GuestStepper, NoteText, NumberInput, useUnitFormContext } from "./form-bits";
import {
  autoSlug,
  findLocation,
  findRoomType,
  guestsForRoomType,
  guestsNote,
  locationLabel,
  roomTypeOptions,
  settleSlug,
  slugAddress,
  soleActiveRoomType,
  typingSlug,
  type UnitFormMode,
} from "./unit-form-model";

type Props = {
  mode: UnitFormMode;
  locations: AdminLocationOption[];
  /** Slug tersimpan dan status tampil (form ubah), untuk peringatan ganti alamat. */
  savedSlug: string | null;
  savedPublished: boolean;
};

const linkClass = "font-semibold text-brand-700 underline-offset-4 hover:underline";

/**
 * Kartu "Info dasar" (PRD 7.4): apartemen → tipe kamar (bergantung apartemen, kapasitas bawaan ikut terisi),
 * nama, slug otomatis (unit baru: mengikuti nama + apartemen sampai slug diubah manual), tower, lantai, view,
 * luas, kapasitas.
 */
export function InfoSection({ mode, locations, savedSlug, savedPublished }: Props) {
  const {
    control,
    register,
    setValue,
    getValues,
    setFocus,
    formState: { errors, isSubmitted },
  } = useUnitFormContext();
  // Unit baru: slug mengikuti nama. Unit lama: alamat halaman tidak berubah diam-diam saat nama diganti.
  const [slugSynced, setSlugSynced] = useState(mode === "create");
  const [guestsTouched, setGuestsTouched] = useState(false);

  const locationField = useController({ control, name: "locationId" });
  const typeField = useController({ control, name: "roomTypeId" });
  const guestsField = useController({ control, name: "maxGuests" });
  const floorField = useController({ control, name: "floorNumber" });
  const sizeField = useController({ control, name: "sizeSqm" });
  const [name, slug, tower] = useWatch({ control, name: ["name", "slug", "tower"] });

  const location = findLocation(locations, locationField.field.value);
  const type = findRoomType(location, typeField.field.value);
  const typeOptions = roomTypeOptions(location, typeField.field.value);
  const currentAuto = autoSlug(name, location?.slug);
  const set = { shouldDirty: true, shouldValidate: isSubmitted } as const;
  // Saran tower dari unit lain di apartemen ini; isian yang mirip tapi beda ejaan diberi petunjuk.
  const towers = location?.towers ?? [];
  const towerHint = towerSuggestion(tower, towers);
  const towerListId = `tower-list-${location?.id ?? "none"}`;

  function syncSlug(nextName: string, nextLocation: AdminLocationOption | null) {
    if (!slugSynced) return;
    setValue("slug", autoSlug(nextName, nextLocation?.slug), set);
  }

  function applyRoomType(nextTypeId: number, nextLocation: AdminLocationOption | null) {
    setValue("roomTypeId", nextTypeId, set);
    const guests = guestsForRoomType(findRoomType(nextLocation, nextTypeId), getValues("maxGuests"), guestsTouched);
    if (guests !== null) setValue("maxGuests", guests, set);
  }

  const nameField = register("name", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => syncSlug(event.target.value, location),
  });

  const slugField = register("slug", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const typed = typingSlug(event.target.value);
      if (typed !== event.target.value) setValue("slug", typed, set);
      setSlugSynced(false);
    },
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
      const settled = settleSlug(event.target.value, currentAuto);
      if (settled.slug !== event.target.value) setValue("slug", settled.slug, set);
      if (mode === "create") setSlugSynced(settled.synced);
    },
  });

  const slugChanged = mode === "edit" && savedPublished && Boolean(savedSlug) && slug !== savedSlug;
  const typePlaceholder = !location
    ? "Pilih apartemen dulu"
    : typeOptions.length === 0
      ? "Belum ada tipe kamar aktif"
      : "Pilih tipe kamar";

  return (
    <FormCard
      id="info-dasar"
      title="Info dasar"
      description="Apartemen, tipe kamar, nama, dan posisi unit."
      columns={2}
      className="scroll-mt-20"
    >
      <Field label="Apartemen" required error={errors.locationId?.message}>
        <NativeSelect
          name={locationField.field.name}
          value={locationField.field.value ? String(locationField.field.value) : ""}
          onBlur={locationField.field.onBlur}
          onChange={(event) => {
            const nextId = Number(event.target.value) || 0;
            const nextLocation = findLocation(locations, nextId);
            locationField.field.onChange(nextId);
            // Tipe kamar milik apartemen: kosongkan, atau pilih otomatis kalau hanya ada satu tipe aktif.
            applyRoomType(soleActiveRoomType(nextLocation)?.id ?? 0, nextLocation);
            // Apartemen satu gedung tidak punya tower: nilai lama dibuang.
            if (nextLocation && !nextLocation.hasTowers) setValue("tower", "", set);
            syncSlug(getValues("name") ?? "", nextLocation);
          }}
        >
          <option value="" disabled>
            Pilih apartemen
          </option>
          {locations.map((option) => (
            <option key={option.id} value={option.id}>
              {locationLabel(option)}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field
        label="Tipe kamar"
        required
        error={errors.roomTypeId?.message}
        hint={
          location && typeOptions.length === 0 ? (
            <>
              {`${location.name} belum punya tipe kamar aktif. `}
              <Link href={`/admin/locations/${location.id}`} className={linkClass}>
                Tambah tipe kamar
              </Link>
            </>
          ) : (
            <>
              {"Tipe baru ditambah di halaman apartemen. "}
              {location ? (
                <Link href={`/admin/locations/${location.id}`} className={linkClass}>
                  Kelola tipe kamar
                </Link>
              ) : null}
            </>
          )
        }
      >
        <NativeSelect
          name={typeField.field.name}
          value={typeField.field.value ? String(typeField.field.value) : ""}
          onBlur={typeField.field.onBlur}
          disabled={!location || typeOptions.length === 0}
          onChange={(event) => applyRoomType(Number(event.target.value) || 0, location)}
        >
          <option value="" disabled>
            {typePlaceholder}
          </option>
          {typeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field
        label="Nama unit"
        required
        error={errors.name?.message}
        hint="Nama yang dilihat tamu, mis. Studio AT 26X."
        aside={`${(name ?? "").length}/120`}
      >
        <Input {...nameField} maxLength={120} autoComplete="off" placeholder="mis. Studio AT 26X" />
      </Field>

      <Field
        label="Slug"
        required
        error={errors.slug?.message}
        hint={
          <>
            {slugAddress(slug)}
            {slugChanged ? (
              <>
                <br />
                <NoteText
                  note={{
                    tone: "warning",
                    text: "Alamat lama berhenti berfungsi setelah disimpan. Tautan yang sudah dibagikan tidak bisa dibuka lagi.",
                  }}
                />
              </>
            ) : null}
            {mode === "edit" && currentAuto && slug !== currentAuto ? (
              <>
                <br />
                <button
                  type="button"
                  className={`${linkClass} -my-2 inline-flex min-h-11 items-center`}
                  onClick={() => setValue("slug", currentAuto, set)}
                >
                  Samakan dengan nama
                </button>
              </>
            ) : null}
          </>
        }
      >
        <Input
          {...slugField}
          maxLength={80}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="mis. studio-at-26x-vida-view"
        />
      </Field>

      {location && !location.hasTowers ? null : (
        <Field
          label="Tower"
          error={errors.tower?.message}
          hint={
            towerHint ? (
              <span className="flex flex-wrap items-center gap-x-2">
                <span>Ejaan berbeda dari unit lain. Mungkin maksudnya: {towerHint}?</span>
                <button
                  type="button"
                  onClick={() => {
                    setValue("tower", towerHint, set);
                    // Tombol ini hilang setelah dipakai: fokus pindah ke isian, bukan jatuh ke <body>.
                    setFocus("tower");
                  }}
                  className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  Pakai {towerHint}
                </button>
              </span>
            ) : towers.length ? (
              `Tower yang sudah ada: ${towers.join(", ")}.`
            ) : undefined
          }
        >
          <Input {...register("tower")} list={towers.length ? towerListId : undefined} maxLength={40} autoComplete="off" placeholder="mis. Tower A" />
        </Field>
      )}
      {towers.length && !(location && !location.hasTowers) ? (
        <datalist id={towerListId}>
          {towers.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}

      <Field
        label="Lantai"
        error={errors.floorNumber?.message}
        hint={location && !location.hasTowers ? `${location.name} satu gedung, jadi cukup lantainya.` : undefined}
      >
        <NumberInput
          name={floorField.field.name}
          value={floorField.field.value}
          onChange={floorField.field.onChange}
          onBlur={floorField.field.onBlur}
          placeholder="mis. 26"
        />
      </Field>

      <Field label="View" error={errors.viewType?.message} hint="Pemandangan dari unit, mis. Kota atau Laut.">
        <Input {...register("viewType")} maxLength={60} autoComplete="off" placeholder="mis. Kota" />
      </Field>

      <Field label="Luas (m²)" error={errors.sizeSqm?.message} hint="Opsional.">
        <NumberInput
          name={sizeField.field.name}
          value={sizeField.field.value}
          onChange={sizeField.field.onChange}
          onBlur={sizeField.field.onBlur}
          decimal
          suffix="m²"
          placeholder="mis. 24"
        />
      </Field>

      <Field
        label="Kapasitas maks. tamu"
        required
        error={errors.maxGuests?.message}
        hint={<NoteText note={guestsNote(guestsField.field.value, type)} />}
      >
        <GuestStepper
          name={guestsField.field.name}
          value={guestsField.field.value}
          onChange={(next) => {
            setGuestsTouched(true);
            guestsField.field.onChange(next);
          }}
          onBlur={guestsField.field.onBlur}
        />
      </Field>
    </FormCard>
  );
}
