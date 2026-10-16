"use client";

import { useController, useWatch } from "react-hook-form";
import { Field } from "@/components/admin/kit/field";
import { FormCard } from "@/components/admin/kit/form-card";
import { Textarea } from "@/components/ui/textarea";
import type { AdminLocationOption } from "@/lib/data/admin/units";
import { NoteText, SwitchRow, WarningBox, useUnitFormContext } from "./form-bits";
import { DESCRIPTION_LIMIT, descriptionNote, findLocation, statusNotes } from "./unit-form-model";

/** Kartu "Deskripsi" (PRD 7.4): textarea dengan penghitung karakter, saran 150–400. */
export function DescriptionSection() {
  const {
    control,
    register,
    formState: { errors },
  } = useUnitFormContext();
  const description = useWatch({ control, name: "description" }) ?? "";
  const length = description.trim().length;

  return (
    <FormCard id="deskripsi" title="Deskripsi" description="Ceritakan unit ini dengan kalimat singkat." className="scroll-mt-20">
      <Field
        label="Deskripsi"
        error={errors.description?.message}
        aside={`${length} karakter`}
        hint={<NoteText note={descriptionNote(length)} />}
      >
        <Textarea
          {...register("description")}
          maxLength={DESCRIPTION_LIMIT}
          rows={6}
          className="min-h-40"
          placeholder="mis. Studio nyaman di lantai 26 dengan pemandangan kota, dekat lift, cocok untuk berdua."
        />
      </Field>
    </FormCard>
  );
}

/** Kartu "Status" (PRD 7.4): Tampil di website, Tersedia, Unggulan, dengan penjelasan satu baris. */
export function StatusSection({ locations }: { locations: AdminLocationOption[] }) {
  const { control } = useUnitFormContext();
  const published = useController({ control, name: "isPublished" });
  const available = useController({ control, name: "isAvailable" });
  const featured = useController({ control, name: "isFeatured" });
  const [locationId, photos] = useWatch({ control, name: ["locationId", "photos"] });

  const notes = statusNotes({
    isPublished: Boolean(published.field.value),
    isAvailable: Boolean(available.field.value),
    isFeatured: Boolean(featured.field.value),
    photoCount: photos?.length ?? 0,
    location: findLocation(locations, locationId),
  });

  return (
    <FormCard id="status" title="Status" description="Atur apakah unit tampil dan bisa disewa." className="scroll-mt-20">
      <div className="-my-2 divide-y divide-line">
        <SwitchRow
          label="Tampil di website"
          description={
            published.field.value
              ? "Unit terlihat oleh tamu di situs."
              : "Draft: hanya terlihat di admin sampai dinyalakan."
          }
          checked={Boolean(published.field.value)}
          onCheckedChange={(checked) => published.field.onChange(checked)}
          onBlur={published.field.onBlur}
        />
        <SwitchRow
          label="Tersedia"
          description={
            available.field.value
              ? "Tamu bisa mengirim permintaan sewa seperti biasa."
              : "Unit disembunyikan dari hasil pencarian (kecuali tamu memilih Tampilkan unit penuh); tombolnya jadi Tanya ketersediaan."
          }
          checked={Boolean(available.field.value)}
          onCheckedChange={(checked) => available.field.onChange(checked)}
          onBlur={available.field.onBlur}
        />
        <SwitchRow
          label="Unggulan"
          description="Diutamakan di beranda dan rekomendasi unit serupa."
          checked={Boolean(featured.field.value)}
          onCheckedChange={(checked) => featured.field.onChange(checked)}
          onBlur={featured.field.onBlur}
        />
      </div>
      {notes.length ? (
        <WarningBox>
          <ul className="grid gap-1">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </WarningBox>
      ) : null}
    </FormCard>
  );
}
