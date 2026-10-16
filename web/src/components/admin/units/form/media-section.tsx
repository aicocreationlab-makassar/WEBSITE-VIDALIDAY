"use client";

import Image from "next/image";
import { useController, useWatch } from "react-hook-form";
import { ExternalLink, Play } from "lucide-react";
import { Field } from "@/components/admin/kit/field";
import { FormCard } from "@/components/admin/kit/form-card";
import { PhotoListUploader } from "@/components/admin/kit/photo-uploader";
import { Input } from "@/components/ui/input";
import { UNIT_PHOTOS_MAX } from "@/lib/validation/admin";
import { NoteText, useUnitFormContext } from "./form-bits";
import { youtubeNote, youtubePreview } from "./unit-form-model";

/**
 * Kartu "Foto & video" (PRD 7.4): unggah banyak foto (kompres WebP di browser, foto pertama = sampul,
 * bisa diurutkan) dan link YouTube dengan pratinjau thumbnail.
 */
export function MediaSection({
  onUploadingChange,
  onUpload,
}: {
  onUploadingChange?: (uploading: boolean) => void;
  /** Dipanggil untuk tiap foto baru (bukan urutan ulang), supaya foto yang tidak jadi disimpan bisa dibuang. */
  onUpload?: (path: string) => void;
}) {
  const {
    control,
    register,
    formState: { errors },
  } = useUnitFormContext();
  const photos = useController({ control, name: "photos" });
  const youtubeUrl = useWatch({ control, name: "youtubeUrl" });
  const list = photos.field.value ?? [];
  const preview = youtubePreview(youtubeUrl);
  const photosError =
    errors.photos?.message ?? (Array.isArray(errors.photos) ? "Ada foto yang tidak valid. Hapus lalu unggah lagi." : undefined);

  return (
    <FormCard
      id="foto"
      title="Foto & video"
      description="Foto pertama jadi sampul di kartu unit."
      className="scroll-mt-20"
    >
      <Field
        label="Foto unit"
        error={photosError}
        aside={`${list.length}/${UNIT_PHOTOS_MAX}`}
        hint={
          list.length
            ? "Geser foto (atau pakai tombol panah) untuk mengubah urutan."
            : "Belum ada foto. Unit tanpa foto tetap tampil, tapi jauh lebih jarang diklik tamu."
        }
      >
        <PhotoListUploader
          value={list}
          onChange={(next) => {
            for (const path of next) if (!list.includes(path)) onUpload?.(path);
            photos.field.onChange(next);
          }}
          folder="units"
          max={UNIT_PHOTOS_MAX}
          onUploadingChange={onUploadingChange}
        />
      </Field>

      <Field label="Link video YouTube" error={errors.youtubeUrl?.message} hint={<NoteText note={youtubeNote(youtubeUrl)} />}>
        <Input
          {...register("youtubeUrl")}
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="https://youtu.be/…"
        />
      </Field>

      {preview ? (
        <a
          href={preview.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block aspect-video w-full max-w-sm overflow-hidden rounded-card bg-surface-2 ring-1 ring-line"
        >
          <Image
            src={preview.thumbnail}
            alt="Thumbnail video YouTube"
            fill
            unoptimized
            sizes="(max-width: 640px) 92vw, 384px"
            className="object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-night/20 transition-colors group-hover:bg-night/30">
            <span className="flex size-14 items-center justify-center rounded-full bg-white/95 text-brand-600 shadow-sm">
              <Play className="size-6 fill-current" aria-hidden="true" />
            </span>
          </span>
          <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-caption font-semibold text-ink">
            Putar di YouTube
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </span>
        </a>
      ) : null}
    </FormCard>
  );
}
