"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { UnitStatusBadges } from "@/components/admin/kit/status-badge";
import { StickyActionBar } from "@/components/admin/kit/sticky-action-bar";
import { useUnsavedGuard } from "@/components/admin/kit/use-unsaved-guard";
import { Button } from "@/components/ui/button";
import { createUnit, updateUnit } from "@/lib/actions/admin/units-form";
import type { AdminAmenityOption, AdminLocationOption, AdminUnitEdit } from "@/lib/data/admin/units";
import { formatDateTime } from "@/lib/format";
import { unitSchema, type UnitData, type UnitInput } from "@/lib/validation/admin";
import { AmenitiesSection } from "./amenities-section";
import { DescriptionSection, StatusSection } from "./details-sections";
import { HealthNotice } from "./health-notice";
import { InfoSection } from "./info-section";
import { MediaSection } from "./media-section";
import { PreviewCard } from "./preview-card";
import { PriceSection } from "./price-section";
import {
  findLocation,
  findRoomType,
  formFieldErrors,
  formHealthFlags,
  newUnitDefaults,
  type UnitFormMode,
  type UnitFormValues,
} from "./unit-form-model";

type UnitFormProps = {
  mode: UnitFormMode;
  lookups: { locations: AdminLocationOption[]; amenities: AdminAmenityOption[] };
  /** Data unit tersimpan (form ubah); null untuk unit baru. */
  initial: AdminUnitEdit | null;
  /** Label promo lama > 24 karakter yang tidak ditampilkan. */
  legacyBadge?: string | null;
  /** Kolom lama rental_period apa adanya (mis. "Bulan"); unit disimpan sebagai per malam. */
  rentalPeriod?: string | null;
  /** Apartemen terpilih untuk unit baru (?lokasi=). */
  presetLocationId?: number | null;
};

const SAVE_FAILED = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";

/** Pindah ke isian pertama yang bermasalah (di tengah layar, tidak tertutup bar aksi). */
function focusFirstInvalid(formId: string) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const form = document.getElementById(formId);
      const target = form?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
      if (!target) return;
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
      target.focus({ preventScroll: true });
    }),
  );
}

/**
 * Form tambah/ubah unit (PRD 7.4): kartu Info dasar, Harga, Fasilitas kamar, Foto & video, Deskripsi,
 * Status; bar aksi menempel di bawah; peringatan perubahan belum disimpan. Validasi zod yang sama
 * dengan Server Action; error dari server dipasang ke isiannya.
 */
