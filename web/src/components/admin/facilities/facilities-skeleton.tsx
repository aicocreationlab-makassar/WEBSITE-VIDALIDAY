import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka daftar fasilitas gedung selama data dimuat (toolbar + dua grup apartemen). */
export function FacilitiesSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Memuat fasilitas gedung" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-5 w-full max-w-md" />
        <Skeleton className="h-11 w-44" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-12 w-full sm:max-w-md" />
        <Skeleton className="h-12 w-full sm:w-60" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-11 w-24 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
      </div>
      {[4, 3].map((count, group) => (
        <div key={group} className="glass-card rounded-card">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="divide-y divide-line">
            {Array.from({ length: count }, (_, index) => (
              <div key={index} className="flex min-h-16 items-center gap-3 px-4 py-3 md:py-2">
                <Skeleton className="aspect-[4/3] w-20 shrink-0 md:w-16" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="hidden h-5 w-9 rounded-full md:block" />
                <Skeleton className="hidden h-9 w-20 md:block" />
                <Skeleton className="size-9" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
