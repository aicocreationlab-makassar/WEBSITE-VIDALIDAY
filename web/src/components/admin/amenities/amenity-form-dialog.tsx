"use client";

import { useEffect, useId, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/admin/kit/field";
import { IconPicker } from "@/components/admin/kit/icon-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useIsDesktop } from "@/hooks/use-media-query";
import { createAmenity, updateAmenity } from "@/lib/actions/admin/amenities";
import { Icon, resolveAmenityIcon, resolveIconName } from "@/lib/icons";
import { amenitySchema } from "@/lib/validation/admin";
import { needsIcon, type AdminAmenityRow } from "./amenity-model";

type AmenityInput = z.input<typeof amenitySchema>;
type AmenityData = z.output<typeof amenitySchema>;
type AmenityField = keyof AmenityInput;

const FIELDS: readonly AmenityField[] = ["name", "icon", "sortOrder", "isActive"];
const NAME_MAX = 60;
const SORT_ORDER_ERROR = "Isi urutan dengan angka bulat 0 sampai 100.000.";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = tambah fasilitas baru. */
  amenity: AdminAmenityRow | null;
  /** Urutan awal untuk fasilitas baru (max + 1). */
  defaultSortOrder: number;
  /** Berubah setiap kali dialog dibuka, supaya form mulai dari nilai awal lagi. */
  formKey: string;
};

/** Dialog tambah/ubah fasilitas kamar: modal di desktop, bottom sheet di HP (PRD 7.6). */
export function AmenityFormDialog({ open, onOpenChange, amenity, defaultSortOrder, formKey }: Props) {
  const isDesktop = useIsDesktop();
  const [busy, setBusy] = useState(false);
  const title = amenity ? "Ubah fasilitas" : "Tambah fasilitas";
  const description = amenity
    ? `Perubahan langsung berlaku di semua unit yang memakai ${amenity.name}.`
    : "Fasilitas baru langsung bisa dipilih di form unit.";

  // Jangan tutup selama menyimpan supaya hasil (dan galat) tidak hilang.
  const handleOpenChange = (next: boolean) => {
    if (!busy || next) onOpenChange(next);
  };

  const form = (
    <AmenityForm
      key={formKey}
      amenity={amenity}
      defaultSortOrder={defaultSortOrder}
      onCancel={() => handleOpenChange(false)}
      onSaved={() => onOpenChange(false)}
      onBusyChange={setBusy}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <SheetBody className="pt-2">{form}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}

type FormProps = {
  amenity: AdminAmenityRow | null;
  defaultSortOrder: number;
  onCancel: () => void;
  onSaved: () => void;
  onBusyChange: (busy: boolean) => void;
};

/** Ikon awal: ikon tersimpan; kalau belum dipilih ("check"), saran dari nama. */
function initialIcon(amenity: AdminAmenityRow | null): string {
  if (!amenity) return "check";
  return needsIcon(amenity.icon) ? resolveAmenityIcon(amenity.name, amenity.icon) : resolveIconName(amenity.icon);
}

function AmenityForm({ amenity, defaultSortOrder, onCancel, onSaved, onBusyChange }: FormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AmenityInput, unknown, AmenityData>({
    resolver: zodResolver(amenitySchema),
    defaultValues: {
      name: amenity?.name ?? "",
      icon: initialIcon(amenity),
      sortOrder: amenity?.sortOrder ?? defaultSortOrder,
      isActive: amenity?.isActive ?? true,
    },
  });

  const iconField = useController({ control, name: "icon" });
  const activeField = useController({ control, name: "isActive" });
  const [name, icon] = useWatch({ control, name: ["name", "icon"] });
  // Selama ikon belum dipilih manual, ikon mengikuti tebakan dari nama.
  const [iconTouched, setIconTouched] = useState(Boolean(amenity && !needsIcon(amenity.icon)));
  const activeId = useId();
  const activeHintId = useId();

  useEffect(() => {
    onBusyChange(isSubmitting);
  }, [isSubmitting, onBusyChange]);

  const onSubmit = async (values: AmenityData) => {
    const result = amenity ? await updateAmenity(amenity.id, values) : await createAmenity(values);
    if (result.ok) {
      toast.success(amenity ? "Perubahan disimpan" : (result.message ?? "Fasilitas ditambahkan"));
      onSaved();
      return;
    }
    let focused = false;
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if ((FIELDS as readonly string[]).includes(field)) {
        setError(field as AmenityField, { message }, { shouldFocus: !focused });
        focused = true;
      }
    }
    toast.error(result.error);
  };

  const iconHint = (() => {
    if (resolveIconName(icon, "check") === "check") return "Ikon belum dipilih. Pilih ikon yang paling mirip supaya tamu cepat paham.";
    if (!iconTouched && amenity) return "Ikon disarankan dari nama. Simpan untuk memakainya, atau pilih yang lain.";
    if (!iconTouched) return "Ikon dipilih otomatis dari nama. Ganti kalau kurang pas.";
    return undefined;
  })();

  const nameField = register("name", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      if (iconTouched) return;
      setValue("icon", resolveAmenityIcon(event.target.value, null), { shouldDirty: true });
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5" aria-busy={isSubmitting || undefined}>
      <Field label="Nama" required error={errors.name?.message} aside={`${(name ?? "").length}/${NAME_MAX}`}>
        <Input {...nameField} maxLength={NAME_MAX} autoComplete="off" placeholder="mis. Smart TV 43 inci" />
      </Field>

      <Field label="Ikon" error={errors.icon?.message} hint={iconHint}>
        <IconPicker
          value={iconField.field.value}
          onChange={(next) => {
            setIconTouched(true);
            iconField.field.onChange(next);
          }}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Urutan" error={errors.sortOrder ? SORT_ORDER_ERROR : undefined} hint="Angka kecil tampil lebih dulu.">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={100_000}
            step={1}
            {...register("sortOrder", {
              setValueAs: (value: unknown) => (value === "" || value == null ? undefined : Number(value)),
            })}
          />
        </Field>

        <div className="grid content-start gap-1.5">
          <label htmlFor={activeId} className="text-sm leading-5 font-semibold text-ink-2">
            Aktif
          </label>
          <div className="flex min-h-12 items-center gap-3">
            <Switch
              id={activeId}
              checked={Boolean(activeField.field.value)}
              onCheckedChange={(checked) => activeField.field.onChange(checked)}
              onBlur={activeField.field.onBlur}
              aria-describedby={activeHintId}
            />
            <span className="text-sm text-ink-2" aria-hidden="true">
              {activeField.field.value ? "Tampil di halaman unit" : "Disembunyikan"}
            </span>
          </div>
          <p id={activeHintId} className="text-caption text-muted">
            Kalau mati, fasilitas ini tidak tampil di halaman unit.
          </p>
        </div>
      </div>

      <div className="grid gap-2 rounded-control bg-surface px-3.5 py-3">
        <p className="text-caption font-semibold text-muted">Pratinjau di halaman unit</p>
        <div className="flex min-h-12 min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-white ring-1 ring-line/70">
            <Icon name={icon} className="size-5 text-ink-2" />
          </span>
          <span className="min-w-0 text-[15px] leading-5 break-words text-ink">
            {name?.trim() || <span className="text-muted">Nama fasilitas</span>}
          </span>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {amenity ? "Simpan perubahan" : "Simpan fasilitas"}
        </Button>
      </div>
    </form>
  );
}
