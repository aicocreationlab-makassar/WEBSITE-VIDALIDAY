"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, CircleCheck, ExternalLink, Info, MapPinned } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/admin/kit/field";
import { FormCard } from "@/components/admin/kit/form-card";
import { SingleImageUploader } from "@/components/admin/kit/photo-uploader";
import { StickyActionBar } from "@/components/admin/kit/sticky-action-bar";
import { useUnsavedGuard } from "@/components/admin/kit/use-unsaved-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateLocation } from "@/lib/actions/admin/locations";
import { mapEmbedUrl, mapExternalUrl } from "@/lib/gmaps";
import { cn } from "@/lib/utils";
import { locationSchema, type LocationInput } from "@/lib/validation/admin";
import { LocationDeleteCard } from "./location-delete-card";
import {
  GMAPS_MESSAGES,
  LOCATION_NAME_MAX,
  NEW_LOCATION_NOTE,
  SHORT_NAME_MAX,
  fieldMessage,
  gmapsDecision,
  locationVisibility,
  mapPreviewPlace,
  parseNumberInput,
  suggestSlug,
  visibilityNote,
  type AdminLocationDetail,
  type GmapsDecision,
} from "./location-model";
import { SwitchField } from "./switch-field";

type LocationData = z.output<typeof locationSchema>;
type LocationField = keyof LocationInput;

const FIELDS: readonly LocationField[] = [
  "name",
  "shortName",
  "slug",
  "area",
  "address",
  "gmapsUrl",
  "latitude",
  "longitude",
  "tagline",
  "description",
  "heroImage",
  "sortOrder",
  "isActive",
];

const DESCRIPTION_MAX = 2000;

const numberOrNull = { setValueAs: (value: unknown) => parseNumberInput(value) };
const numberOrDefault = {
  setValueAs: (value: unknown) => {
    const n = parseNumberInput(value);
    return n === null ? undefined : n;
  },
};

/** Nilai yang berubah cepat (ketik) → nilai yang tertunda, supaya iframe peta tidak dimuat ulang tiap huruf. */
function useDebounced<T extends string | null>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type Props = {
  detail: AdminLocationDetail;
  /** Kartu "Tipe kamar" (disimpan terpisah), ditampilkan di bawah form. */
  roomTypes: React.ReactNode;
};

/**
 * Form ubah apartemen (PRD 7.5): Info apartemen, Lokasi & peta (koordinat otomatis dari link
 * Google Maps + pratinjau peta), Foto. Bar simpan menempel di bawah; peringatan kalau ada
 * perubahan yang belum disimpan. Kartu tipe kamar dan hapus apartemen di bawah form.
 */
