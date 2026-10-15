import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka halaman FAQ selama data dimuat. */
export default function FaqsLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Memuat FAQ" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-5 w-full max-w-md" />
        <Skeleton className="h-11 w-48" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full sm:max-w-md" />
      <div className="flex gap-2">
        <Skeleton className="h-11 w-24 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
      </div>
      <div className="glass-card divide-y divide-line rounded-card">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex min-h-16 items-center gap-3 px-4 py-3">
            <Skeleton className="size-11 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="hidden h-9 w-20 md:block" />
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="size-9" />
          </div>
        ))}
      </div>
    </div>
  );
}
