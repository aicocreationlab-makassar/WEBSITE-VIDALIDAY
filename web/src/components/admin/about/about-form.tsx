"use client";

import { useId, useState } from "react";
import { FormProvider, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { ConfirmDialog } from "@/components/admin/kit/confirm-dialog";
import { Field } from "@/components/admin/kit/field";
import { AdminPageHeader, FormCard } from "@/components/admin/kit/form-card";
import { StickyActionBar } from "@/components/admin/kit/sticky-action-bar";
import { useUnsavedGuard } from "@/components/admin/kit/use-unsaved-guard";
import { CharCount, focusFirstInvalid, SaveStatus } from "@/components/admin/settings/form-bits";
import { SectionNav } from "@/components/admin/settings/section-nav";
import { dirtyKeys, sectionStatus, truthyKeys } from "@/components/admin/settings/settings-model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveAbout } from "@/lib/actions/admin/settings";
import { aboutSchema, type AboutInput } from "@/lib/validation/admin";
import { ABOUT_MAX, ABOUT_SECTIONS, aboutIssueMessage, isAboutFieldPath, type AboutFormValues } from "./about-model";
import { ReasonsEditor } from "./reasons-editor";

type AboutData = z.output<typeof aboutSchema>;

const SAVE_FAILED = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";
const SECTION_CLASS = "scroll-mt-36";

type Props = {
  initial: AboutFormValues;
  /** Waktu simpan terakhir pengaturan (updated_at terbaru). */
  savedAt: string | null;
};

/**
 * Form halaman About (PRD 7.9, 6.8): pembuka, cerita (3 paragraf), alasan memilih (repeater dengan
 * ikon), komitmen & penutup. Semua kunci about_* disimpan sekaligus; ikon alasan tetap terjaga.
 */
export function AboutForm({ initial, savedAt }: Props) {
  const formId = useId();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const form = useForm<AboutInput, unknown, AboutData>({
    resolver: zodResolver(aboutSchema, { error: aboutIssueMessage }),
    defaultValues: initial,
    shouldFocusError: false,
  });
  const {
    register,
    control,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors, dirtyFields, isDirty, isSubmitting },
  } = form;
  useUnsavedGuard(isDirty && !isSubmitting);

  const [tagline, heroTitle, introP1, introP2, introP3, commitTitle, commitText, closingQuote, closingCta] = useWatch({
    control,
    name: ["tagline", "heroTitle", "introP1", "introP2", "introP3", "commitTitle", "commitText", "closingQuote", "closingCta"],
  });

  const dirtyList = dirtyKeys(dirtyFields);
  const errorList = truthyKeys(errors);
  const navSections = ABOUT_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    status: sectionStatus(section.fields, errorList, dirtyList),
  }));

  async function onValid() {
    const values = getValues();
    let result: Awaited<ReturnType<typeof saveAbout>>;
    try {
      result = await saveAbout(values);
    } catch {
      toast.error(SAVE_FAILED);
      return;
    }

    if (result.ok) {
      toast.success(result.message ?? "Perubahan disimpan");
      // Halaman dimuat ulang oleh server (key berubah); sementara itu tandai form bersih.
      reset(values);
      return;
    }

    const fieldErrors = Object.entries(result.fieldErrors ?? {}).filter(([path]) => isAboutFieldPath(path));
    for (const [path, message] of fieldErrors) {
      setError(path as FieldPath<AboutInput>, { type: "server", message });
    }
    toast.error(result.error);
    if (fieldErrors.length) focusFirstInvalid(formId);
  }

  function onInvalid() {
    toast.error("Periksa lagi isian yang ditandai.");
    focusFirstInvalid(formId);
  }

  function discardChanges() {
    reset();
    setConfirmDiscard(false);
    toast("Perubahan dibatalkan");
  }

  return (
    <FormProvider {...form}>
      <AdminPageHeader
        description="Isi halaman Tentang kami: pembuka, cerita VIDALIDAY, alasan memilih, dan penutup. Perubahan tampil di situs setelah disimpan."
        actions={
          <Button asChild variant="secondary">
            <a href="/about" target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" />
              Lihat halaman
            </a>
          </Button>
        }
      />

      <form
        id={formId}
        onSubmit={handleSubmit(onValid, onInvalid)}
        noValidate
        aria-busy={isSubmitting || undefined}
        aria-label="Halaman About"
        className="[&_input]:scroll-mb-40 [&_textarea]:scroll-mb-40"
      >
        <SectionNav sections={navSections} label="Bagian halaman About" />

        <div className="grid gap-5">
          <FormCard
            id="pembuka"
            title="Pembuka"
            description="Bagian paling atas halaman About."
            className={SECTION_CLASS}
          >
            <Field
              label="Tagline"
              required
              error={errors.tagline?.message}
              hint="Contoh: Your Comfort, Our Priority"
              aside={<CharCount value={tagline} max={ABOUT_MAX.tagline} />}
            >
              <Input {...register("tagline")} autoComplete="off" maxLength={ABOUT_MAX.tagline} />
            </Field>

            <Field
              label="Judul halaman"
              required
              error={errors.heroTitle?.message}
              aside={<CharCount value={heroTitle} max={ABOUT_MAX.heroTitle} />}
            >
              <Textarea {...register("heroTitle")} rows={2} maxLength={ABOUT_MAX.heroTitle} />
            </Field>
          </FormCard>

          <FormCard
            id="cerita"
            title="Cerita VIDALIDAY"
            description="Tiga paragraf narasi. Paragraf 1 tampil lebih tebal."
            className={SECTION_CLASS}
          >
            <Field
              label="Paragraf 1"
              required
              error={errors.introP1?.message}
              hint="Legalitas dan naungan PT."
              aside={<CharCount value={introP1} max={ABOUT_MAX.introP1} />}
            >
              <Textarea {...register("introP1")} rows={4} maxLength={ABOUT_MAX.introP1} />
            </Field>
            <Field
              label="Paragraf 2"
              error={errors.introP2?.message}
              hint="Pilihan unit apartemen dan layanan."
              aside={<CharCount value={introP2} max={ABOUT_MAX.introP2} />}
            >
              <Textarea {...register("introP2")} rows={4} maxLength={ABOUT_MAX.introP2} />
            </Field>
            <Field
              label="Paragraf 3"
              error={errors.introP3?.message}
              hint="Standar kebersihan dan kenyamanan."
              aside={<CharCount value={introP3} max={ABOUT_MAX.introP3} />}
            >
              <Textarea {...register("introP3")} rows={4} maxLength={ABOUT_MAX.introP3} />
            </Field>
          </FormCard>

          <ReasonsEditor className={SECTION_CLASS} />

          <FormCard
            id="penutup"
            title="Komitmen & penutup"
            description="Bagian bawah halaman About, sebelum tombol WhatsApp."
            columns={2}
            className={SECTION_CLASS}
          >
            <Field
              label="Judul komitmen"
              required
              error={errors.commitTitle?.message}
              aside={<CharCount value={commitTitle} max={ABOUT_MAX.commitTitle} />}
            >
              <Input {...register("commitTitle")} autoComplete="off" maxLength={ABOUT_MAX.commitTitle} />
            </Field>
            <Field
              label="Teks komitmen"
              required
              error={errors.commitText?.message}
              className="md:col-span-2"
              aside={<CharCount value={commitText} max={ABOUT_MAX.commitText} />}
            >
              <Textarea {...register("commitText")} rows={4} maxLength={ABOUT_MAX.commitText} />
            </Field>
            <Field
              label="Kutipan penutup"
              error={errors.closingQuote?.message}
              hint="Slogan singkat, mis. menginap nyaman, harga bersahabat."
              className="md:col-span-2"
              aside={<CharCount value={closingQuote} max={ABOUT_MAX.closingQuote} />}
            >
              <Input {...register("closingQuote")} autoComplete="off" maxLength={ABOUT_MAX.closingQuote} />
            </Field>
            <Field
              label="Ajakan penutup"
              error={errors.closingCta?.message}
              hint="Kalimat ajakan sebelum tombol, mis. temukan unit favoritmu."
              className="md:col-span-2"
              aside={<CharCount value={closingCta} max={ABOUT_MAX.closingCta} />}
            >
              <Textarea {...register("closingCta")} rows={2} maxLength={ABOUT_MAX.closingCta} />
            </Field>
          </FormCard>
        </div>

        <StickyActionBar status={<SaveStatus dirtyCount={dirtyList.length} savedAt={savedAt} />}>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              className="h-12 sm:h-11"
              disabled={!isDirty || isSubmitting}
              onClick={() => setConfirmDiscard(true)}
            >
              <Undo2 aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Batalkan perubahan</span>
            </Button>
            <Button type="submit" loading={isSubmitting} className="h-12 flex-1 sm:h-11 sm:flex-none">
              Simpan perubahan
            </Button>
          </div>
        </StickyActionBar>
      </form>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Buang perubahan yang belum disimpan?"
        description="Semua isian halaman About kembali ke nilai yang terakhir disimpan."
        confirmLabel="Buang perubahan"
        cancelLabel="Lanjut mengedit"
        destructive
        onConfirm={discardChanges}
      />
    </FormProvider>
  );
}