export function LocationForm({ detail, roomTypes }: Props) {
  const [gmapsNote, setGmapsNote] = useState<GmapsDecision["kind"]>("idle");
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    reset,
    resetField,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<LocationInput, unknown, LocationData>({
    resolver: zodResolver(locationSchema),
    defaultValues: detail.values,
  });

  const heroField = useController({ control, name: "heroImage" });
  const activeField = useController({ control, name: "isActive" });
  const [name, shortName, slug, address, gmapsUrl, latitude, longitude, description, isActive] = useWatch({
    control,
    name: ["name", "shortName", "slug", "address", "gmapsUrl", "latitude", "longitude", "description", "isActive"],
  });

  useUnsavedGuard(isDirty && !isSubmitting);

  const place = mapPreviewPlace({ name, address: address ?? null, latitude, longitude });
  const mapUrl = useDebounced(place ? mapEmbedUrl(place) : null, 600);
  const mapLink = place ? mapExternalUrl({ ...place, gmapsUrl: gmapsUrl || null }) : null;

  // Data lama: link tersimpan berisi koordinat tapi latitude/longitude kosong → tawarkan isi sekali ketuk.
  const storedDecision = gmapsNote === "idle" && latitude == null && longitude == null ? gmapsDecision(gmapsUrl) : null;
  const noteKind: GmapsNoteKind =
    gmapsNote !== "idle" ? gmapsNote : storedDecision?.kind === "filled" ? "can-fill" : (storedDecision?.kind ?? "idle");

  function fillCoordinates(decision: GmapsDecision) {
    setGmapsNote(decision.kind);
    if (decision.kind !== "filled") return;
    setValue("latitude", decision.lat, { shouldDirty: true, shouldValidate: true });
    setValue("longitude", decision.lng, { shouldDirty: true, shouldValidate: true });
  }

  const visibility = locationVisibility(Boolean(isActive), detail.publishedUnitCount);
  const activeHint = isActive ? visibilityNote(visibility) : `${visibilityNote(visibility)} ${NEW_LOCATION_NOTE}`;

  const error = (field: LocationField) => {
    const message = errors[field]?.message;
    return message ? fieldMessage(field, message) : undefined;
  };

  const onSubmit = async (values: LocationData) => {
    const submitted = getValues();
    const result = await updateLocation(detail.id, values);
    if (result.ok) {
      toast.success("Perubahan disimpan");
      // Nilai yang baru disimpan menjadi nilai awal (form bersih, peringatan mati).
      reset(submitted);
      return;
    }
    let focused = false;
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if ((FIELDS as readonly string[]).includes(field)) {
        setError(field as LocationField, { message: fieldMessage(field, message) }, { shouldFocus: !focused });
        focused = true;
      }
    }
    toast.error(result.error);
  };

  const gmapsField = register("gmapsUrl", {
    // onChange juga terpanggil saat link ditempel.
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => fillCoordinates(gmapsDecision(event.target.value)),
  });

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting || undefined} className="grid gap-5">
        <FormCard
          id="info-apartemen"
          title="Info apartemen"
          description="Nama dan teks yang tampil di beranda dan halaman apartemen."
          columns={2}
        >
          <Field label="Nama" required error={error("name")}>
            <Input {...register("name")} maxLength={LOCATION_NAME_MAX} autoComplete="off" />
          </Field>

          <Field
            label="Nama singkat"
            required
            error={error("shortName")}
            hint="Label tab di kotak pencarian beranda"
            aside={`${(shortName ?? "").length}/${SHORT_NAME_MAX}`}
          >
            <Input {...register("shortName")} maxLength={SHORT_NAME_MAX} autoComplete="off" />
          </Field>

          <Field
            label="Slug"
            required
            error={error("slug")}
            className="md:col-span-2"
            hint={
              slug && slug !== detail.slug
                ? `Alamat halaman berubah menjadi /apartemen/${slug}. Link lama tidak berlaku lagi.`
                : `Alamat halaman: /apartemen/${slug || "…"}`
            }
          >
            <SlugInput
              {...register("slug")}
              onSuggest={() => setValue("slug", suggestSlug(getValues("name") ?? ""), { shouldDirty: true, shouldValidate: true })}
            />
          </Field>

          <Field label="Area" error={error("area")} hint="Kawasan, mis. Panakkukang. Tampil di kartu apartemen.">
            <Input {...register("area")} maxLength={60} autoComplete="off" placeholder="mis. Panakkukang" />
          </Field>

          <Field label="Tagline" error={error("tagline")} hint="Satu kalimat pendek di bawah nama.">
            <Input {...register("tagline")} maxLength={160} autoComplete="off" />
          </Field>

          <Field
            label="Deskripsi"
            error={error("description")}
            className="md:col-span-2"
            aside={`${(description ?? "").length}/${DESCRIPTION_MAX}`}
          >
            <Textarea {...register("description")} rows={4} maxLength={DESCRIPTION_MAX} />
          </Field>

          <Field label="Urutan" error={error("sortOrder")} hint="Angka kecil tampil lebih dulu di tab beranda.">
            <Input type="number" inputMode="numeric" min={0} max={100_000} step={1} {...register("sortOrder", numberOrDefault)} />
          </Field>

          <SwitchField
            label="Aktif"
            checked={Boolean(activeField.field.value)}
            onCheckedChange={(checked) => activeField.field.onChange(checked)}
            onBlur={activeField.field.onBlur}
            onText="Apartemen aktif"
            offText="Apartemen nonaktif"
            hint={activeHint}
          />
        </FormCard>

        <FormCard
          id="lokasi-peta"
          title="Lokasi & peta"
          description="Tempel link Google Maps; koordinat diambil otomatis kalau ada di link."
          columns={2}
        >
          <Field label="Alamat" error={error("address")} className="md:col-span-2">
            <Textarea {...register("address")} rows={2} maxLength={300} placeholder="mis. Jl. Boulevard No. 1, Makassar" />
          </Field>

          <Field
            label="Link Google Maps"
            error={error("gmapsUrl")}
            className="md:col-span-2"
            hint={<GmapsNote kind={noteKind} onFill={() => fillCoordinates(gmapsDecision(getValues("gmapsUrl")))} />}
          >
            <Input
              {...gmapsField}
              type="url"
              inputMode="url"
              maxLength={500}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://www.google.com/maps/place/…"
            />
          </Field>

          <Field label="Latitude" error={error("latitude")} hint="mis. -5.1477">
            <Input {...register("latitude", numberOrNull)} type="text" autoComplete="off" spellCheck={false} />
          </Field>

          <Field label="Longitude" error={error("longitude")} hint="mis. 119.4327">
            <Input {...register("longitude", numberOrNull)} type="text" autoComplete="off" spellCheck={false} />
          </Field>

          <div className="grid gap-2 md:col-span-2">
            <p className="text-sm leading-5 font-semibold text-ink-2">Pratinjau peta</p>
            {mapUrl ? (
              <>
                <iframe
                  key={mapUrl}
                  src={mapUrl}
                  title={`Peta ${name || "apartemen"}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="aspect-[4/3] w-full rounded-control border border-line bg-surface-2 sm:aspect-[16/7]"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-caption text-muted">
                    {place?.latitude != null ? "Titik dari koordinat." : "Titik dicari dari nama dan alamat. Isi koordinat supaya tepat."}
                  </p>
                  {mapLink ? (
                    <Button asChild variant="link" size="sm">
                      <a href={mapLink} target="_blank" rel="noopener noreferrer">
                        Buka di Google Maps
                        <ExternalLink aria-hidden="true" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-control border border-dashed border-line bg-surface px-4 text-center sm:aspect-[16/7]">
                <MapPinned className="size-8 text-subtle" aria-hidden="true" />
                <p className="max-w-xs text-sm text-muted">Isi alamat atau koordinat untuk melihat pratinjau peta.</p>
              </div>
            )}
          </div>
        </FormCard>

        <FormCard
          id="foto"
          title="Foto"
          description="Foto gedung untuk halaman dan kartu apartemen. Pakai foto horizontal."
        >
          <div className="max-w-xl">
            <SingleImageUploader
              value={heroField.field.value ?? null}
              onChange={(next) => heroField.field.onChange(next)}
              folder="locations"
              aspect="video"
              fallbackLabel={detail.hasFallbackImage ? "Situs memakai foto gedung bawaan" : "Belum ada foto gedung"}
            />
            {error("heroImage") ? (
              <p className="mt-2 flex items-start gap-1.5 text-caption font-medium text-danger">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error("heroImage")}
              </p>
            ) : null}
          </div>
        </FormCard>

        <StickyActionBar status={isDirty ? "Ada perubahan yang belum disimpan" : null}>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {/* Profil publik hanya ada untuk apartemen aktif yang punya unit tampil (PRD 7.5). */}
            {detail.isActive && detail.publishedUnitCount > 0 ? (
              <Button asChild variant="ghost" className="px-3">
                <a href={`/apartemen/${detail.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">Lihat di situs</span>
                </a>
              </Button>
            ) : null}
            <Button asChild variant="secondary">
              <Link href="/admin/locations">Batal</Link>
            </Button>
            <Button type="submit" loading={isSubmitting} className="flex-1 sm:flex-none">
              Simpan perubahan
            </Button>
          </div>
        </StickyActionBar>
      </form>

      {roomTypes}

      <LocationDeleteCard
        locationId={detail.id}
        name={detail.name}
        unitCount={detail.unitCount}
        isActive={detail.isActive}
        onDeactivated={() => resetField("isActive", { defaultValue: false })}
      />
    </>
  );
}

