import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka 4 kartu angka selama data dimuat. */
export function DashboardStatsSkeleton() {
  return (
    <div role="status" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-busy="true" aria-label="Memuat ringkasan">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="glass-card flex min-h-32 flex-col rounded-card p-4 sm:p-5">
          <Skeleton className="size-10" />
          <Skeleton className="mt-3 h-4 w-24" />
          <Skeleton className="mt-2 h-8 w-14" />
          <Skeleton className="mt-auto h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Kerangka kartu daftar (permintaan terbaru / paling diminati). */
export function DashboardListSkeleton({ title, rows = 5 }: { title: string; rows?: number }) {
  return (
    <section className="glass-card rounded-card p-4 sm:p-6" aria-busy="true" aria-label={`Memuat ${title.toLowerCase()}`}>
      <h2 className="mb-3 text-base font-bold text-ink">{title}</h2>
      <div className="space-y-4">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
