"use client";

import { useId, useRef, useState } from "react";
import { useController, useFieldArray, useFormContext, useWatch, type Control } from "react-hook-form";
import { ArrowDown, ArrowUp, ListPlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/admin/kit/field";
import { FormCard } from "@/components/admin/kit/form-card";
import { IconPicker } from "@/components/admin/kit/icon-picker";
import { CharCount } from "@/components/admin/settings/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { AboutInput } from "@/lib/validation/admin";
import { ABOUT_ICON_CHOICES, ABOUT_MAX, MAX_REASONS, newReason, type AboutReasonValues } from "./about-model";

/**
 * Daftar "Alasan memilih VIDALIDAY" (PRD 7.9): judul, deskripsi, ikon; naikkan/turunkan, hapus
 * (bisa diurungkan dari toast), tambah sampai 12. Ikon lama sudah di-resolve saat dimuat.
 */
export function ReasonsEditor({ className }: { className?: string }) {
  const { control, getValues, formState } = useFormContext<AboutInput>();
  const { fields, append, remove, move, insert } = useFieldArray({ control, name: "reasons" });
  const [announcement, setAnnouncement] = useState("");
  const listId = useId();
  const addButton = useRef<HTMLButtonElement>(null);
  const full = fields.length >= MAX_REASONS;
  const rootError = formState.errors.reasons?.message ?? formState.errors.reasons?.root?.message;

  /** Fokus ke tombol/isian di posisi baru (DOM item dipindah, fokus bisa hilang). */
  function focusControl(index: number, control: "naik" | "turun" | "judul") {
    requestAnimationFrame(() => {
      const list = document.getElementById(listId);
      const item = list?.querySelectorAll<HTMLElement>("[data-reason]")[index];
      const target =
        control === "judul"
          ? item?.querySelector<HTMLElement>("input")
          : (item?.querySelector<HTMLButtonElement>(`[data-move="${control}"]:not(:disabled)`) ??
            item?.querySelector<HTMLButtonElement>("[data-move]:not(:disabled)"));
      (target ?? addButton.current)?.focus();
    });
  }

  function moveReason(from: number, to: number) {
    if (to < 0 || to >= fields.length) return;
    move(from, to);
    setAnnouncement(`Alasan dipindah ke urutan ${to + 1} dari ${fields.length}.`);
    focusControl(to, to < from ? "naik" : "turun");
  }

  function removeReason(index: number) {
    const removed = getValues(`reasons.${index}`) as AboutReasonValues | undefined;
    remove(index);
    setAnnouncement("Alasan dihapus.");
    const remaining = fields.length - 1;
    if (remaining > 0) focusControl(Math.min(index, remaining - 1), "judul");
    else requestAnimationFrame(() => addButton.current?.focus());
    if (!removed) return;
    toast("Alasan dihapus", {
      description: removed.title.trim() || undefined,
      action: {
        label: "Urungkan",
        onClick: () => {
          const length = getValues("reasons")?.length ?? 0;
          if (length >= MAX_REASONS) return;
          insert(Math.min(index, length), removed, { shouldFocus: false });
          setAnnouncement("Alasan dikembalikan.");
        },
      },
    });
  }

  function addReason() {
    if (full) return;
    append(newReason(), { shouldFocus: true });
    setAnnouncement(`Alasan ${fields.length + 1} ditambahkan.`);
  }

  return (
    <FormCard
      id="alasan"
      title="Alasan memilih VIDALIDAY"
      description="Tampil sebagai kartu berikon di halaman About, dengan urutan yang sama."
      className={className}
      action={
        <span className="text-sm font-semibold text-ink-2 tabular-nums">
          {fields.length}/{MAX_REASONS}
        </span>
      }
    >
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {fields.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-control border border-dashed border-line px-4 py-8 text-center">
          <ListPlus className="size-8 text-subtle" aria-hidden="true" />
          <div className="grid gap-1">
            <p className="font-semibold text-ink">Belum ada alasan</p>
            <p className="max-w-sm text-sm text-muted">
              Selama kosong, halaman About memakai alasan bawaan. Tambah alasan pertama untuk menggantinya.
            </p>
          </div>
          <Button ref={addButton} type="button" onClick={addReason}>
            <Plus aria-hidden="true" />
            Tambah alasan
          </Button>
        </div>
      ) : (
        <ol id={listId} className="grid gap-4" aria-label="Daftar alasan">
          {fields.map((field, index) => (
            <li key={field.id} data-reason="">
              <ReasonItem
                index={index}
                total={fields.length}
                control={control}
                onMoveUp={() => moveReason(index, index - 1)}
                onMoveDown={() => moveReason(index, index + 1)}
                onRemove={() => removeReason(index)}
              />
            </li>
          ))}
        </ol>
      )}

      {rootError ? (
        <p role="alert" className="text-caption font-medium text-danger">
          {rootError}
        </p>
      ) : null}

      {fields.length > 0 ? (
        <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <Button ref={addButton} type="button" variant="secondary" onClick={addReason} disabled={full}>
            <Plus aria-hidden="true" />
            Tambah alasan
          </Button>
          <p className="text-caption text-muted">
            {full ? `Sudah ${MAX_REASONS} alasan, batas maksimal.` : `Bisa ${MAX_REASONS - fields.length} alasan lagi.`}
          </p>
        </div>
      ) : null}
    </FormCard>
  );
}

