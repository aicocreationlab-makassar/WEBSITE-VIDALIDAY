"use client";

import { useEffect, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Field, NativeSelect } from "@/components/admin/kit/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRoomType, updateRoomType } from "@/lib/actions/admin/room-types";
import { roomTypeSchema, type RoomTypeInput } from "@/lib/validation/admin";
import { ROOM_CATEGORIES } from "@/types/domain";
import {
  ROOM_TYPE_NAME_MAX,
  fieldMessage,
  guessRoomCategory,
  parseNumberInput,
  roomTypeFormValues,
  suggestSlug,
  type AdminRoomTypeRow,
} from "./location-model";
import { ResponsiveDialog } from "./responsive-dialog";
import { SwitchField } from "./switch-field";

type RoomTypeData = z.output<typeof roomTypeSchema>;
type RoomTypeField = keyof RoomTypeInput;

const FIELDS: readonly RoomTypeField[] = ["name", "slug", "category", "defaultMaxGuests", "sortOrder", "isActive"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: number;
  locationName: string;
  /** null = tambah tipe baru. */
  roomType: AdminRoomTypeRow | null;
  defaultSortOrder: number;
  /** Berubah setiap kali dialog dibuka, supaya form mulai dari nilai awal lagi. */
  formKey: string;
};

/** Dialog tambah/ubah tipe kamar (bottom sheet di HP). */
export function RoomTypeDialog({ open, onOpenChange, locationId, locationName, roomType, defaultSortOrder, formKey }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      title={roomType ? "Ubah tipe kamar" : "Tambah tipe kamar"}
      description={
        roomType
          ? `Perubahan berlaku untuk semua unit ${roomType.name} di ${locationName}.`
          : `Tipe baru langsung bisa dipilih di form unit untuk ${locationName}.`
      }
    >
      <RoomTypeForm
        key={formKey}
        locationId={locationId}
        roomType={roomType}
        defaultSortOrder={defaultSortOrder}
        onCancel={() => onOpenChange(false)}
        onSaved={() => onOpenChange(false)}
        onBusyChange={setBusy}
      />
    </ResponsiveDialog>
  );
}

type FormProps = {
  locationId: number;
  roomType: AdminRoomTypeRow | null;
  defaultSortOrder: number;
  onCancel: () => void;
  onSaved: () => void;
  onBusyChange: (busy: boolean) => void;
};

function RoomTypeForm({ locationId, roomType, defaultSortOrder, onCancel, onSaved, onBusyChange }: FormProps) {
  const isNew = roomType === null;
  // Saat menambah: slug dan kategori mengikuti nama sampai diubah manual.
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [categoryTouched, setCategoryTouched] = useState(!isNew);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RoomTypeInput, unknown, RoomTypeData>({
    resolver: zodResolver(roomTypeSchema),
    defaultValues: roomTypeFormValues(locationId, roomType, defaultSortOrder),
  });
  const activeField = useController({ control, name: "isActive" });
  const [name, slug] = useWatch({ control, name: ["name", "slug"] });

  useEffect(() => {
    onBusyChange(isSubmitting);
  }, [isSubmitting, onBusyChange]);

  const error = (field: RoomTypeField) => {
    const message = errors[field]?.message;
    return message ? fieldMessage(field, message) : undefined;
  };

  const onSubmit = async (values: RoomTypeData) => {
    const result = roomType ? await updateRoomType(roomType.id, values) : await createRoomType(values);
    if (result.ok) {
      toast.success(roomType ? "Perubahan disimpan" : (result.message ?? "Tipe kamar ditambahkan"));
      onSaved();
      return;
    }
    let focused = false;
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if ((FIELDS as readonly string[]).includes(field)) {
        setError(field as RoomTypeField, { message: fieldMessage(field, message) }, { shouldFocus: !focused });
        focused = true;
      }
    }
    toast.error(result.error);
  };

  const nameField = register("name", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      if (!slugTouched) setValue("slug", suggestSlug(next), { shouldValidate: Boolean(errors.slug) });
      if (!categoryTouched) setValue("category", guessRoomCategory(next));
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5" aria-busy={isSubmitting || undefined}>
      <Field label="Nama tipe kamar" required error={error("name")} aside={`${(name ?? "").length}/${ROOM_TYPE_NAME_MAX}`}>
        <Input {...nameField} maxLength={ROOM_TYPE_NAME_MAX} autoComplete="off" placeholder="mis. Studio Corner" />
      </Field>

      <Field
        label="Slug"
        required
        error={error("slug")}
        hint={isNew ? "Dibuat dari nama. Unik di apartemen ini." : `Unik di apartemen ini. Sekarang: ${slug || "…"}`}
      >
        <Input
          {...register("slug", { onChange: () => setSlugTouched(true) })}
          maxLength={80}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="mis. studio-corner"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Kategori" required error={error("category")} hint="Untuk rekomendasi unit serupa antarapartemen.">
          <NativeSelect {...register("category", { onChange: () => setCategoryTouched(true) })}>
            {ROOM_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Kapasitas default" error={error("defaultMaxGuests")} hint="Isian awal kapasitas tamu unit baru.">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            step={1}
            placeholder="mis. 2"
            {...register("defaultMaxGuests", { setValueAs: (value: unknown) => parseNumberInput(value) })}
          />
        </Field>

        <Field label="Urutan" error={error("sortOrder")} hint="Angka kecil tampil lebih dulu.">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={100_000}
            step={1}
            {...register("sortOrder", {
              setValueAs: (value: unknown) => {
                const n = parseNumberInput(value);
                return n === null ? undefined : n;
              },
            })}
          />
        </Field>

        <SwitchField
          label="Aktif"
          checked={Boolean(activeField.field.value)}
          onCheckedChange={(checked) => activeField.field.onChange(checked)}
          onBlur={activeField.field.onBlur}
          onText="Bisa dipilih"
          offText="Disembunyikan"
          hint="Tipe nonaktif disembunyikan dari filter di situs. Unit yang memakainya tetap tampil."
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isNew ? "Simpan tipe kamar" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}
