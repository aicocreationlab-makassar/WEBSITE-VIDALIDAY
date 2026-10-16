"use client";

import { useController, useWatch } from "react-hook-form";
import { BadgePercent, ChevronRight, ExternalLink, Globe } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Field } from "@/components/admin/kit/field";
import { FormCard } from "@/components/admin/kit/form-card";
import { SingleImageUploader } from "@/components/admin/kit/photo-uploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSiteUrl } from "@/lib/env";
import { cn } from "@/lib/utils";
import { waLink } from "@/lib/whatsapp";
import { CharCount, FieldAside, HintWithSuggestion, useSettingsFormContext } from "./form-bits";
import {
  SEO_DESCRIPTION_SOFT,
  SEO_TITLE_SOFT,
  SETTINGS_LABELS,
  SETTINGS_MAX,
  SETTINGS_SECTIONS,
  countFilledLines,
  isSettingsUploadPath,
  legalNameSuggestion,
  normalizedWhatsapp,
  officeHoursSuggestion,
  sameImage,
  type SettingsField,
  type SettingsSectionId,
} from "./settings-model";
import { TemplateEditor } from "./template-editor";

export type CardProps = {
  /** Disembunyikan oleh pencarian (tetap terpasang supaya isian dan validasi tidak hilang). */
  hidden: boolean;
  /** Field masih memakai nilai bawaan dan belum diubah. */
  isDefault: (field: SettingsField) => boolean;
};

type ImageCardProps = CardProps & {
  /** Nilai foto yang tersimpan (unggahan lain dicatat untuk dibuang kalau tidak dipakai). */
  saved: string | null;
  onUpload: (path: string) => void;
  /** Status unggahan (true = sedang mengunggah) untuk mengunci tombol Simpan. */
  onUploadingChange?: (uploading: boolean) => void;
};

function sectionCard(id: SettingsSectionId, hidden: boolean) {
  const section = SETTINGS_SECTIONS.find((s) => s.id === id);
  return {
    id,
    title: section?.title ?? id,
    description: section?.description,
    className: cn("scroll-mt-36", hidden && "hidden"),
  };
}

const LABEL = SETTINGS_LABELS;

// ---------------------------------------------------------------------------
// Kontak
// ---------------------------------------------------------------------------

