import { cn } from "@/lib/utils";

/**
 * Bar aksi yang menempel di bawah form admin (PRD 7.4): Simpan (primary), Batal, Lihat di situs.
 * Letakkan sebagai elemen terakhir di dalam <form>.
 */
export function StickyActionBar({
  children,
  status,
  className,
}: {
  children: React.ReactNode;
  /** Teks kecil di kiri, mis. "Ada perubahan yang belum disimpan". */
  status?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-4 mt-6 flex flex-col gap-3 border-t border-line bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:-mx-8 lg:px-8",
        className,
      )}
    >
      <div className="min-h-5 text-sm text-muted" aria-live="polite">
        {status}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">{children}</div>
    </div>
  );
}
