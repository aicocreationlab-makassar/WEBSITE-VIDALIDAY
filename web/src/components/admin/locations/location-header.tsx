import Link from "next/link";
import { ChevronLeft, Circle, CircleAlert, CircleCheck, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  locationVisibility,
  roomTypeCountLabel,
  unitCountLabel,
  visibilityNote,
  type AdminLocationDetail,
} from "./location-model";

/** Kepala halaman ubah apartemen: kembali ke daftar, nama, status tersimpan, jumlah unit/tipe. */
export function LocationHeader({ detail }: { detail: AdminLocationDetail }) {
  const visibility = locationVisibility(detail.isActive, detail.publishedUnitCount);
  const VisibilityIcon = visibility === "tampil" ? CircleCheck : visibility === "tanpa-unit" ? CircleAlert : EyeOff;
  return (
    <div className="mb-5 grid gap-2">
      <Link
        href="/admin/locations"
        className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-control px-2 text-sm font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Semua apartemen
      </Link>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="text-h2 font-bold text-ink">{detail.name}</h2>
        {detail.isActive ? <Badge variant="success">Aktif</Badge> : <Badge variant="neutral">Nonaktif</Badge>}
        <span className="text-sm text-muted">
          {unitCountLabel(detail.unitCount)} · {roomTypeCountLabel(detail.roomTypes.length)}
        </span>
      </div>
      <p
        className={cn(
          "flex items-start gap-1.5 text-sm",
          visibility === "tampil" ? "text-success" : visibility === "tanpa-unit" ? "text-[#b45309]" : "text-muted",
        )}
      >
        <VisibilityIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {visibilityNote(visibility)}
      </p>
      {visibility !== "tampil" ? <SetupSteps detail={detail} /> : null}
    </div>
  );
}

/** Langkah supaya apartemen (baru) tampil di situs: tipe kamar, unit tampil, aktif. */
function SetupSteps({ detail }: { detail: AdminLocationDetail }) {
  const steps = [
    { label: "Isi tipe kamar", done: detail.roomTypes.length > 0, href: "#tipe-kamar" },
    {
      label: "Tambah minimal satu unit yang tampil",
      done: detail.publishedUnitCount > 0,
      href: `/admin/units/new?lokasi=${detail.id}`,
    },
    { label: "Aktifkan apartemen lalu simpan", done: detail.isActive, href: "#info-apartemen" },
  ];
  return (
    <section aria-labelledby="langkah-tampil" className="glass-card mt-2 rounded-card p-4 sm:p-5">
      <h3 id="langkah-tampil" className="text-sm font-bold text-ink">
        Supaya tampil di situs
      </h3>
      <ol className="mt-2 grid gap-1 sm:grid-cols-3 sm:gap-3">
        {steps.map((step, index) => (
          <li key={step.label} className="flex min-h-11 items-center gap-2 text-sm">
            {step.done ? (
              <CircleCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <Circle className="size-5 shrink-0 text-subtle" aria-hidden="true" />
            )}
            <span className="sr-only">{step.done ? "Selesai: " : `Langkah ${index + 1}: `}</span>
            {step.done ? (
              <span className="text-muted line-through decoration-line">{step.label}</span>
            ) : (
              <Link href={step.href} className="font-semibold text-brand-700 underline-offset-2 hover:underline">
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Apartemen tidak ada (id salah atau baru dihapus). */
export function LocationMissing() {
  return (
    <section className="glass-card rounded-card p-6">
      <h2 className="text-card font-bold text-ink">Apartemen tidak ditemukan</h2>
      <p className="mt-1 text-sm text-muted">Mungkin sudah dihapus. Kembali ke daftar untuk memilih apartemen lain.</p>
      <Link
        href="/admin/locations"
        className="mt-4 inline-flex h-11 items-center gap-1 rounded-control border-[1.5px] border-line bg-white px-4 text-[15px] font-semibold text-ink hover:bg-surface-2"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Semua apartemen
      </Link>
    </section>
  );
}