export function ContactCard({ hidden, isDefault }: CardProps) {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useSettingsFormContext();
  const [whatsapp, phone, officeHours] = useWatch({ control, name: ["whatsappNumber", "contactPhone", "officeHours"] });
  const normalized = normalizedWhatsapp(whatsapp);
  const hoursSuggestion = officeHoursSuggestion(officeHours);

  return (
    <FormCard {...sectionCard("kontak", hidden)} columns={2}>
      <Field
        label={LABEL.whatsappNumber}
        required
        error={errors.whatsappNumber?.message}
        aside={<FieldAside isDefault={isDefault("whatsappNumber")} />}
        hint={
          <span className="flex flex-col items-start">
            <span>Nomor tujuan semua tombol WhatsApp. Contoh 0857 1169 6970.</span>
            {normalized ? (
              <span className="flex flex-wrap items-center gap-x-2">
                <span>
                  Disimpan sebagai <span className="font-semibold text-ink-2 tabular-nums">{normalized}</span>.
                </span>
                <a
                  href={waLink(normalized)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  Tes buka chat
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </span>
            ) : null}
          </span>
        }
      >
        <Input
          {...register("whatsappNumber")}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          maxLength={30}
          placeholder="0857 1169 6970"
        />
      </Field>

      <Field
        label={LABEL.contactPhone}
        error={errors.contactPhone?.message}
        hint="Tampil di footer. Tulis seperti ingin ditampilkan, mis. +62 857-1169-6970."
        aside={<FieldAside isDefault={isDefault("contactPhone")} count={<CharCount value={phone} max={SETTINGS_MAX.contactPhone} />} />}
      >
        <Input {...register("contactPhone")} type="tel" inputMode="tel" autoComplete="off" maxLength={SETTINGS_MAX.contactPhone} />
      </Field>

      <Field
        label={LABEL.contactEmail}
        error={errors.contactEmail?.message}
        hint="Tampil di footer dan halaman kebijakan privasi."
        aside={<FieldAside isDefault={isDefault("contactEmail")} />}
      >
        <Input
          {...register("contactEmail")}
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={SETTINGS_MAX.contactEmail}
          placeholder="info@vidaliday.com"
        />
      </Field>

      <Field
        label={LABEL.officeHours}
        error={errors.officeHours?.message}
        aside={<FieldAside isDefault={isDefault("officeHours")} />}
        hint={
          <HintWithSuggestion
            hint="Tulis jamnya saja, contoh 08.00–23.00 WITA"
            suggestion={hoursSuggestion ? `Rapikan jadi ${hoursSuggestion}` : null}
            onApply={() =>
              hoursSuggestion && setValue("officeHours", hoursSuggestion, { shouldDirty: true, shouldValidate: true })
            }
          />
        }
      >
        <Input {...register("officeHours")} autoComplete="off" maxLength={SETTINGS_MAX.officeHours} placeholder="08.00–23.00 WITA" />
      </Field>
    </FormCard>
  );
}

// ---------------------------------------------------------------------------
// Beranda
// ---------------------------------------------------------------------------

export function HomeCard({ hidden, isDefault, saved, onUpload, onUploadingChange }: ImageCardProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useSettingsFormContext();
  const heroField = useController({ control, name: "heroImage" });
  const [title, subtitle, banner] = useWatch({ control, name: ["heroTitle", "heroSubtitle", "promoBannerText"] });
  const bannerText = (banner ?? "").trim();

  return (
    <FormCard {...sectionCard("beranda", hidden)} columns={2}>
      <Field
        label={LABEL.heroTitle}
        required
        error={errors.heroTitle?.message}
        className="md:col-span-2"
        aside={<FieldAside isDefault={isDefault("heroTitle")} count={<CharCount value={title} max={SETTINGS_MAX.heroTitle} />} />}
      >
        <Input {...register("heroTitle")} autoComplete="off" maxLength={SETTINGS_MAX.heroTitle} />
      </Field>

      <Field
        label={LABEL.heroSubtitle}
        error={errors.heroSubtitle?.message}
        className="md:col-span-2"
        aside={
          <FieldAside isDefault={isDefault("heroSubtitle")} count={<CharCount value={subtitle} max={SETTINGS_MAX.heroSubtitle} />} />
        }
      >
        <Textarea {...register("heroSubtitle")} rows={2} maxLength={SETTINGS_MAX.heroSubtitle} />
      </Field>

      <Field
        label={LABEL.heroImage}
        error={errors.heroImage?.message}
        hint="Pakai foto gedung minimal 1920px lebar."
        className="max-w-3xl md:col-span-2"
      >
        <SingleImageUploader
          value={heroField.field.value ?? null}
          onChange={(next) => {
            if (isSettingsUploadPath(next) && !sameImage(next, saved)) onUpload(next);
            heroField.field.onChange(next);
          }}
          folder="settings"
          aspect="wide"
          fallbackLabel="Situs memakai foto gedung bawaan"
          onUploadingChange={onUploadingChange}
        />
      </Field>

      <div className="grid gap-3 md:col-span-2">
        <Field
          label={LABEL.promoBannerText}
          error={errors.promoBannerText?.message}
          hint="Kosongkan untuk menyembunyikan. Tampil satu baris di atas header."
          aside={<CharCount value={banner} max={SETTINGS_MAX.promoBannerText} />}
        >
          <Input
            {...register("promoBannerText")}
            autoComplete="off"
            maxLength={SETTINGS_MAX.promoBannerText}
            placeholder="mis. Promo akhir pekan: hemat sampai 20%"
          />
        </Field>
        {bannerText ? (
          <div aria-hidden="true" className="grid gap-1.5">
            <p className="text-caption text-muted">Pratinjau pengumuman</p>
            <div className="flex h-9 items-center gap-2 rounded-control border border-brand-200 bg-brand-50 px-3 text-caption font-semibold text-brand-700">
              <BadgePercent className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{bannerText}</span>
              <ChevronRight className="size-4 shrink-0" />
            </div>
          </div>
        ) : null}
      </div>
    </FormCard>
  );
}

// ---------------------------------------------------------------------------
// Pemesanan
// ---------------------------------------------------------------------------

export function BookingCard({ hidden, isDefault }: CardProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useSettingsFormContext();
  const [requirements, rules] = useWatch({ control, name: ["checkinRequirements", "houseRules"] });
  const ruleCount = countFilledLines(rules);

  return (
    <FormCard {...sectionCard("pemesanan", hidden)}>
      <TemplateEditor isDefault={isDefault("bookingWhatsappTemplate")} />

      <div className="grid gap-5 border-t border-line pt-5 md:grid-cols-2">
        <Field
          label={LABEL.checkinTime}
          error={errors.checkinTime?.message}
          hint="mis. 14.00 WITA"
          aside={<FieldAside isDefault={isDefault("checkinTime")} />}
        >
          <Input {...register("checkinTime")} autoComplete="off" maxLength={SETTINGS_MAX.checkinTime} />
        </Field>

        <Field
          label={LABEL.checkoutTime}
          error={errors.checkoutTime?.message}
          hint="mis. 12.00 WITA"
          aside={<FieldAside isDefault={isDefault("checkoutTime")} />}
        >
          <Input {...register("checkoutTime")} autoComplete="off" maxLength={SETTINGS_MAX.checkoutTime} />
        </Field>

        <Field
          label={LABEL.checkinRequirements}
          error={errors.checkinRequirements?.message}
          hint="Tampil di halaman unit, bagian aturan menginap."
          className="md:col-span-2"
          aside={
            <FieldAside
              isDefault={isDefault("checkinRequirements")}
              count={<CharCount value={requirements} max={SETTINGS_MAX.checkinRequirements} />}
            />
          }
        >
          <Textarea {...register("checkinRequirements")} rows={2} maxLength={SETTINGS_MAX.checkinRequirements} />
        </Field>

        <Field
          label={LABEL.houseRules}
          error={errors.houseRules?.message}
          hint="Satu peraturan per baris."
          className="md:col-span-2"
          aside={
            <FieldAside
              isDefault={isDefault("houseRules")}
              count={<span className="tabular-nums">{ruleCount} peraturan</span>}
            />
          }
        >
          <Textarea {...register("houseRules")} rows={7} maxLength={SETTINGS_MAX.houseRules} />
        </Field>
      </div>
    </FormCard>
  );
}

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

export function BrandCard({ hidden, isDefault, saved, onUpload, onUploadingChange }: ImageCardProps) {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useSettingsFormContext();
  const logoField = useController({ control, name: "siteLogo" });
  const legalName = useWatch({ control, name: "companyLegalName" });
  const nameSuggestion = legalNameSuggestion(legalName);

  return (
    <FormCard {...sectionCard("brand", hidden)} columns={2}>
      <div className="grid content-start gap-3">
        <Field
          label={LABEL.siteLogo}
          error={errors.siteLogo?.message}
          hint="Pakai gambar persegi minimal 512px. Tampil bulat di header, footer, dan halaman About."
        >
          <SingleImageUploader
            value={logoField.field.value ?? null}
            onChange={(next) => {
              if (isSettingsUploadPath(next) && !sameImage(next, saved)) onUpload(next);
              logoField.field.onChange(next);
            }}
            folder="settings"
            aspect="square"
            fallbackLabel="Situs memakai logo bawaan"
            onUploadingChange={onUploadingChange}
          />
        </Field>
        <div className="grid gap-1.5">
          <p className="text-caption text-muted">Pratinjau di header</p>
          <div className="flex min-h-16 items-center rounded-control border border-line bg-white px-3">
            <Logo logo={logoField.field.value ?? null} href={null} size="sm" eager={false} />
          </div>
        </div>
      </div>

      <Field
        label={LABEL.companyLegalName}
        required
        error={errors.companyLegalName?.message}
        aside={
          <FieldAside
            isDefault={isDefault("companyLegalName")}
            count={<CharCount value={legalName} max={SETTINGS_MAX.companyLegalName} />}
          />
        }
        hint={
          <HintWithSuggestion
            hint="Tulis huruf besar-kecil biasa, mis. PT Perdana Mega Trans"
            suggestion={nameSuggestion ? `Ubah jadi ${nameSuggestion}` : null}
            onApply={() =>
              nameSuggestion && setValue("companyLegalName", nameSuggestion, { shouldDirty: true, shouldValidate: true })
            }
          />
        }
      >
        <Input {...register("companyLegalName")} autoComplete="organization" maxLength={SETTINGS_MAX.companyLegalName} />
      </Field>
    </FormCard>
  );
}

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

export function SeoCard({ hidden, isDefault }: CardProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useSettingsFormContext();
  const [title, description] = useWatch({ control, name: ["seoTitle", "seoDescription"] });
  const titleLength = (title ?? "").trim().length;
  const descriptionLength = (description ?? "").trim().length;

  return (
    <FormCard {...sectionCard("seo", hidden)} columns={2}>
      <div className="grid content-start gap-5">
        <Field
          label={LABEL.seoTitle}
          required
          error={errors.seoTitle?.message}
          hint={
            titleLength > SEO_TITLE_SOFT
              ? `Lebih dari ${SEO_TITLE_SOFT} karakter bisa terpotong di Google.`
              : "Judul tab browser dan judul di hasil Google untuk beranda."
          }
          aside={<FieldAside isDefault={isDefault("seoTitle")} count={<CharCount value={title} max={SETTINGS_MAX.seoTitle} />} />}
        >
          <Input {...register("seoTitle")} autoComplete="off" maxLength={SETTINGS_MAX.seoTitle} />
        </Field>

        <Field
          label={LABEL.seoDescription}
          required
          error={errors.seoDescription?.message}
          hint={
            descriptionLength > SEO_DESCRIPTION_SOFT
              ? `Lebih dari ${SEO_DESCRIPTION_SOFT} karakter bisa terpotong di Google.`
              : "Satu sampai dua kalimat tentang VIDALIDAY. Juga tampil saat link situs dibagikan."
          }
          aside={
            <FieldAside
              isDefault={isDefault("seoDescription")}
              count={<CharCount value={description} max={SETTINGS_MAX.seoDescription} />}
            />
          }
        >
          <Textarea {...register("seoDescription")} rows={3} maxLength={SETTINGS_MAX.seoDescription} />
        </Field>
      </div>

      <SeoPreview title={title ?? ""} description={description ?? ""} />
    </FormCard>
  );
}

/** Perkiraan tampilan di hasil pencarian Google (judul satu baris, deskripsi dua baris). */
function SeoPreview({ title, description }: { title: string; description: string }) {
  const site = getSiteUrl();
  return (
    <div className="grid min-w-0 grid-cols-1 content-start gap-1.5">
      <p className="text-sm leading-5 font-semibold text-ink-2">Pratinjau di Google</p>
      <div className="max-w-[600px] rounded-card border border-line bg-white p-4" aria-hidden="true">
        <div className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2 ring-1 ring-line">
            <Globe className="size-4" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-sm text-ink">VIDALIDAY</span>
            <span className="block truncate text-caption text-ink-2">{site}</span>
          </span>
        </div>
        <p className="mt-2 truncate text-lg leading-6 text-[#1a0dab]">{title.trim() || "Judul SEO belum diisi"}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-[22px] text-ink-2">
          {description.trim() || "Deskripsi SEO belum diisi."}
        </p>
      </div>
    </div>
  );
}
