"use client";

import { useId, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SearchX, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/kit/confirm-dialog";
import { AdminPageHeader } from "@/components/admin/kit/form-card";
import { SearchInput } from "@/components/admin/kit/search-input";
import { StickyActionBar } from "@/components/admin/kit/sticky-action-bar";
import { useUnsavedGuard } from "@/components/admin/kit/use-unsaved-guard";
import { Button } from "@/components/ui/button";
import { discardSettingsUploads, saveSettings } from "@/lib/actions/admin/settings";
import { settingsSchema, type SettingsInput } from "@/lib/validation/admin";
import { focusFirstInvalid, SaveStatus, useUploadSession } from "./form-bits";
import { SectionNav } from "./section-nav";
import { BookingCard, BrandCard, ContactCard, HomeCard, SeoCard, SocialCard } from "./settings-cards";
import {
  SETTINGS_SECTIONS,
  adminIssueMessage,
  dirtyKeys,
  isSettingsField,
  matchSettingsSections,
  sectionStatus,
  truthyKeys,
  type SettingsData,
  type SettingsField,
  type SettingsFormValues,
} from "./settings-model";

const SAVE_FAILED = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";

type Props = {
  initial: SettingsFormValues;
  /** Field yang masih memakai nilai bawaan aplikasi (belum pernah diatur). */
  usingDefault: SettingsField[];
  /** Waktu simpan terakhir (updated_at terbaru). */
  savedAt: string | null;
};

/**
 * Form Pengaturan situs (PRD 7.9): Kontak, Beranda, Pemesanan (template WhatsApp + pratinjau),
 * Brand, SEO. Pencarian menyaring kartu; navigasi bagian menempel di bawah topbar; bar simpan
 * menempel di bawah. Hanya field yang berubah yang dikirim dan ditulis (kunci lain tidak disentuh).
 */
export function SettingsForm({ initial, usingDefault, savedAt }: Props) {
  const formId = useId();
  const [query, setQuery] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Simpan dikunci selama foto hero/logo masih diunggah.
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const uploads = useUploadSession(discardSettingsUploads);

  const form = useForm<SettingsInput, unknown, SettingsData>({
    resolver: zodResolver(settingsSchema, { error: adminIssueMessage }),
    defaultValues: initial,
    shouldFocusError: false,
  });
  const {
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors, dirtyFields, isDirty, isSubmitting },
  } = form;
  useUnsavedGuard(isDirty && !isSubmitting);

  const defaults = useMemo(() => new Set(usingDefault), [usingDefault]);
  const dirtyList = dirtyKeys(dirtyFields).filter(isSettingsField);
  const errorList = truthyKeys(errors);
  const isDefault = (field: SettingsField) => defaults.has(field) && !dirtyList.includes(field);

  const visibleIds = matchSettingsSections(query);
  const isHidden = (id: (typeof SETTINGS_SECTIONS)[number]["id"]) => !visibleIds.includes(id);
  const navSections = SETTINGS_SECTIONS.filter((section) => visibleIds.includes(section.id)).map((section) => ({
    id: section.id,
    title: section.title,
    status: sectionStatus(section.fields, errorList, dirtyList),
  }));

  function showErrors() {
    // Kartu yang tersaring pencarian ikut ditampilkan supaya error terlihat.
    setQuery("");
    focusFirstInvalid(formId);
  }

  async function onValid() {
    // Kirim nilai mentah form + daftar field yang berubah; server mem-parse ulang dengan skema yang sama.
    const values = getValues();
    const changed = [...dirtyList];
    if (!changed.length) {
      toast("Belum ada perubahan untuk disimpan");
      return;
    }

    let result: Awaited<ReturnType<typeof saveSettings>>;
    try {
      result = await saveSettings(values, changed);
    } catch {
      toast.error(SAVE_FAILED);
      return;
    }

    if (result.ok) {
      uploads.settle([values.heroImage, values.siteLogo]);
      toast.success(result.message ?? "Perubahan disimpan");
      // Halaman dimuat ulang oleh server (key berubah); sementara itu tandai form bersih.
      reset(values);
      return;
    }

    const fieldErrors = Object.entries(result.fieldErrors ?? {}).filter(([field]) => isSettingsField(field));
    for (const [field, message] of fieldErrors) setError(field as SettingsField, { type: "server", message });
    toast.error(result.error);
    if (fieldErrors.length) showErrors();
  }

  function onInvalid() {
    toast.error("Periksa lagi isian yang ditandai.");
    showErrors();
  }

  function discardChanges() {
    reset();
    const values = getValues();
    uploads.settle([values.heroImage, values.siteLogo]);
    setConfirmDiscard(false);
    toast("Perubahan dibatalkan");
  }

  return (
    <FormProvider {...form}>
      <AdminPageHeader
        description="Kontak, teks beranda, template pesan WhatsApp, logo, dan SEO. Perubahan langsung tampil di situs setelah disimpan."
        actions={
          <SearchInput
            value={query}
            onSearch={setQuery}
            label="Cari pengaturan"
            placeholder="Cari pengaturan, mis. logo"
            className="w-full sm:w-72"
          />
        }
      />

      <form
        id={formId}
        onSubmit={handleSubmit(onValid, onInvalid)}
        noValidate
        aria-busy={isSubmitting || undefined}
        aria-label="Pengaturan situs"
        // Isian yang difokus tidak tertutup bar aksi yang menempel di bawah.
        className="[&_input]:scroll-mb-40 [&_textarea]:scroll-mb-40"
      >
        <SectionNav sections={navSections} label="Bagian pengaturan" />
        <p className="sr-only" aria-live="polite">
          {query ? `${visibleIds.length} bagian cocok dengan pencarian ${query}` : ""}
        </p>

        {visibleIds.length === 0 ? (
          <div className="glass-card flex flex-col items-center gap-3 rounded-card px-5 py-10 text-center">
            <SearchX className="size-8 text-subtle" aria-hidden="true" />
            <div className="grid gap-1">
              <p className="font-semibold text-ink">Tidak ada pengaturan yang cocok dengan &ldquo;{query}&rdquo;.</p>
              <p className="text-sm text-muted">Coba kata lain, mis. WhatsApp, logo, check-in, atau Google.</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setQuery("")}>
              Hapus pencarian
            </Button>
          </div>
        ) : null}

        <div className="grid gap-5">
          <ContactCard hidden={isHidden("kontak")} isDefault={isDefault} />
          <HomeCard
            hidden={isHidden("beranda")}
            isDefault={isDefault}
            saved={initial.heroImage}
            onUpload={uploads.track}
            onUploadingChange={setUploadingHero}
          />
          <BookingCard hidden={isHidden("pemesanan")} isDefault={isDefault} />
          <BrandCard
            hidden={isHidden("brand")}
            isDefault={isDefault}
            saved={initial.siteLogo}
            onUpload={uploads.track}
            onUploadingChange={setUploadingLogo}
          />
          <SeoCard hidden={isHidden("seo")} isDefault={isDefault} />
          <SocialCard hidden={isHidden("sosial")} isDefault={isDefault} />
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
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={uploadingHero || uploadingLogo}
              className="h-12 flex-1 sm:h-11 sm:flex-none"
            >
              Simpan pengaturan
            </Button>
          </div>
        </StickyActionBar>
      </form>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Buang perubahan yang belum disimpan?"
        description="Semua isian kembali ke nilai yang terakhir disimpan. Foto yang baru diunggah ikut dibuang."
        confirmLabel="Buang perubahan"
        cancelLabel="Lanjut mengedit"
        destructive
        onConfirm={discardChanges}
      />
    </FormProvider>
  );
}