export function UnitForm({ mode, lookups, initial, legacyBadge = null, rentalPeriod = null, presetLocationId = null }: UnitFormProps) {
  const router = useRouter();
  const formId = useId();
  const [leaving, setLeaving] = useState(false);
  // Simpan dikunci selama foto masih diunggah, supaya foto tidak hilang dan file tidak yatim di Storage.
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [defaults] = useState<UnitFormValues>(
    () => initial?.values ?? newUnitDefaults(lookups.locations, presetLocationId),
  );
  const [initialFlags] = useState(() => {
    if (mode !== "edit" || !initial) return [];
    const type = findRoomType(findLocation(lookups.locations, defaults.locationId), defaults.roomTypeId);
    return formHealthFlags(
      { ...defaults, isPromoActive: Boolean(defaults.isPromoActive) },
      {
        typeDefaultGuests: type?.defaultMaxGuests ?? null,
        promoBadge: legacyBadge ?? defaults.promoBadge ?? null,
        rentalPeriod,
      },
    );
  });

  const form = useForm<UnitInput, unknown, UnitData>({
    resolver: zodResolver(unitSchema),
    defaultValues: defaults,
    shouldFocusError: false,
  });
  const {
    handleSubmit,
    setError,
    reset,
    getValues,
    formState: { isDirty, isSubmitting },
  } = form;
  const busy = isSubmitting || leaving;
  useUnsavedGuard(isDirty && !busy);

  const isEdit = mode === "edit" && initial !== null;

  async function onValid() {
    // Kirim nilai mentah form: server mem-parse ulang dengan skema yang sama.
    const values = getValues();
    let result: Awaited<ReturnType<typeof createUnit>>;
    try {
      result = isEdit ? await updateUnit(initial.id, values) : await createUnit(values);
    } catch {
      toast.error(SAVE_FAILED);
      return;
    }

    if (result.ok) {
      toast.success("Perubahan disimpan");
      if (!isEdit && result.data) {
        setLeaving(true);
        router.replace(`/admin/units/${result.data.id}`);
        return;
      }
      // Halaman dimuat ulang oleh server (key berubah); sementara itu tandai form bersih.
      reset(values);
      return;
    }

    const fieldErrors = formFieldErrors(result.fieldErrors);
    for (const [field, message] of fieldErrors) setError(field, { type: "server", message });
    toast.error(result.error);
    if (fieldErrors.length) focusFirstInvalid(formId);
  }

  function onInvalid(errors: FieldErrors<UnitInput>) {
    if (Object.keys(errors).length) toast.error("Periksa lagi isian yang ditandai.");
    focusFirstInvalid(formId);
  }

  const status = uploadingPhotos ? (
    <span className="font-medium text-ink-2">Menunggu unggahan foto selesai…</span>
  ) : isDirty ? (
    <span className="inline-flex items-center gap-2 font-medium text-ink-2">
      <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
      Ada perubahan yang belum disimpan
    </span>
  ) : isEdit ? (
    `Tersimpan ${formatDateTime(initial.updatedAt)}`
  ) : (
    "Kolom bertanda * wajib diisi."
  );

  return (
    <FormProvider {...form}>
      <form
        id={formId}
        onSubmit={handleSubmit(onValid, onInvalid)}
        noValidate
        aria-busy={busy || undefined}
        aria-label={isEdit ? `Ubah unit ${initial.values.name}` : "Tambah unit"}
        // Isian yang difokus tidak tertutup bar aksi yang menempel di bawah.
        className="[&_input]:scroll-mb-40 [&_select]:scroll-mb-40 [&_textarea]:scroll-mb-40"
      >
        <div className="mb-5 grid gap-3">
          <Link
            href="/admin/units"
            className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Daftar unit
          </Link>
          {isEdit ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="min-w-0 text-xl leading-7 font-extrabold break-words text-ink">{initial.values.name}</h2>
              <UnitStatusBadges
                isPublished={initial.isPublished}
                isAvailable={Boolean(initial.values.isAvailable)}
                isPromoActive={Boolean(initial.values.isPromoActive)}
                isFeatured={Boolean(initial.values.isFeatured)}
              />
            </div>
          ) : (
            <p className="max-w-2xl text-sm text-muted">
              Isi data unit, harga, dan foto. Unit langsung tampil di situs setelah disimpan kalau statusnya tampil.
            </p>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
          <div className="grid min-w-0 gap-5">
            {initialFlags.length ? <HealthNotice initialFlags={initialFlags} locations={lookups.locations} /> : null}
            <InfoSection
              mode={mode}
              locations={lookups.locations}
              savedSlug={initial?.slug ?? null}
              savedPublished={initial?.isPublished ?? false}
            />
            <PriceSection
              legacyBadge={legacyBadge}
              legacyPeriod={initialFlags.includes("periode-bukan-harian") ? rentalPeriod : null}
            />
            <AmenitiesSection amenities={lookups.amenities} initialIds={defaults.amenityIds ?? []} />
            <MediaSection onUploadingChange={setUploadingPhotos} />
            <DescriptionSection />
          </div>
          <div className="grid min-w-0 gap-5 xl:sticky xl:top-20">
            <div className="hidden xl:block">
              <PreviewCard locations={lookups.locations} />
            </div>
            <StatusSection locations={lookups.locations} />
          </div>
        </div>

        <StickyActionBar status={status}>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button asChild variant="secondary" className="h-12 sm:h-11">
              <Link href="/admin/units">Batal</Link>
            </Button>
            {isEdit && initial.isPublished ? (
              <Button asChild variant="quiet" className="h-12 px-3 sm:h-11">
                <a href={`/unit/${initial.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">Lihat di situs</span>
                </a>
              </Button>
            ) : null}
            <Button type="submit" loading={busy} disabled={uploadingPhotos} className="h-12 flex-1 sm:h-11 sm:flex-none">
              {isEdit ? "Simpan perubahan" : "Simpan unit"}
            </Button>
          </div>
        </StickyActionBar>
      </form>
    </FormProvider>
  );
}
