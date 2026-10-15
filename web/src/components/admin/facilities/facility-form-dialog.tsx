"use client";

import { useEffect, useRef, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Field, NativeSelect } from "@/components/admin/kit/field";
import { IconPicker } from "@/components/admin/kit/icon-picker";
import { SingleImageUploader } from "@/components/admin/kit/photo-uploader";
import { ResponsiveDialog } from "@/components/admin/locations/responsive-dialog";
import { SwitchField } from "@/components/admin/locations/switch-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createFacility, discardFacilityUploads, updateFacility } from "@/lib/actions/admin/facilities";
import { ICON_CHOICES, isKnownIconName, resolveFacilityIcon, resolveIconName } from "@/lib/icons";
import { facilitySchema } from "@/lib/validation/admin";
import {
  FACILITY_DESCRIPTION_MAX,
  FACILITY_NAME_MAX,
  isFacilityUploadPath,
  nextFacilitySortOrder,
  sameImage,
  type AdminFacilityRow,
  type FacilityLocation,
} from "./facility-model";

type FacilityInput = z.input<typeof facilitySchema>;
type FacilityData = z.output<typeof facilitySchema>;
type FacilityField = keyof FacilityInput;

const FIELDS: readonly FacilityField[] = ["locationId", "name", "description", "icon", "image", "sortOrder", "isActive"];
const SORT_ORDER_ERROR = "Isi urutan dengan angka bulat 0 sampai 100.000.";
const NETWORK_ERROR = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = tambah fasilitas baru. */
  facility: AdminFacilityRow | null;
  /** Apartemen awal untuk fasilitas baru (filter yang sedang dipakai, atau tombol di grup apartemen). */
  defaultLocationId: number | null;
  locations: FacilityLocation[];
  /** Semua fasilitas, untuk urutan bawaan max + 1 per apartemen. */
  facilities: AdminFacilityRow[];
  /** Berubah setiap kali dialog dibuka, supaya form mulai dari nilai awal lagi. */
  formKey: string;
};

/** Dialog tambah/ubah fasilitas gedung: modal di desktop, bottom sheet di HP (PRD 7.7). */
export function FacilityFormDialog({ open, onOpenChange, facility, defaultLocationId, locations, facilities, formKey }: Props) {
  const [busy, setBusy] = useState(false);
  const locationName = facility ? locations.find((location) => location.id === facility.locationId)?.name : undefined;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      title={facility ? "Ubah fasilitas" : "Tambah fasilitas"}
      description={
        facility
          ? `Perubahan langsung tampil di halaman ${locationName ?? "apartemen"}.`
          : "Fasilitas tampil di halaman apartemen dengan foto atau ikonnya."
      }
    >
      <FacilityForm
        key={formKey}
        facility={facility}
        defaultLocationId={defaultLocationId}
        locations={locations}
        facilities={facilities}
        onCancel={() => onOpenChange(false)}
        onSaved={() => onOpenChange(false)}
        onBusyChange={setBusy}
      />
    </ResponsiveDialog>
  );
}

type FormProps = {
  facility: AdminFacilityRow | null;
  defaultLocationId: number | null;
  locations: FacilityLocation[];
  facilities: AdminFacilityRow[];
  onCancel: () => void;
  onSaved: () => void;
  onBusyChange: (busy: boolean) => void;
};

/** Ikon awal: ikon tersimpan kalau dikenal; kalau belum dipilih, tebakan dari nama. */
function initialIcon(facility: AdminFacilityRow | null): string {
  if (!facility) return resolveFacilityIcon("", null);
  return isKnownIconName(facility.icon) ? resolveIconName(facility.icon) : resolveFacilityIcon(facility.name, facility.icon);
}

/** Buang foto yang sudah terunggah tapi tidak dipakai (tanpa menunggu, kegagalan diabaikan). */
function discard(paths: string[]) {
  if (!paths.length) return;
  void discardFacilityUploads(paths).catch(() => undefined);
}

