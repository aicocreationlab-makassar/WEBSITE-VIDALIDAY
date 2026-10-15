import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka daftar permintaan sewa selama data dimuat (toolbar, filter, chip status, 6 baris). */
export function LeadListSkeleton() {
  return (
    <div role="status">
      <div className="flex items-center gap-2">
        <Skeleton className="h-12 flex-1 lg:max-w-md" />
        <Skeleton className="size-12 lg:hidden" />
        <Skeleton className="h-12 w-12 sm:w-36 lg:ml-auto" />
      </div>
      <div className="mt-3 hidden gap-2 lg:flex">
        {[150, 190, 230, 200].map((width, index) => (
          <Skeleton key={index} className="h-11" style={{ width }} />
        ))}
      </div>
      <div className="mt-3 flex gap-2 overflow-hidden">
        {[96, 92, 128, 88, 92].map((width, index) => (
          <Skeleton key={index} className="h-11 shrink-0 rounded-full" style={{ width }} />
        ))}
      </div>
      <Skeleton className="mt-4 h-5 w-32" />
      <div className="mt-4 grid gap-3 xl:glass-card xl:gap-0 xl:rounded-card xl:p-0">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="glass-card grid gap-3 rounded-card p-4 xl:flex xl:h-16 xl:items-center xl:rounded-none xl:border-0 xl:border-b xl:border-line xl:px-4 xl:py-2 xl:shadow-none xl:last:border-b-0"
          >
            <div className="flex items-start justify-between gap-3 xl:contents">
              <Skeleton className="hidden h-8 w-24 xl:block" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-1/2 max-w-48" />
                <Skeleton className="h-3 w-2/5 max-w-40" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full xl:hidden" />
            </div>
            <div className="grid gap-2 xl:hidden">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
            <Skeleton className="hidden h-8 w-36 xl:block" />
            <Skeleton className="hidden h-8 w-28 xl:block" />
            <Skeleton className="hidden h-10 w-36 xl:block" />
            <Skeleton className="hidden h-8 w-28 xl:block" />
            <Skeleton className="h-12 w-full xl:size-11" />
          </div>
        ))}
      </div>
      <span className="sr-only">Memuat permintaan sewa</span>
    </div>
  );
}
