"use client";

import { useEffect, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Field, NativeSelect } from "@/components/admin/kit/field";
import { IconPicker } from "@/components/admin/kit/icon-picker";
import { ResponsiveDialog } from "@/components/admin/locations/responsive-dialog";
import { SwitchField } from "@/components/admin/locations/switch-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/actions/admin/guard";
import { createLandmark, updateLandmark } from "@/lib/actions/admin/landmarks";
import { Icon, LANDMARK_ICON_CHOICES, resolveLandmarkIcon } from "@/lib/icons";
import { landmarkSchema } from "@/lib/validation/admin";
import {
  initialLandmarkIcon,
  isIconGuessed,
  nextSortOrder,
  type AdminLandmarkRow,
  type LandmarkLocation,
} from "./landmark-model";

type LandmarkInput = z.input<typeof landmarkSchema>;
type LandmarkData = z.output<typeof landmarkSchema>;
type LandmarkField = keyof LandmarkInput;

const FIELDS: readonly LandmarkField[] = ["locationId", "name", "distanceTime", "notes", "icon", "sortOrder", "isActive"];
const NAME_MAX = 120;
const DISTANCE_MAX = 100;
const NOTES_MAX = 255;
const SORT_ORDER_ERROR = "Isi urutan dengan angka bulat 0 sampai 100.000.";
const NETWORK_ERROR = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = tambah landmark baru. */
  landmark: AdminLandmarkRow | null;
  locations: LandmarkLocation[];
  /** Semua landmark (untuk urutan awal max + 1 per apartemen). */
  rows: AdminLandmarkRow[];
  /** Apartemen awal untuk landmark baru (tab yang sedang dibuka). */
  defaultLocationId: number | null;
  /** Berubah setiap kali dialog dibuka, supaya form mulai dari nilai awal lagi. */
  formKey: string;
  /** Dipanggil setelah tersimpan, dengan apartemen landmark tersebut. */
  onSaved?: (locationId: number) => void;
};

/** Dialog tambah/ubah landmark: modal di desktop, bottom sheet di HP (PRD 7.7). */
export function LandmarkFormDialog({ open, onOpenChange, landmark, locations, rows, defaultLocationId, formKey, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      title={landmark ? "Ubah landmark" : "Tambah landmark"}
      description={
        landmark
          ? "Perubahan langsung tampil di halaman apartemen dan detail unit."
          : "Tempat penting di sekitar apartemen, mis. mal, rumah sakit, kampus, atau bandara."
      }
    >
      <LandmarkForm
        key={formKey}
        landmark={landmark}
        locations={locations}
        rows={rows}
        defaultLocationId={defaultLocationId}
        onCancel={() => onOpenChange(false)}
        onSaved={(locationId) => {
          onOpenChange(false);
          onSaved?.(locationId);
        }}
        onBusyChange={setBusy}
      />
    </ResponsiveDialog>
  );
}

type FormProps = {
  landmark: AdminLandmarkRow | null;
  locations: LandmarkLocation[];
  rows: AdminLandmarkRow[];
  defaultLocationId: number | null;
  onCancel: () => void;
  onSaved: (locationId: number) => void;
  onBusyChange: (busy: boolean) => void;
};

function parseId(value: unknown): number | undefined {
  const n = Number(value);
  return value === "" || value == null || !Number.isInteger(n) || n <= 0 ? undefined : n;
}