type GmapsNoteKind = GmapsDecision["kind"] | "can-fill";

function GmapsNote({ kind, onFill }: { kind: GmapsNoteKind; onFill: () => void }) {
  if (kind === "idle") return <>Buka lokasi di Google Maps, lalu salin link lengkap dari address bar browser.</>;
  if (kind === "can-fill") {
    return (
      <span className="flex flex-wrap items-center gap-x-2">
        <span>Link ini berisi koordinat, tapi latitude dan longitude masih kosong.</span>
        <button
          type="button"
          onClick={onFill}
          className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
        >
          Isi koordinat dari link
        </button>
      </span>
    );
  }
  const tone =
    kind === "filled" ? { icon: CircleCheck, className: "text-emerald-700" } : kind === "short" ? { icon: CircleAlert, className: "text-[#b45309]" } : { icon: Info, className: "text-ink-2" };
  const IconComponent = tone.icon;
  return (
    <span role="status" className={cn("flex items-start gap-1.5 font-medium", tone.className)}>
      <IconComponent className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{GMAPS_MESSAGES[kind]}</span>
    </span>
  );
}

type SlugInputProps = React.ComponentProps<"input"> & { onSuggest: () => void };

/** Input slug + tombol "Buat dari nama" (Field menyisipkan id/aria ke input). */
function SlugInput({ onSuggest, className, ...props }: SlugInputProps) {
  return (
    <div className="flex gap-2">
      <Input
        {...props}
        maxLength={80}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        className={cn("flex-1", className)}
      />
      <Button type="button" variant="secondary" className="h-12 shrink-0" onClick={onSuggest}>
        Buat dari nama
      </Button>
    </div>
  );
}
