import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka daftar unit selama data dimuat (toolbar, chip, 6 baris). */
export function UnitListSkeleton() {
  return (
    <div role="status">
      <div className="flex items-center gap-2">
        <Skeleton className="h-12 flex-1 lg:max-w-md" />
        <Skeleton className="size-12 lg:hidden" />
        <Skeleton className="h-12 w-20 lg:ml-auto" />
      </div>
      <div className="mt-3 hidden gap-2 lg:flex">
        {[176, 150, 140, 190, 150, 190].map((width, index) => (
          <Skeleton key={index} className="h-11" style={{ width }} />
        ))}
      </div>
      <div className="mt-3 flex gap-2 overflow-hidden">
        {[92, 128, 96, 128, 84, 112].map((width, index) => (
          <Skeleton key={index} className="h-11 shrink-0 rounded-full" style={{ width }} />
        ))}
      </div>
      <Skeleton className="mt-4 h-5 w-32" />
      <div className="mt-4 grid gap-3 lg:glass-card lg:gap-0 lg:rounded-card lg:p-0">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="glass-card flex items-center gap-3 rounded-card p-3 lg:h-16 lg:rounded-none lg:border-0 lg:border-b lg:border-line lg:px-4 lg:py-2 lg:shadow-none lg:last:border-b-0"
          >
            <Skeleton className="size-[72px] shrink-0 lg:size-14" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-3/5 max-w-64" />
              <Skeleton className="h-3 w-2/5 max-w-48" />
              <Skeleton className="h-5 w-24 rounded-full lg:hidden" />
            </div>
            <Skeleton className="hidden h-8 w-24 lg:block" />
            <Skeleton className="hidden h-6 w-28 rounded-full lg:block" />
            <Skeleton className="size-11 shrink-0" />
          </div>
        ))}
      </div>
      <span className="sr-only">Memuat daftar unit</span>
    </div>
  );
}
