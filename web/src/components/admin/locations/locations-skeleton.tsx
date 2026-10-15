import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka daftar apartemen selama data dimuat. */
export function LocationsListSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Memuat apartemen" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-11 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="glass-card overflow-hidden rounded-card">
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="grid gap-3 p-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center justify-between border-t border-line pt-3">
                <div className="flex gap-1">
                  <Skeleton className="size-11" />
                  <Skeleton className="size-11" />
                </div>
                <Skeleton className="h-11 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Kerangka halaman ubah apartemen. */
export function LocationEditSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Memuat apartemen" className="grid gap-5">
      <div className="grid gap-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {[6, 4, 2].map((fields, card) => (
        <div key={card} className="glass-card grid gap-5 rounded-card p-5 sm:p-6">
          <div className="grid gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: fields }, (_, index) => (
              <div key={index} className="grid gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