function FacilityForm({ facility, defaultLocationId, locations, facilities, onCancel, onSaved, onBusyChange }: FormProps) {
  const initialLocation =
    facility?.locationId ?? defaultLocationId ?? (locations.length === 1 ? locations[0].id : undefined);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FacilityInput, unknown, FacilityData>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      locationId: initialLocation,
      name: facility?.name ?? "",
      description: facility?.description ?? "",
      icon: initialIcon(facility),
      image: facility?.image ?? null,
      sortOrder: facility?.sortOrder ?? nextFacilitySortOrder(facilities, initialLocation),
      isActive: facility?.isActive ?? true,
    },
  });

  const iconField = useController({ control, name: "icon" });
  const imageField = useController({ control, name: "image" });
  const activeField = useController({ control, name: "isActive" });
  const [name, description] = useWatch({ control, name: ["name", "description"] });
  // Selama ikon belum dipilih manual, ikon mengikuti tebakan dari nama.
  const [iconTouched, setIconTouched] = useState(Boolean(facility && isKnownIconName(facility.icon)));
  // Selama urutan belum diubah manual, urutan mengikuti apartemen yang dipilih (max + 1).
  const [sortTouched, setSortTouched] = useState(false);
  // Foto yang terunggah selama form ini terbuka; yang tidak jadi dipakai dibuang dari bucket.
  const session = useRef({ uploads: new Set<string>(), saved: false });

  // Simpan dikunci selama foto masih diunggah.
  const [uploadingImage, setUploadingImage] = useState(false);
  useEffect(() => {
    onBusyChange(isSubmitting);
  }, [isSubmitting, onBusyChange]);

  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  useEffect(() => {
    const state = session.current;
    return () => {
      // Dialog ditutup tanpa menyimpan: unggahan baru tidak dipakai.
      if (!state.saved) discard([...state.uploads]);
    };
  }, []);

  const onSubmit = async (values: FacilityData) => {
    try {
      const result = facility ? await updateFacility(facility.id, values) : await createFacility(values);
      if (result.ok) {
        session.current.saved = true;
        discard([...session.current.uploads].filter((path) => !sameImage(path, values.image)));
        toast.success(facility ? "Perubahan disimpan" : (result.message ?? "Fasilitas ditambahkan"));
        onSaved();
        return;
      }
      let focused = false;
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if ((FIELDS as readonly string[]).includes(field)) {
          setError(field as FacilityField, { message }, { shouldFocus: !focused });
          focused = true;
        }
      }
      toast.error(result.error);
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  function sortOrderFor(locationId: number): number {
    if (facility && facility.locationId === locationId) return facility.sortOrder;
    return nextFacilitySortOrder(facilities, locationId, facility?.id);
  }

  const locationRegister = register("locationId", {
    setValueAs: (value: unknown) => (value === "" || value == null ? undefined : Number(value)),
    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
      const id = Number(event.target.value);
      if (!sortTouched && Number.isInteger(id) && id > 0) setValue("sortOrder", sortOrderFor(id));
    },
  });

  const nameRegister = register("name", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      if (iconTouched) return;
      setValue("icon", resolveFacilityIcon(event.target.value, null), { shouldDirty: true });
    },
  });

  const iconHint = (() => {
    if (iconTouched) return undefined;
    if (facility) return "Ikon disarankan dari nama. Simpan untuk memakainya, atau pilih yang lain.";
    return "Ikon dipilih otomatis dari nama. Ganti kalau kurang pas.";
  })();

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate className="grid gap-5" aria-busy={isSubmitting || undefined}>
      <Field label="Apartemen" required error={errors.locationId?.message}>
        <NativeSelect {...locationRegister}>
          <option value="">Pilih apartemen</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.isActive ? location.name : `${location.name} (nonaktif)`}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field
        label="Nama"
        required
        error={errors.name?.message}
        aside={`${(name ?? "").length}/${FACILITY_NAME_MAX}`}
      >
        <Input {...nameRegister} maxLength={FACILITY_NAME_MAX} autoComplete="off" placeholder="mis. Kolam renang" />
      </Field>

      <Field
        label="Deskripsi"
        error={errors.description?.message}
        aside={`${(description ?? "").length}/${FACILITY_DESCRIPTION_MAX}`}
        hint="Satu kalimat singkat. Tampil di bawah nama, maksimal dua baris."
      >
        <Textarea
          {...register("description")}
          rows={3}
          maxLength={FACILITY_DESCRIPTION_MAX}
          placeholder="mis. Infinity pool di lantai 5, buka setiap hari 06.00 sampai 21.00."
        />
      </Field>

      <Field label="Ikon" error={errors.icon?.message} hint={iconHint}>
        <IconPicker
          value={iconField.field.value}
          choices={ICON_CHOICES}
          onChange={(next) => {
            setIconTouched(true);
            iconField.field.onChange(next);
          }}
        />
      </Field>

      <Field
        label="Foto"
        error={errors.image?.message}
        hint="Opsional. Tanpa foto, situs menampilkan ikon. Pakai foto horizontal; di situs tampil 4:3."
      >
        <SingleImageUploader
          value={imageField.field.value ?? null}
          folder="facilities"
          aspect="photo"
          fallbackLabel="Belum ada foto. Situs menampilkan ikon."
          onUploadingChange={setUploadingImage}
          onChange={(next) => {
            if (isFacilityUploadPath(next) && !sameImage(next, facility?.image)) session.current.uploads.add(next.trim());
            imageField.field.onChange(next);
          }}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Urutan"
          error={errors.sortOrder ? SORT_ORDER_ERROR : undefined}
          hint="Angka kecil tampil lebih dulu di apartemen yang sama."
        >
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={100_000}
            step={1}
            {...register("sortOrder", {
              setValueAs: (value: unknown) => (value === "" || value == null ? undefined : Number(value)),
              onChange: () => setSortTouched(true),
            })}
          />
        </Field>

        <SwitchField
          label="Aktif"
          checked={Boolean(activeField.field.value)}
          onCheckedChange={(checked) => activeField.field.onChange(checked)}
          onBlur={activeField.field.onBlur}
          onText="Tampil di situs"
          offText="Disembunyikan"
          hint="Kalau mati, fasilitas ini tidak tampil di halaman apartemen."
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={uploadingImage}>
          {facility ? "Simpan perubahan" : "Simpan fasilitas"}
        </Button>
      </div>
    </form>
  );
}