type ReasonItemProps = {
  index: number;
  total: number;
  control: Control<AboutInput>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
};

function ReasonItem({ index, total, control, onMoveUp, onMoveDown, onRemove }: ReasonItemProps) {
  const { register, formState } = useFormContext<AboutInput>();
  const iconField = useController({ control, name: `reasons.${index}.icon` });
  const [title, desc] = useWatch({ control, name: [`reasons.${index}.title`, `reasons.${index}.desc`] });
  const errors = formState.errors.reasons?.[index];
  const number = index + 1;
  const name = (title ?? "").trim();

  return (
    <div
      className={cn(
        "rounded-card border bg-surface p-4",
        errors ? "border-brand-200" : "border-line",
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
          <Icon name={iconField.field.value} fallback="shield-check" className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-sm leading-5">
          <span className="font-bold text-ink">Alasan {number}</span>
          <span className="block truncate text-muted">{name || "Judul belum diisi"}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="quiet"
            data-move="naik"
            onClick={onMoveUp}
            disabled={index === 0}
            className="max-sm:w-11 max-sm:px-0"
            aria-label={`Naikkan alasan ${number}`}
          >
            <ArrowUp aria-hidden="true" />
            <span className="hidden sm:inline" aria-hidden="true">
              Naikkan
            </span>
          </Button>
          <Button
            type="button"
            variant="quiet"
            data-move="turun"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="max-sm:w-11 max-sm:px-0"
            aria-label={`Turunkan alasan ${number}`}
          >
            <ArrowDown aria-hidden="true" />
            <span className="hidden sm:inline" aria-hidden="true">
              Turunkan
            </span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <Field
          label="Judul"
          required
          error={errors?.title?.message}
          aside={<CharCount value={title} max={ABOUT_MAX.reasonTitle} />}
        >
          <Input
            {...register(`reasons.${index}.title`)}
            autoComplete="off"
            maxLength={ABOUT_MAX.reasonTitle}
            placeholder="Contoh: Unit bersih dan nyaman"
          />
        </Field>

        <Field label="Ikon" error={errors?.icon?.message}>
          <IconPicker
            value={iconField.field.value}
            onChange={(next) => iconField.field.onChange(next)}
            choices={ABOUT_ICON_CHOICES}
          />
        </Field>

        <Field
          label="Deskripsi"
          error={errors?.desc?.message}
          className="md:col-span-2"
          aside={<CharCount value={desc} max={ABOUT_MAX.reasonDesc} />}
        >
          <Textarea
            {...register(`reasons.${index}.desc`)}
            rows={2}
            maxLength={ABOUT_MAX.reasonDesc}
            placeholder="Penjelasan singkat satu kalimat"
          />
        </Field>
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="quiet"
          onClick={onRemove}
          className="text-danger hover:bg-brand-50 hover:text-danger"
          aria-label={`Hapus alasan ${number}${name ? `: ${name}` : ""}`}
        >
          <Trash2 aria-hidden="true" />
          Hapus alasan
        </Button>
      </div>
    </div>
  );
}