function LandmarkForm({ landmark, locations, rows, defaultLocationId, onCancel, onSaved, onBusyChange }: FormProps) {
  const startLocationId = landmark?.locationId ?? defaultLocationId;
  // Ikon mengikuti tebakan dari nama sampai dipilih manual (landmark lama tanpa ikon juga).
  const [iconTouched, setIconTouched] = useState(Boolean(landmark && !isIconGuessed(landmark.icon)));
  // Urutan mengikuti apartemen terpilih (max + 1) sampai diubah manual.
  const [sortTouched, setSortTouched] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LandmarkInput, unknown, LandmarkData>({
    resolver: zodResolver(landmarkSchema),
    defaultValues: {
      locationId: startLocationId ?? undefined,
      name: landmark?.name ?? "",
      distanceTime: landmark?.distanceTime ?? "",
      notes: landmark?.notes ?? "",
      icon: initialLandmarkIcon(landmark),
      sortOrder: landmark?.sortOrder ?? nextSortOrder(rows, startLocationId),
      isActive: landmark?.isActive ?? true,
    },
  });
  const iconField = useController({ control, name: "icon" });
  const activeField = useController({ control, name: "isActive" });
  const [name, distanceTime, notes, icon] = useWatch({ control, name: ["name", "distanceTime", "notes", "icon"] });

  useEffect(() => {
    onBusyChange(isSubmitting);
  }, [isSubmitting, onBusyChange]);

  const onSubmit = async (values: LandmarkData) => {
    let result: ActionResult<unknown>;
    try {
      result = landmark ? await updateLandmark(landmark.id, values) : await createLandmark(values);
    } catch {
      toast.error(NETWORK_ERROR);
      return;
    }
    if (result.ok) {
      toast.success(landmark ? "Perubahan disimpan" : (result.message ?? "Landmark ditambahkan"));
      onSaved(values.locationId);
      return;
    }
    let focused = false;
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if ((FIELDS as readonly string[]).includes(field)) {
        setError(field as LandmarkField, { message }, { shouldFocus: !focused });
        focused = true;
      }
    }
    toast.error(result.error);
  };

  const locationField = register("locationId", {
    setValueAs: parseId,
    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (sortTouched) return;
      const id = parseId(event.target.value) ?? null;
      // Kembali ke apartemen asal: pakai urutan asal. Apartemen lain: taruh di akhir.
      const next =
        landmark && id === landmark.locationId
          ? landmark.sortOrder
          : nextSortOrder(
              rows.filter((row) => row.id !== landmark?.id),
              id,
            );
      setValue("sortOrder", next);
    },
  });

  const nameField = register("name", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      if (iconTouched) return;
      setValue("icon", resolveLandmarkIcon(event.target.value, null), { shouldDirty: true });
    },
  });

  const iconHint = iconTouched
    ? undefined
    : landmark
      ? "Ikon ditebak dari nama. Simpan untuk memakainya, atau pilih kategori lain."
      : "Ikon ditebak dari nama. Ganti kalau kurang pas.";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5" aria-busy={isSubmitting || undefined}>
      <Field label="Apartemen" required error={errors.locationId?.message}>
        <NativeSelect {...locationField}>
          {startLocationId == null ? <option value="">Pilih apartemen</option> : null}
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.isActive ? location.name : `${location.name} (nonaktif)`}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Nama" required error={errors.name?.message} aside={`${(name ?? "").length}/${NAME_MAX}`}>
        <Input {...nameField} maxLength={NAME_MAX} autoComplete="off" placeholder="mis. Masjid 99 Kubah" />
      </Field>

      <Field
        label="Jarak / waktu tempuh"
        required
        error={errors.distanceTime?.message}
        hint="Tulis seperti tamu membacanya, mis. 1 menit jalan kaki atau 25 menit (via tol)."
        aside={`${(distanceTime ?? "").length}/${DISTANCE_MAX}`}
      >
        <Input
          {...register("distanceTime")}
          maxLength={DISTANCE_MAX}
          autoComplete="off"
          placeholder="5 menit berkendara"
          className="tabular-nums"
        />
      </Field>

      <Field label="Catatan (opsional)" error={errors.notes?.message} aside={`${(notes ?? "").length}/${NOTES_MAX}`}>
        <Input {...register("notes")} maxLength={NOTES_MAX} autoComplete="off" placeholder="mis. Searah jalan ke Pantai Losari" />
      </Field>

      <Field label="Ikon kategori" error={errors.icon?.message} hint={iconHint}>
        <IconPicker
          value={iconField.field.value}
          choices={LANDMARK_ICON_CHOICES}
          onChange={(next) => {
            setIconTouched(true);
            iconField.field.onChange(next);
          }}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Urutan" error={errors.sortOrder ? SORT_ORDER_ERROR : undefined} hint="Angka kecil tampil lebih dulu di apartemen ini.">
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
          hint="Kalau mati, landmark tidak tampil di halaman apartemen dan detail unit."
        />
      </div>

      <div className="grid gap-2 rounded-control bg-surface px-3.5 py-3">
        <p className="text-caption font-semibold text-muted">Pratinjau di halaman apartemen</p>
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-line/70">
            <Icon name={icon} fallback="map-pin" className="size-5 text-ink-2" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="min-w-0 text-[15px] leading-6 font-semibold break-words text-ink">
                {name?.trim() || <span className="font-normal text-muted">Nama landmark</span>}
              </p>
              <p className="text-sm font-medium whitespace-nowrap text-ink-2 tabular-nums">
                {distanceTime?.trim() || <span className="font-normal text-muted">Jarak</span>}
              </p>
            </div>
            {notes?.trim() ? <p className="mt-0.5 text-sm break-words text-muted">{notes.trim()}</p> : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {landmark ? "Simpan perubahan" : "Simpan landmark"}
        </Button>
      </div>
    </form>
  );
}
