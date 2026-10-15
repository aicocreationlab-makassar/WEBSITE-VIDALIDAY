"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Plus } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/admin/kit/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLocation } from "@/lib/actions/admin/locations";
import {
  LOCATION_NAME_MAX,
  NEW_LOCATION_NOTE,
  SHORT_NAME_MAX,
  fieldMessage,
  newLocationSchema,
  suggestShortName,
  suggestSlug,
  type NewLocationData,
  type NewLocationInput,
} from "./location-model";
import { ResponsiveDialog } from "./responsive-dialog";

const FIELDS: readonly (keyof NewLocationInput)[] = ["name", "shortName", "slug"];

/** Tombol "Tambah apartemen" + dialog (bottom sheet di HP). Setelah dibuat, buka halaman ubah. */
export function AddLocationButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <Button
        onClick={() => {
          setFormKey((key) => key + 1);
          setOpen(true);
        }}
      >
        <Plus aria-hidden="true" />
        Tambah apartemen
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        busy={busy}
        title="Tambah apartemen"
        description="Isi nama dulu. Alamat, peta, foto, dan tipe kamar dilengkapi di halaman berikutnya."
      >
        <NewLocationForm key={formKey} onCancel={() => setOpen(false)} onBusyChange={setBusy} onDone={() => setOpen(false)} />
      </ResponsiveDialog>
    </>
  );
}

type FormProps = {
  onCancel: () => void;
  onDone: () => void;
  onBusyChange: (busy: boolean) => void;
};

function NewLocationForm({ onCancel, onDone, onBusyChange }: FormProps) {
  const router = useRouter();
  // Nama singkat dan slug mengikuti nama sampai diubah manual.
  const [shortTouched, setShortTouched] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewLocationInput, unknown, NewLocationData>({
    resolver: zodResolver(newLocationSchema),
    defaultValues: { name: "", shortName: "", slug: "" },
  });
  const [shortName, slug] = useWatch({ control, name: ["shortName", "slug"] });

  useEffect(() => {
    onBusyChange(isSubmitting);
  }, [isSubmitting, onBusyChange]);

  const onSubmit = async (values: NewLocationData) => {
    const result = await createLocation(values);
    if (result.ok && result.data) {
      toast.success(result.message ?? "Apartemen dibuat");
      onDone();
      router.push(`/admin/locations/${result.data.id}`);
      return;
    }
    if (!result.ok) {
      let focused = false;
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if ((FIELDS as readonly string[]).includes(field)) {
          setError(field as keyof NewLocationInput, { message: fieldMessage(field, message) }, { shouldFocus: !focused });
          focused = true;
        }
      }
      toast.error(result.error);
    }
  };

  const nameField = register("name", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const name = event.target.value;
      if (!shortTouched) setValue("shortName", suggestShortName(name), { shouldValidate: Boolean(errors.shortName) });
      if (!slugTouched) setValue("slug", suggestSlug(name), { shouldValidate: Boolean(errors.slug) });
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5" aria-busy={isSubmitting || undefined}>
      <Field label="Nama" required error={errors.name?.message}>
        <Input {...nameField} maxLength={LOCATION_NAME_MAX} autoComplete="off" placeholder="mis. Vida View Apartemen" />
      </Field>

      <Field
        label="Nama singkat"
        required
        error={errors.shortName?.message}
        hint="Label tab di kotak pencarian beranda"
        aside={`${(shortName ?? "").length}/${SHORT_NAME_MAX}`}
      >
        <Input
          {...register("shortName", { onChange: () => setShortTouched(true) })}
          maxLength={SHORT_NAME_MAX}
          autoComplete="off"
          placeholder="mis. Vida View"
        />
      </Field>

      <Field
        label="Slug"
        required
        error={errors.slug?.message}
        hint={`Alamat halaman: /apartemen/${slug || "…"}`}
      >
        <Input
          {...register("slug", { onChange: () => setSlugTouched(true) })}
          maxLength={80}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="mis. vida-view"
        />
      </Field>

      <p className="flex items-start gap-2 rounded-control bg-surface px-3.5 py-3 text-sm text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
        <span>
          Apartemen baru dibuat nonaktif, jadi belum tampil di situs. {NEW_LOCATION_NOTE}
        </span>
      </p>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Simpan apartemen
        </Button>
      </div>
    </form>
  );
}
